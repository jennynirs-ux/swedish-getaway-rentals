import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdmin, sendEmail, SUPPORT_EMAIL } from "./alert.ts";
import { escapeHtml } from "./auth.ts";

// Shared by handle-payment-success (guest redirect) and stripe-webhook, which
// can both fire for the same Checkout session, often at the same moment.

export interface ProcessResult {
  success: boolean;
  type: string;
  bookingId: string | null;
  message?: string;
}

// Nights already taken: another booking, a channel block (Airbnb...), a host block
async function datesTaken(supabase: SupabaseClient, propertyId: string, checkIn: string, checkOut: string) {
  const { data: blocked, error: blockedError } = await supabase
    .from('availability')
    .select('date')
    .eq('property_id', propertyId)
    .eq('available', false)
    .gte('date', checkIn)
    .lt('date', checkOut)
    .limit(1);
  const { data: overlap, error: overlapError } = await supabase.rpc('check_booking_conflict', {
    property_id_param: propertyId,
    check_in_param: checkIn,
    check_out_param: checkOut,
  });
  if (blockedError || overlapError) throw blockedError ?? overlapError;
  return (blocked?.length ?? 0) > 0 || overlap === true;
}

// processed_sessions.ip_address is inet: keep the first forwarded address, or null
export const clientIpFrom = (req: Request): string | null => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
  return ip && /^[0-9a-fA-F.:]+$/.test(ip) ? ip : null;
};

