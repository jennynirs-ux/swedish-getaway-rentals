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
      totalAmount,
      currency
    } = await req.json();

    logStep("Request data received", { propertyId, checkInDate, checkOutDate, numberOfGuests, totalAmount, currency });

    // Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Kolla användare (om auth-token skickas med)
    let user = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
      logStep("User authenticated", { userId: user?.id });
    }

    // Hämta property med hostens Stripe-konto
    const { data: property, error: propertyError } = await supabaseClient
      .from("properties")
      .select(`
        id, title, currency, host_id,
        profiles!properties_host_id_fkey(stripe_connect_account_id, commission_rate)
      `)
      .eq("id", propertyId)
      .eq("active", true)
      .single();

    if (propertyError || !property) {
      logStep("Property not found", { propertyId, error: propertyError });
      return new Response(JSON.stringify({ error: "Property not found or inactive" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const profileData = property.profiles as any;
    logStep("Property found", {
      propertyTitle: property.title,
      hostConnectAccount: profileData?.stripe_connect_account_id,
      commissionRate: profileData?.commission_rate,
    });

    // Kommission
    const commissionRate = profileData?.commission_rate || 10;
    const platformCommission = Math.ceil(totalAmount * (commissionRate / 100));
    const hostAmount = totalAmount - platformCommission;

    logStep("Commission calculation", { commissionRate, platformCommission, hostAmount });

    // Stripe init
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Customer
    let customerId;
    if (guestEmail) {
      const customers = await stripe.customers.list({ email: guestEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      }
    }

    // Stripe line item
    const lineItems = [
      {
        price_data: {
          currency: (currency || property.currency || "sek").toLowerCase(),
          product_data: {
            name: `${property.title}`,
            description: `Check-in: ${checkInDate}, Check-out: ${checkOutDate}`,
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      },
    ];

    // Stripe checkout session config
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
        userId: user?.id || "",
        hostAmount: hostAmount.toString(),
        platformCommission: platformCommission.toString(),
        commissionRate: commissionRate.toString(),
      },
    };

    // Stripe Connect payout
    if (profileData?.stripe_connect_account_id) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformCommission,
        transfer_data: {
          destination: profileData.stripe_connect_account_id,
        },
      };
      logStep("Stripe Connect configured", {
        destination: profileData.stripe_connect_account_id,
        applicationFee: platformCommission,
      });
    }

    // Skapa Stripe session
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
