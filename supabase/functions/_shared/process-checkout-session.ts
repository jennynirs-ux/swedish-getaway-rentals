import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdmin, alertAdminOnce, sendEmail, SUPPORT_EMAIL } from "./alert.ts";
import { type GuestLang, guestLang } from "./guest-lang.ts";
import { longDate } from "./format.ts";
import { escapeHtml } from "./auth.ts";
import { hostShareAmount, initialHostPayout } from "./payout.ts";
import { MONEY_BOOKING_COLUMNS, type MoneyBooking, reconcileBookingMoney, reverseUnsavedPayment } from "./booking-money.ts";
import { isPolicyKey } from "./cancellation.ts";

// Shared by handle-payment-success (guest redirect), stripe-webhook and
// reconcile-payments, which can all fire for the same Checkout session, often
// at the same moment.

export interface ProcessResult {
  success: boolean;
  type: string;
  bookingId: string | null;
  // 'processing': another call is saving it right now (the webhook answers
  // non-2xx so Stripe retries); 'dates_taken_refunded'; 'refunded'
  message?: string;
}

// A claim this old with no booking belongs to a call that died midway (edge
// functions are stopped after a few minutes), so it may be taken over.
const STALE_CLAIM_MS = 10 * 60 * 1000;

const kr = (ore: number) => (ore / 100).toLocaleString('sv-SE');

// The e-mail to a guest whose dates were taken while they paid, in the
// language they booked in (metadata.guestLang). Sentences get escaped values.
// English keeps its ISO dates, as before.
const DATES_TAKEN_COPY: Record<GuestLang, {
  subject: string;
  stay: (title: string, checkIn: string, checkOut: string) => string;
  hi: (name: string) => string;
  sorry: (stay: string) => string;
  refunded: string;
  otherDates: (email: string) => string;
}> = {
  en: {
    subject: 'Your booking could not be completed – full refund issued',
    stay: (title, checkIn, checkOut) => `${title || 'the cabin'}, ${checkIn} to ${checkOut}`,
    hi: (name) => `Hi ${name},`,
    sorry: (stay) => `We're sorry: the dates you paid for (${stay}) were booked by someone else while you were checking out.`,
    refunded: 'We have refunded your payment in full. It usually shows on your card within 5–10 business days.',
    otherDates: (email) => `If you'd like other dates, just reply to this e-mail or write to ${email}.`,
  },
  sv: {
    subject: 'Din bokning kunde inte slutföras – full återbetalning',
    stay: (title, checkIn, checkOut) => `${title || 'stugan'}, ${longDate(checkIn, 'sv')} – ${longDate(checkOut, 'sv')}`,
    hi: (name) => `Hej ${name},`,
    sorry: (stay) => `Tyvärr bokades datumen du betalade för (${stay}) av någon annan medan du slutförde betalningen.`,
    refunded: 'Vi har betalat tillbaka hela beloppet. Pengarna syns oftast på ditt kort inom 5–10 bankdagar.',
    otherDates: (email) => `Vill du boka andra datum? Svara bara på det här mejlet eller skriv till ${email}.`,
  },
  de: {
    subject: 'Deine Buchung konnte nicht abgeschlossen werden – volle Rückerstattung',
    stay: (title, checkIn, checkOut) => `${title || 'das Ferienhaus'}, ${longDate(checkIn, 'de')} – ${longDate(checkOut, 'de')}`,
    hi: (name) => `Hallo ${name},`,
    sorry: (stay) => `Das tut uns leid: Der Zeitraum, den du bezahlt hast (${stay}), wurde während deiner Zahlung von jemand anderem gebucht.`,
    refunded: 'Wir haben dir den vollen Betrag erstattet. Die Erstattung ist meist innerhalb von 5–10 Werktagen auf deiner Karte zu sehen.',
    otherDates: (email) => `Wenn du einen anderen Zeitraum buchen möchtest, antworte einfach auf diese E-Mail oder schreib an ${email}.`,
  },
};

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

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  typeof value === 'string' ? value : value?.id ?? null;

