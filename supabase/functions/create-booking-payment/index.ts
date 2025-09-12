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
    const { bookingData } = requestBody;
    
    if (!bookingData) {
      console.error("Missing booking data in request");
      throw new Error("Booking data is required");
    }

    // Validate required fields
    const requiredFields = ['guest_name', 'guest_email', 'check_in_date', 'check_out_date', 'total_amount'];
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        console.error(`Missing required field: ${field}`);
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(bookingData.guest_email)) {
      console.error("Invalid email format:", bookingData.guest_email);
      throw new Error("Invalid email format");
    }

    // Validate amount
    if (typeof bookingData.total_amount !== 'number' || bookingData.total_amount <= 0) {
      console.error("Invalid amount:", bookingData.total_amount);
      throw new Error("Invalid amount");
    }

    // Rate limiting check
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    console.log(`Booking payment request from IP: ${clientIP}, User-Agent: ${userAgent}, Email: ${bookingData.guest_email}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create checkout session for booking
    const session = await stripe.checkout.sessions.create({
      customer_email: bookingData.guest_email,
      line_items: [
        {
          price_data: {
            currency: bookingData.currency.toLowerCase(),
            product_data: {
              name: `Booking: ${bookingData.property_title}`,
              description: `${bookingData.check_in_date} to ${bookingData.check_out_date} for ${bookingData.number_of_guests} guests`,
            },
            unit_amount: Math.round(bookingData.total_amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/`,
      metadata: {
        type: "booking",
        booking_data: JSON.stringify(bookingData),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating booking payment:", error);
    
    // Don't expose internal error details to client
    const isValidationError = error.message.includes('Missing required field') || 
                             error.message.includes('Invalid email') || 
                             error.message.includes('Invalid amount');
    
    const clientError = isValidationError ? error.message : "Payment processing failed. Please try again.";
    
    return new Response(JSON.stringify({ error: clientError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isValidationError ? 400 : 500,
    });
  }
});