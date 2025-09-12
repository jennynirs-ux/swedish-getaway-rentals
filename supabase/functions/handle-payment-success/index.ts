import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Input validation and sanitization
    const requestBody = await req.json();
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

    // Rate limiting and security logging
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    console.log(`Payment success handler called from IP: ${clientIP}, User-Agent: ${userAgent}, Session: ${session_id}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (!session) {
      throw new Error("Session not found");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let result = { success: true, type: 'unknown' };

    if (session.metadata?.type === 'booking') {
      const bookingData = JSON.parse(session.metadata.booking_data);
      
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          property_id: bookingData.property_id,
          guest_name: bookingData.guest_name,
          guest_email: bookingData.guest_email,
          guest_phone: bookingData.guest_phone,
          check_in_date: bookingData.check_in_date,
          check_out_date: bookingData.check_out_date,
          number_of_guests: bookingData.number_of_guests,
          special_requests: bookingData.special_requests,
          total_amount: bookingData.total_amount,
          currency: bookingData.currency,
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent
        });

      if (bookingError) throw bookingError;
      result.type = 'booking';

    } else if (session.metadata?.type === 'product') {
      const productId = session.metadata.product_id;
      const quantity = parseInt(session.metadata.quantity || '1');
      const printfulProductId = session.metadata.printful_product_id;

      const { data: product, error: productError } = await supabase
        .from('shop_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: session.customer_details?.name || session.shipping_details?.name || '',
          customer_email: session.customer_details?.email || '',
          total_amount: session.amount_total,
          currency: session.currency?.toUpperCase() || 'SEK',
          status: 'paid',
          product_data: {
            name: product.title,
            description: product.custom_description || product.description,
            price: product.custom_price || product.price,
            quantity: quantity
          },
          shipping_address: session.shipping_details,
          stripe_payment_intent_id: session.payment_intent
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (printfulProductId && session.shipping_details) {
        try {
          const printfulToken = Deno.env.get("PRINTFUL_API_TOKEN");
          
          const printfulOrder = {
            recipient: {
              name: session.shipping_details.name || '',
              email: session.customer_details?.email || '',
              address1: session.shipping_details.address?.line1 || '',
              city: session.shipping_details.address?.city || '',
              country_code: session.shipping_details.address?.country || 'SE',
              zip: session.shipping_details.address?.postal_code || ''
            },
            items: [{
              sync_variant_id: parseInt(printfulProductId),
              quantity: quantity
            }]
          };

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
            await supabase
              .from('orders')
              .update({ 
                printful_order_id: printfulResult.result.id.toString(),
                status: 'processing'
              })
              .eq('id', order.id);
          }
        } catch (printfulError) {
          console.error('Printful order failed:', printfulError);
        }
      }

      result.type = 'product';
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error handling payment success:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});