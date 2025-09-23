import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[BOOKING-PAYMENT-CONNECT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { 
      propertyId, 
      checkInDate, 
      checkOutDate, 
      numberOfGuests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      totalAmount // 👈 ta emot direkt från frontend
    } = await req.json();
    
    logStep("Request data received", { propertyId, checkInDate, checkOutDate, numberOfGuests, totalAmount });


    // Security logging
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    logStep("Booking request meta", { clientIP, userAgent, guestEmail });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get property details (left join to allow missing profile)
    const { data: property, error: propertyError } = await supabaseClient
      .from("properties")
      .select(
        `
        *,
        profiles(stripe_connect_account_id, commission_rate)
      `
      )
      .eq("id", propertyId)
      .eq("active", true)
      .maybeSingle();

    if (propertyError) {
      logStep("Property query error", { propertyError });
    }

    if (!property) {
      logStep("Property not found or inactive", { propertyId });
      return new Response(
        JSON.stringify({ error: "Property not found or inactive", propertyId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    logStep("Property found", {
      title: property.title,
      currency: property.currency,
      hostConnectAccount: property.profiles?.stripe_connect_account_id,
      commissionRate: property.profiles?.commission_rate,
    });

    // Calculate dates and amounts
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalAmount = nights * property.price_per_night;

    logStep("Booking calculation", { nights, pricePerNight: property.price_per_night, totalAmount });

    // Commission split
    const commissionRate = property.profiles?.commission_rate || 10.0;
    const platformCommission = Math.ceil(totalAmount * (commissionRate / 100));
    const hostAmount = totalAmount - platformCommission;

    logStep("Commission calculation", { commissionRate, platformCommission, hostAmount });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2022-11-15", // stabil version
    });

    // Reuse Stripe customer if exists
    let customerId;
    if (guestEmail) {
      const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      }
    }

    // Stripe requires amounts in öre/cent
    const lineItems = [
      {
        price_data: {
          currency: property.currency?.toLowerCase() || "sek",
          product_data: {
            name: `${property.title} - ${nights} night${nights > 1 ? "s" : ""}`,
            description: `Check-in: ${checkInDate}, Check-out: ${checkOutDate}`,
          },
          unit_amount: totalAmount * 100, // 👈 öre
        },
        quantity: 1,
      },
    ];

    // Session config
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : guestEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/property/${propertyId}`,
      metadata: {
        type: "booking",
        propertyId,
        checkInDate,
        checkOutDate,
        numberOfGuests: numberOfGuests.toString(),
        guestName,
        guestEmail,
        guestPhone: guestPhone || "",
        specialRequests: specialRequests || "",
        hostAmount: hostAmount.toString(),
        platformCommission: platformCommission.toString(),
        commissionRate: commissionRate.toString(),
      },
    };

    if (property.profiles?.stripe_connect_account_id) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformCommission * 100, // 👈 öre
        transfer_data: {
          destination: property.profiles.stripe_connect_account_id,
        },
      };
      logStep("Stripe Connect configured", {
        destination: property.profiles.stripe_connect_account_id,
        applicationFee: platformCommission,
      });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Stripe session created", { sessionId: session.id, sessionUrl: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-booking-payment-connect", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
