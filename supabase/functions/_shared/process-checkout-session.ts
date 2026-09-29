import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Shared by handle-payment-success (guest redirect) and stripe-webhook, which
// can both fire for the same Checkout session, often at the same moment.

export interface ProcessResult {
  success: boolean;
  type: string;
  bookingId: string | null;
  message?: string;
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
          currency: metadata.currency?.toUpperCase() || 'SEK',
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent as string
        })
        .select()
        .single();

      if (bookingError) throw bookingError;
    
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

    } else if (session.metadata?.type === 'product') {
      const productId = session.metadata.product_id;
      const quantity = parseInt(session.metadata.quantity || '1');
      const printfulProductId = session.metadata.printful_product_id;
      const printfulVariantId = session.metadata.printful_variant_id;
      const variantName = session.metadata.variant_name || '';

      const { data: product, error: productError } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const finalTitle = product.title_override || product.title;
      const finalDescription = product.description_override || product.custom_description || product.description;
      const productDisplayName = variantName ? `${finalTitle} - ${variantName}` : finalTitle;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: session.customer_details?.name || session.shipping_details?.name || '',
          customer_email: session.customer_details?.email || '',
          customer_phone: session.customer_details?.phone || '',
          total_amount: session.amount_total,
          currency: session.currency?.toUpperCase() || 'SEK',
          status: 'paid',
          product_data: {
            name: productDisplayName,
            description: finalDescription,
            price: session.amount_total,
            quantity: quantity,
            printful_product_id: printfulProductId,
            printful_variant_id: printfulVariantId,
            variant_name: variantName,
          },
          shipping_address: session.shipping_details,
          stripe_payment_intent_id: session.payment_intent
        })
        .select()
        .single();

      if (orderError) throw orderError;
      recordId = order.id;

      // Create Printful order if we have the necessary data
      if (printfulVariantId && session.shipping_details) {
        try {
          const printfulToken = Deno.env.get("PRINTFUL_API_TOKEN");
        
          const printfulOrder = {
            recipient: {
              name: session.shipping_details.name || '',
              email: session.customer_details?.email || '',
              address1: session.shipping_details.address?.line1 || '',
              address2: session.shipping_details.address?.line2 || '',
              city: session.shipping_details.address?.city || '',
              country_code: session.shipping_details.address?.country || 'SE',
              state_code: session.shipping_details.address?.state || '',
              zip: session.shipping_details.address?.postal_code || '',
              phone: session.customer_details?.phone || '',
            },
            items: [{
              sync_variant_id: parseInt(printfulVariantId),
              quantity: quantity,
              retail_price: (session.amount_total / 100).toFixed(2),
            }],
            external_id: order.id,
          };

          console.log('Creating Printful order:', JSON.stringify(printfulOrder, null, 2));

          const printfulResponse = await fetch("https://api.printful.com/orders", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${printfulToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(printfulOrder),
          });

          if (printfulResponse.ok) {
            const printfulResult = await printfulResponse.json();
            console.log('Printful order created:', printfulResult.result.id);
          
            await supabase
              .from('orders')
              .update({ 
                printful_order_id: printfulResult.result.id.toString(),
                status: 'processing',
                updated_at: new Date().toISOString(),
              })
              .eq('id', order.id);
          } else {
            const errorText = await printfulResponse.text();
            console.error('Printful order failed:', printfulResponse.status, errorText);
          }
        } catch (printfulError) {
          console.error('Printful order failed:', printfulError);
        }
      }

      result.type = 'product';
    } else if (session.metadata?.type === 'cart') {
      const lineItems = (session as any).line_items?.data || [];
      const items = lineItems.map((li: any) => ({
        name: li.description,
        quantity: li.quantity,
        amount_subtotal: li.amount_subtotal,
        amount_total: li.amount_total,
      }));

      const { data: cartOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: session.customer_details?.name || session.shipping_details?.name || '',
          customer_email: session.customer_details?.email || '',
          customer_phone: session.customer_details?.phone || '',
          total_amount: session.amount_total,
          currency: session.currency?.toUpperCase() || 'SEK',
          status: 'paid',
          product_data: items,
          shipping_address: session.shipping_details,
          stripe_payment_intent_id: session.payment_intent
        })
        .select()
        .single();
      if (orderError) throw orderError;
      recordId = cartOrder.id;
      result.type = 'cart';
    }

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