export async function processCheckoutSession(
  stripe: Stripe,
  supabase: SupabaseClient,
  sessionId: string,
  origin: { ip: string | null; userAgent: string },
): Promise<ProcessResult> {
  // Always read the session from Stripe - never trust the caller's data
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });

  if (session.payment_status !== 'paid') {
    console.error('Payment not completed:', session.payment_status);
    throw new Error("Payment not completed");
  }

  const sessionType = session.metadata?.type || 'unknown';

  // Claim the session first. The unique constraint on session_id makes this
  // atomic, so the webhook and the redirect can't both create a booking.
  const { data: claim, error: claimError } = await supabase
    .from('processed_sessions')
    .insert({
      session_id: sessionId,
      session_type: sessionType,
      ip_address: origin.ip,
      user_agent: origin.userAgent,
    })
    .select('id')
    .single();

  if (claimError) {
    if (claimError.code !== '23505') throw claimError;
    const { data: existing } = await supabase
      .from('processed_sessions')
      .select('session_type, created_record_id')
      .eq('session_id', sessionId)
      .single();
    console.log('Session already processed:', sessionId);
    if (existing?.session_type === 'booking_refunded_dates_taken') {
      return { success: false, type: 'booking', bookingId: null, message: 'dates_taken_refunded' };
    }
    return {
      success: true,
      type: existing?.session_type ?? sessionType,
      bookingId: existing?.created_record_id ?? null,
      message: 'Already processed',
    };
  }

  let result: ProcessResult = { success: true, type: 'unknown', bookingId: null };
  let recordId: string | null = null;

  try {
    if (session.metadata?.type === 'booking') {
      const metadata = session.metadata;
    
      // Verify the amount paid matches the booking amount (critical security check)
      const paidAmount = session.amount_total || 0;
      // metadata.totalAmount is already in öre (set by create-booking-payment-connect)
      const expectedAmount = parseInt(metadata.totalAmount);
    
      if (paidAmount !== expectedAmount) {
        console.error('Payment amount mismatch:', { paidAmount, expectedAmount });
        throw new Error('Payment amount verification failed');
      }

      // The dates were free when checkout opened, but it stays open for up to
      // 30 minutes: another guest or a channel booking may have taken them.
      // Refund in full rather than save a double booking.
      if (await datesTaken(supabase, metadata.propertyId, metadata.checkInDate, metadata.checkOutDate)) {
        const paymentIntentId = session.payment_intent as string;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            reason: 'duplicate',
            // A Connect host payout and the service fee go back too
            ...(paymentIntent.transfer_data ? { reverse_transfer: true, refund_application_fee: true } : {}),
          },
          { idempotencyKey: `dates-taken-refund-${sessionId}` },
        );
        await supabase
          .from('processed_sessions')
          .update({ session_type: 'booking_refunded_dates_taken' })
          .eq('id', claim.id);

        const stay = `${metadata.propertyTitle || 'the cabin'}, ${metadata.checkInDate} to ${metadata.checkOutDate}`;
        await sendEmail(
          metadata.guestEmail,
          'Your booking could not be completed – full refund issued',
          `<p>Hi ${escapeHtml(metadata.guestName)},</p>
           <p>We're sorry: the dates you paid for (${escapeHtml(stay)}) were booked by someone else while you were checking out.
           We have refunded your payment in full. It usually shows on your card within 5–10 business days.</p>
           <p>If you'd like other dates, just reply to this e-mail or write to ${SUPPORT_EMAIL}.</p>
           <p>Jenny &amp; Jon, Nordic Getaways</p>`,
        );
        await alertAdmin('Double booking prevented – guest refunded', [
          `Stay: ${stay}`,
          `Guest: ${metadata.guestName} <${metadata.guestEmail}>`,
          `Amount refunded: ${(paidAmount / 100).toLocaleString('sv-SE')} ${(metadata.currency || 'SEK').toUpperCase()}`,
          `Stripe session: ${sessionId}`,
        ]);
        return { success: false, type: 'booking', bookingId: null, message: 'dates_taken_refunded' };
      }
    
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          property_id: metadata.propertyId,
          user_id: metadata.userId || null,
          guest_name: metadata.guestName,
          guest_email: metadata.guestEmail,
          guest_phone: metadata.guestPhone || null,
          check_in_date: metadata.checkInDate,
          check_out_date: metadata.checkOutDate,
          number_of_guests: parseInt(metadata.numberOfGuests),
          special_requests: metadata.specialRequests || null,
          total_amount: parseInt(metadata.totalAmount),
          // Fee model A split (both in öre); older sessions carry no serviceFee
          service_fee: parseInt(metadata.serviceFee || "0"),
          host_amount: metadata.hostAmount ? parseInt(metadata.hostAmount) : null,
          rules_confirmed_at: metadata.rulesConfirmedAt || null,
          currency: metadata.currency?.toUpperCase() || 'SEK',
          status: 'confirmed',
          source: 'direct',
          stripe_payment_intent_id: session.payment_intent as string
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Count the coupon use so usage_limit holds; the booking stands regardless
      if (booking && metadata.couponId) {
        const { error: couponError } = await supabase.rpc('record_coupon_use', {
          _coupon_id: metadata.couponId,
          _booking_id: booking.id,
          _discount_amount: parseInt(metadata.discountAmount || '0'),
        });
        if (couponError) console.error('Failed to record coupon use:', couponError);
      }
    
      // Send notification emails
      if (booking) {
        result.bookingId = booking.id;
        recordId = booking.id;
      
        try {
          await supabase.functions.invoke('send-booking-notifications', {
            body: {
              bookingId: booking.id,
              propertyId: metadata.propertyId,
              propertyTitle: metadata.propertyTitle,
              guestName: metadata.guestName,
              guestEmail: metadata.guestEmail,
              guestPhone: metadata.guestPhone || null,
              numberOfGuests: parseInt(metadata.numberOfGuests),
              checkInDate: metadata.checkInDate,
              checkOutDate: metadata.checkOutDate,
              totalAmount: parseInt(metadata.totalAmount),
              currency: metadata.currency?.toUpperCase() || 'SEK',
              hostId: metadata.hostId,
            }
          });
        } catch (notificationError) {
          console.error('Failed to send notifications:', notificationError);
        }
      }
    
      result.type = 'booking';

    }
    // Shop checkouts run on the shop Stripe account: handle-shop-payment-success

  } catch (error) {
    // Release the claim so a later retry (e.g. Stripe re-sending the webhook) can succeed
    await supabase.from('processed_sessions').delete().eq('id', claim.id);
    throw error;
  }

  await supabase
    .from('processed_sessions')
    .update({ created_record_id: recordId })
    .eq('id', claim.id);

  return result;
}