export async function processCheckoutSession(
  stripe: Stripe,
  supabase: SupabaseClient,
  sessionId: string,
  origin: { ip: string | null; userAgent: string },
): Promise<ProcessResult> {
  // Always read the session from Stripe - never trust the caller's data. The
  // charge says whether the host's share went to their Stripe account.
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent.latest_charge'] });

  // Not an error worth a person's time: the guest's redirect can arrive
  // before a delayed payment completes, and Stripe sends an event when it does
  if (session.payment_status !== 'paid') {
    console.error('Payment not completed:', session.payment_status);
    throw new Error("Payment not completed");
  }

  try {
    return await saveSession(stripe, supabase, session, origin);
  } catch (error) {
    // The guest has paid but nothing was saved, and the dates can be sold
    // again: a person must look. Alerted only from here, after Stripe confirmed
    // a paid session, so made-up session ids can't trigger e-mails. Once per
    // session: the webhook retries for days and reconcile-payments hourly.
    const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);
    const metadata = session.metadata ?? {};
    await alertAdminOnce(supabase, `payment-failed:${sessionId}`, 'Paid checkout could not be saved', [
      `Stripe session: ${sessionId} (${metadata.type ?? 'unknown'})`,
      `Property: ${metadata.propertyTitle ?? '-'}, ${metadata.checkInDate ?? ''} to ${metadata.checkOutDate ?? ''}`,
      `Guest: ${metadata.guestName ?? '-'} <${metadata.guestEmail ?? '-'}>`,
      `Paid: ${kr(session.amount_total ?? 0)} ${(session.currency ?? 'sek').toUpperCase()}`,
      `Error: ${message}`,
      "The Stripe webhook retries for 3 days and reconcile-payments every hour. Fix the cause, or refund the payment in Stripe (the host's transfer is then taken back automatically).",
      'Do not enter this booking by hand: a retry would see its dates as taken and refund the guest as a double booking.',
    ]).catch((alertError) => console.error('Alert failed:', alertError));
    throw error;
  }
}

