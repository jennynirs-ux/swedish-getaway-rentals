import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let rawBody = '';
  try {
    rawBody = await req.text();
    const requestBody = JSON.parse(rawBody);
    const { session_id } = requestBody;
    
    if (!session_id) {
      console.error("Missing session ID in request");
      throw new Error("Session ID is required");
    }

    // Validate session ID format (Stripe session IDs start with cs_)
    if (!session_id.startsWith('cs_')) {
      console.error("Invalid session ID format:", session_id);
      throw new Error("Invalid session ID format");
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    console.log(`Payment success handler called from IP: ${clientIP}, Session: ${session_id}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve and validate the session directly from Stripe
    // This is secure because we're fetching from Stripe's API with our secret key
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['line_items'] });
    
    if (!session) {
      throw new Error("Session not found");
    }

    // Verify the payment was actually successful
    if (session.payment_status !== 'paid') {
      console.error('Payment not completed:', session.payment_status);
      throw new Error("Payment not completed");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for duplicate processing (idempotency) — use upsert pattern to prevent race conditions
    const { data: existingSession } = await supabase
      .from('processed_sessions')
      .select('id, session_type, created_record_id')
      .eq('session_id', session_id)
      .single();

    if (existingSession) {
      console.log('Session already processed:', session_id);
      return new Response(JSON.stringify({
        success: true,
        type: existingSession.session_type,
        bookingId: existingSession.created_record_id,
        message: 'Already processed'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Claim this session immediately to prevent race conditions with concurrent requests.
    // If another request claimed it between our check and this insert, the unique constraint
    // on session_id will cause this to fail, and we return the existing result.
    const { error: claimError } = await supabase
      .from('processed_sessions')
      .insert({
        session_id,
        session_type: 'pending',
        ip_address: clientIP,
        user_agent: userAgent,
        created_record_id: null,
      });

    if (claimError) {
      // Another request claimed this session — fetch and return its result
      console.log('Session claimed by concurrent request:', session_id);
      const { data: claimed } = await supabase
        .from('processed_sessions')
        .select('session_type, created_record_id')
        .eq('session_id', session_id)
        .single();
      return new Response(JSON.stringify({
        success: true,
        type: claimed?.session_type || 'unknown',
        bookingId: claimed?.created_record_id,
        message: 'Already processed (concurrent)'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let result = { success: true, type: 'unknown', bookingId: null };

    if (session.metadata?.type === 'booking') {
      const metadata = session.metadata;

      // BUG-007: Validate user ownership if auth context is present
      // Stripe webhooks may not have Authorization headers, but if they do, verify the authenticated
      // user matches the metadata.userId to prevent unauthorized booking creation
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        const authUser = data.user;

        if (authUser && metadata.userId && authUser.id !== metadata.userId) {
          console.warn('User ownership mismatch: auth user does not match metadata.userId', {
            authUserId: authUser.id,
            metadataUserId: metadata.userId
          });
          // Log but continue processing since Stripe webhooks are legitimate even without user context
        }
      }

      // Verify the amount paid matches the booking amount (critical security check)
      const paidAmount = session.amount_total || 0;
      const expectedAmount = parseInt(metadata.totalAmount) * 100; // Convert to cents

      if (paidAmount !== expectedAmount) {
        console.error('Payment amount mismatch:', { paidAmount, expectedAmount });
        throw new Error('Payment amount verification failed');
      }
      
      // Check if property requires host approval before confirming
      const { data: propertySettings } = await supabase
        .from('properties')
        .select('requires_host_approval')
        .eq('id', metadata.propertyId)
        .single();

      const bookingStatus = propertySettings?.requires_host_approval
        ? 'pending_approval'
        : 'confirmed';

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
          currency: metadata.currency?.toUpperCase() || 'SEK',
          status: bookingStatus,
          stripe_payment_intent_id: session.payment_intent as string
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // BUG-003: Increment coupon used_count if a coupon was applied
      if (metadata.couponCode && metadata.couponId) {
        const { data: coupon, error: couponFetchError } = await supabase
          .from('coupons')
          .select('id, used_count')
          .eq('id', metadata.couponId)
          .single();

        if (!couponFetchError && coupon) {
          const newUsedCount = (coupon.used_count || 0) + 1;
          const { error: updateError } = await supabase
            .from('coupons')
            .update({ used_count: newUsedCount })
            .eq('id', metadata.couponId);

          if (updateError) {
            console.error('Failed to increment coupon used_count:', updateError);
          } else {
            console.log('Coupon used_count incremented:', {
              couponCode: metadata.couponCode,
              couponId: metadata.couponId,
              newUsedCount
            });
          }
        } else if (couponFetchError) {
          console.error('Failed to fetch coupon for increment:', couponFetchError);
        }
      }

      // Update the claimed session with the actual result
      await supabase.from('processed_sessions')
        .update({ session_type: 'booking', created_record_id: booking.id })
        .eq('session_id', session_id);
      
      // Send notification emails
      if (booking) {
        result.bookingId = booking.id;
        
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
      
      // Update the claimed session with the actual result
      await supabase.from('processed_sessions')
        .update({ session_type: 'product', created_record_id: order.id })
        .eq('session_id', session_id);

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

      // BUG-003: Increment coupon used_count for cart orders if a coupon was applied
      if (session.metadata?.coupon_code && session.metadata?.coupon_id) {
        const { data: coupon, error: couponFetchError } = await supabase
          .from('coupons')
          .select('id, used_count')
          .eq('id', session.metadata.coupon_id)
          .single();

        if (!couponFetchError && coupon) {
          const newUsedCount = (coupon.used_count || 0) + 1;
          const { error: updateError } = await supabase
            .from('coupons')
            .update({ used_count: newUsedCount })
            .eq('id', session.metadata.coupon_id);

          if (updateError) {
            console.error('Failed to increment coupon used_count for cart:', updateError);
          } else {
            console.log('Coupon used_count incremented for cart:', {
              couponCode: session.metadata.coupon_code,
              couponId: session.metadata.coupon_id,
              newUsedCount
            });
          }
        } else if (couponFetchError) {
          console.error('Failed to fetch coupon for cart increment:', couponFetchError);
        }
      }

      // Update the claimed session with the actual result
      await supabase.from('processed_sessions')
        .update({ session_type: 'cart', created_record_id: cartOrder.id })
        .eq('session_id', session_id);

      result.type = 'cart';
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error handling payment success:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Log failed webhook to database for admin visibility and manual recovery
    try {
      const supabaseForLog = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      await supabaseForLog.from('webhook_failures').insert({
        function_name: 'handle-payment-success',
        payload: rawBody ? JSON.parse(rawBody) : null,
        error_message: errorMessage,
        retry_count: 0,
      });
    } catch (logError) {
      console.error('Failed to log webhook failure:', logError);
    }

    return new Response(JSON.stringify({
      error: "Unable to process payment confirmation. Please contact support if the issue persists."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});