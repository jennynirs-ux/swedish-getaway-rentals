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
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer_details']
    });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (session.metadata?.type === "booking") {
      // Handle booking payment
      const bookingData = JSON.parse(session.metadata.booking_data);
      
      const { error } = await supabase
        .from("bookings")
        .insert({
          property_id: bookingData.property_id,
          user_id: bookingData.user_id || null,
          guest_name: bookingData.guest_name,
          guest_email: bookingData.guest_email,
          guest_phone: bookingData.guest_phone,
          check_in_date: bookingData.check_in_date,
          check_out_date: bookingData.check_out_date,
          number_of_guests: bookingData.number_of_guests,
          total_amount: bookingData.total_amount,
          currency: bookingData.currency,
          special_requests: bookingData.special_requests,
          stripe_payment_intent_id: session.payment_intent,
          status: "confirmed"
        });

      if (error) {
        console.error("Error saving booking:", error);
        throw new Error("Failed to save booking");
      }

    } else if (session.metadata?.type === "product") {
      // Handle product order
      const printfulToken = Deno.env.get("PRINTFUL_API_TOKEN");
      
      // Create order in Printful
      let printfulOrderId = null;
      if (printfulToken) {
        try {
          const printfulOrder = {
            recipient: {
              name: session.customer_details?.name || "Customer",
              email: session.customer_details?.email,
              address1: session.shipping_details?.address?.line1,
              address2: session.shipping_details?.address?.line2,
              city: session.shipping_details?.address?.city,
              state_code: session.shipping_details?.address?.state,
              country_code: session.shipping_details?.address?.country,
              zip: session.shipping_details?.address?.postal_code,
            },
            items: [
              {
                sync_variant_id: parseInt(session.metadata.printful_product_id),
                quantity: parseInt(session.metadata.quantity),
              }
            ]
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
            const printfulData = await printfulResponse.json();
            printfulOrderId = printfulData.result?.id;
          }
        } catch (printfulError) {
          console.error("Printful order creation failed:", printfulError);
        }
      }

      // Save order to database
      const { error } = await supabase
        .from("orders")
        .insert({
          customer_email: session.customer_details?.email,
          customer_name: session.customer_details?.name,
          stripe_payment_intent_id: session.payment_intent,
          printful_order_id: printfulOrderId,
          status: printfulOrderId ? "processing" : "paid",
          total_amount: session.amount_total,
          currency: session.currency?.toUpperCase(),
          product_data: {
            product_id: session.metadata.product_id,
            printful_product_id: session.metadata.printful_product_id,
            quantity: parseInt(session.metadata.quantity)
          },
          shipping_address: session.shipping_details?.address
        });

      if (error) {
        console.error("Error saving order:", error);
        throw new Error("Failed to save order");
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      payment_status: session.payment_status,
      type: session.metadata?.type
    }), {
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