async function saveSession(
  stripe: Stripe,
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  origin: { ip: string | null; userAgent: string },
): Promise<ProcessResult> {
  const sessionId = session.id;
  const sessionType = session.metadata?.type || 'unknown';
  const paymentIntent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
  const paymentIntentId = idOf(session.payment_intent);

  // Claim the session first. The unique constraint on session_id makes this
  // atomic, so the webhook and the redirect can't both create a booking.
  const insertClaim = () =>
    supabase
      .from('processed_sessions')
      .insert({
        session_id: sessionId,
        session_type: sessionType,
        ip_address: origin.ip,
        user_agent: origin.userAgent,
      })
      .select('id')
      .single();

  let { data: claim, error: claimError } = await insertClaim();

  if (claimError) {
    if (claimError.code !== '23505') throw claimError;
    const { data: existing } = await supabase
      .from('processed_sessions')
      .select('id, session_type, created_record_id, processed_at')
      .eq('session_id', sessionId)
      .single();
    if (existing?.session_type === 'booking_refunded_dates_taken') {
      return { success: false, type: 'booking', bookingId: null, message: 'dates_taken_refunded' };
    }
    if (existing?.session_type === 'booking_refunded_unsaved') {
      return { success: false, type: 'booking', bookingId: null, message: 'refunded' };
    }
    if (existing?.created_record_id || sessionType !== 'booking') {
      console.log('Session already processed:', sessionId);
      return {
        success: true,
        type: existing?.session_type ?? sessionType,
        bookingId: existing?.created_record_id ?? null,
        message: 'Already processed',
      };
    }

    // Claimed but no booking recorded. The booking may exist already if the
    // call that saved it stopped before recording it on the claim.
    const { data: saved } = await supabase
      .from('bookings')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId ?? '')
      .maybeSingle();
    if (saved) {
      await supabase.from('processed_sessions').update({ created_record_id: saved.id }).eq('id', existing!.id);
      return { success: true, type: 'booking', bookingId: saved.id, message: 'Already processed' };
    }

    const claimAge = Date.now() - Date.parse(existing?.processed_at ?? '');
    if (!(claimAge > STALE_CLAIM_MS)) {
      console.log('Session is being processed by another call:', sessionId);
      return { success: false, type: 'booking', bookingId: null, message: 'processing' };
    }

    // Stale: take it over. Delete only that exact claim, so two callers can't
    // both take it over; the loser gets 'processing' below.
    console.warn('Taking over a stale claim:', sessionId);
    await supabase
      .from('processed_sessions')
      .delete()
      .eq('id', existing!.id)
      .is('created_record_id', null);
    ({ data: claim, error: claimError } = await insertClaim());
    if (claimError) {
      if (claimError.code !== '23505') throw claimError;
      return { success: false, type: 'booking', bookingId: null, message: 'processing' };
    }
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

      const charge = paymentIntent && typeof paymentIntent.latest_charge === 'object' ? paymentIntent.latest_charge : null;

      // Saved already by a call whose response was lost (or that died before
      // recording it on the claim): its own booking must not count as a
      // clash below, which would refund a confirmed stay
      const { data: savedRows, error: savedError } = await supabase
        .from('bookings')
        .select('id')
        .eq('stripe_payment_intent_id', paymentIntentId ?? '')
        .limit(1);
      if (savedError) throw savedError;
      const saved = savedRows?.[0];
      if (saved) {
        await supabase.from('processed_sessions').update({ created_record_id: saved.id }).eq('id', claim!.id);
        return { success: true, type: 'booking', bookingId: saved.id, message: 'Already processed' };
      }

      // Refunded before it was ever saved (e.g. by hand in Stripe after a
      // failed save): saving it now would confirm a stay nobody paid for, and
      // with no booking the host must not keep the transfer either
      if (charge?.refunded) {
        await reverseUnsavedPayment(stripe, supabase, charge, sessionId, [
          `Stripe session: ${sessionId}`,
          `Property: ${metadata.propertyTitle ?? '-'}, ${metadata.checkInDate ?? ''} to ${metadata.checkOutDate ?? ''}`,
          `Guest: ${metadata.guestName ?? '-'} <${metadata.guestEmail ?? '-'}>`,
        ]);
        await supabase
          .from('processed_sessions')
          .update({ session_type: 'booking_refunded_unsaved' })
          .eq('id', claim!.id);
        console.warn('Paid session was refunded before it was saved; no booking created:', sessionId);
        return { success: false, type: 'booking', bookingId: null, message: 'refunded' };
      }

      // The dates were free when checkout opened, but it stays open for up to
      // 30 minutes: another guest or a channel booking may have taken them.
      // Refund in full rather than save a double booking.
      if (await datesTaken(supabase, metadata.propertyId, metadata.checkInDate, metadata.checkOutDate)) {
        await stripe.refunds.create(
          {
            payment_intent: paymentIntentId!,
            reason: 'duplicate',
            // A Connect host payout and the service fee go back too; the
            // platform absorbs Stripe's card fee (owner decision 21 Oct 2026)
            ...(paymentIntent?.transfer_data ? { reverse_transfer: true, refund_application_fee: true } : {}),
          },
          { idempotencyKey: `dates-taken-refund-${sessionId}` },
        );
        await supabase
          .from('processed_sessions')
          .update({ session_type: 'booking_refunded_dates_taken' })
          .eq('id', claim!.id);

        const stay = `${metadata.propertyTitle || 'the cabin'}, ${metadata.checkInDate} to ${metadata.checkOutDate}`;
        const t = DATES_TAKEN_COPY[guestLang(metadata.guestLang)];
        await sendEmail(
          metadata.guestEmail,
          t.subject,
          `<p>${t.hi(escapeHtml(metadata.guestName))}</p>
           <p>${t.sorry(escapeHtml(t.stay(metadata.propertyTitle, metadata.checkInDate, metadata.checkOutDate)))}
           ${t.refunded}</p>
           <p>${t.otherDates(SUPPORT_EMAIL)}</p>
           <p>Jenny &amp; Jon, Nordic Getaways</p>`,
        );
        await alertAdmin('Double booking prevented – guest refunded', [
          `Stay: ${stay}`,
          `Guest: ${metadata.guestName} <${metadata.guestEmail}>`,
          `Amount refunded: ${kr(paidAmount)} ${(metadata.currency || 'SEK').toUpperCase()}`,
          `Stripe session: ${sessionId}`,
        ]);
        return { success: false, type: 'booking', bookingId: null, message: 'dates_taken_refunded' };
      }

      // Where the host's share went: a destination charge leaves it in the
      // host's own Stripe balance until the payout job pays it out (the day
      // after check-in, or 85 days after payment if that comes first);
      // otherwise it reached the platform account.
      const transferId = idOf(charge?.transfer as string | { id: string } | null | undefined);
      const hasDestination = !!paymentIntent?.transfer_data?.destination;
      const paidAt = (charge?.created ?? paymentIntent?.created ?? session.created) * 1000;
      const payout = initialHostPayout(metadata.checkInDate, paidAt, transferId, hasDestination);
      if (hasDestination && !transferId) {
        console.warn('Destination charge without a transfer id yet; the payout job can read it from the charge:', paymentIntentId);
      }

      const extras = await chosenExtras(supabase, metadata.extras);

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          property_id: metadata.propertyId,
          user_id: metadata.userId || null,
          guest_name: metadata.guestName,
          guest_email: metadata.guestEmail,
          guest_phone: metadata.guestPhone || null,
          // The language the guest booked in; their e-mails use it
          guest_lang: guestLang(metadata.guestLang),
          check_in_date: metadata.checkInDate,
          check_out_date: metadata.checkOutDate,
          number_of_guests: parseInt(metadata.numberOfGuests),
          special_requests: metadata.specialRequests || null,
          extras,
          // The policy the guest saw when booking (older sessions: none, i.e. Standard)
          cancellation_policy: isPolicyKey(metadata.cancellationPolicy) ? metadata.cancellationPolicy : null,
          total_amount: parseInt(metadata.totalAmount),
          // Fee model A split (both in öre); older sessions carry no serviceFee
          service_fee: parseInt(metadata.serviceFee || "0"),
          host_amount: metadata.hostAmount ? parseInt(metadata.hostAmount) : null,
          rules_confirmed_at: metadata.rulesConfirmedAt || null,
          currency: metadata.currency?.toUpperCase() || 'SEK',
          status: 'confirmed',
          source: 'direct',
          stripe_payment_intent_id: paymentIntentId,
          // Saved with the booking so the host's e-mail can state the payout
          ...payout,
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

      if (booking) {
        result.bookingId = booking.id;
        recordId = booking.id;

        // Partly refunded before it was saved: take that part back from the
        // host now, as for any later refund
        if (charge?.amount_refunded) {
          const { data: moneyRow } = await supabase.from('bookings').select(MONEY_BOOKING_COLUMNS).eq('id', booking.id).single();
          await reconcileBookingMoney(stripe, supabase, moneyRow as MoneyBooking, { context: 'refunded before the booking was saved' })
            .catch(async (reconcileError) => {
              console.error('Reconciling an early refund failed:', reconcileError);
              // So the payout job's daily retry sees the refund and takes it from the host
              await supabase.from('bookings').update({ refunded_amount: charge.amount_refunded })
                .eq('id', booking.id).lt('refunded_amount', charge.amount_refunded);
            });
        }

        if (payout.host_payout_status === 'manual') {
          await alertManualPayout(supabase, booking, metadata, sessionId)
            .catch((alertError) => console.error('Manual payout alert failed:', alertError));
        }

        // The booking stands even if the e-mails fail, but a person must know:
        // the guest has no address or check-in details, the host no notice
        try {
          const { error: notifyError } = await supabase.functions.invoke('send-booking-notifications', {
            body: { bookingId: booking.id },
          });
          if (notifyError) throw notifyError;
        } catch (notificationError) {
          console.error('Failed to send notifications:', notificationError);
          const detail = await errorDetail(notificationError);
          // Same key as send-booking-notifications uses, so one failure is one e-mail
          await alertAdminOnce(supabase, `notify-failed:${booking.id}`, 'Booking confirmation e-mail not sent', [
            `${metadata.propertyTitle}, ${metadata.checkInDate} to ${metadata.checkOutDate}`,
            `Guest: ${metadata.guestName} <${metadata.guestEmail}>`,
            `Booking: ${booking.id}`,
            `Error: ${detail}`,
            'The booking is saved and confirmed. Send the guest their confirmation (address, check-in) and tell the host.',
          ]).catch((alertError) => console.error('Alert failed:', alertError));
        }
      }

      result.type = 'booking';

    }
    // Shop checkouts run on the shop Stripe account: handle-shop-payment-success

  } catch (error) {
    // Release the claim so a later retry (e.g. Stripe re-sending the webhook) can succeed
    await supabase.from('processed_sessions').delete().eq('id', claim!.id);
    throw error;
  }

  await supabase
    .from('processed_sessions')
    .update({ created_record_id: recordId })
    .eq('id', claim!.id);

  return result;
}

// functions.invoke wraps a non-2xx in an error whose body says what went wrong
async function errorDetail(error: unknown): Promise<string> {
  const message = error instanceof Error ? error.message : String(error);
  try {
    const context = (error as { context?: Response }).context;
    const body = context && typeof context.text === 'function' ? await context.text() : '';
    return body ? `${message}: ${body.slice(0, 300)}` : message;
  } catch {
    return message;
  }
}

// The guest's money reached the platform account (the host has no Stripe
// account that can receive transfers): someone must pay the host by hand
async function alertManualPayout(
  supabase: SupabaseClient,
  booking: { id: string; host_amount: number | null; total_amount: number; service_fee: number | null; host_payout_due_on: string | null },
  metadata: Stripe.Metadata,
  sessionId: string,
) {
  const { data: host } = await supabase
    .from('profiles')
    .select('full_name, host_business_name, email')
    .eq('id', metadata.hostId ?? '')
    .maybeSingle();
  const reasons: Record<string, string> = {
    no_account: "The host has no Stripe payout account connected.",
    transfers_inactive: "The host's Stripe account could not receive transfers at checkout.",
    check_failed: "Stripe could not be reached to check the host's account at checkout.",
  };
  const currency = (metadata.currency || 'SEK').toUpperCase();
  await alertAdminOnce(supabase, `host-payout-manual:${booking.id}`, 'Pay host by hand', [
    `${metadata.propertyTitle}, ${metadata.checkInDate} to ${metadata.checkOutDate}, guest ${metadata.guestName}`,
    `Host: ${host?.host_business_name || host?.full_name || metadata.hostId || '-'}${host?.email ? ` <${host.email}>` : ''}`,
    `Host's share: ${kr(hostShareAmount(booking))} ${currency} (the guest paid ${kr(booking.total_amount)} ${currency}; the service fee stays with the platform)`,
    reasons[metadata.hostPayoutReason ?? ''] ?? "The payment was not sent to the host's Stripe account.",
    `The whole payment is in the platform's Stripe balance. Pay the host by hand on ${booking.host_payout_due_on ?? 'the day after check-in'}, the day after check-in: the money is in our own account, so the 85-day rule for shares waiting in a host's Stripe account does not apply. Deduct what they owe in host_charges (card fees, refunds after payout), then set the booking's payout status to paid_out. It is listed in the daily health check until then.`,
    `Booking: ${booking.id}, Stripe session: ${sessionId}`,
  ]);
}

/**
 * The extras the guest added, from the session's metadata ("<rule id>:<öre>;…",
 * written by create-booking-payment-connect), with their names. The amount is
 * what was charged; a name that can't be read stays "Extra" (the booking must
 * still be saved). Null without extras.
 */
async function chosenExtras(supabase: SupabaseClient, raw: string | undefined): Promise<{ id: string; name: string; amount: number }[] | null> {
  const parts = (raw ?? '')
    .split(';')
    .map((part) => part.split(':'))
    .filter(([id, amount]) => id && /^\d+$/.test(amount ?? ''))
    .map(([id, amount]) => ({ id, amount: parseInt(amount, 10) }));
  if (!parts.length) return null;
  const { data } = await supabase
    .from('properties_pricing_rules')
    .select('id, name')
    .in('id', parts.map((p) => p.id));
  const names = new Map((data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]));
  return parts.map((p) => ({ ...p, name: names.get(p.id) ?? 'Extra' }));
}
