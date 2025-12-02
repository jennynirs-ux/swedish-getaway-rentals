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

    const requestData = await req.json();
    
    // Input validation - validate all required fields
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
    } = requestData;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!propertyId || !uuidRegex.test(propertyId)) {
      throw new Error('Invalid property ID format');
    }
    
    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new Error('Invalid date format');
    }
    if (checkOut <= checkIn) {
      throw new Error('Check-out date must be after check-in date');
    }
    
    // Validate guest count
    if (!numberOfGuests || numberOfGuests < 1 || numberOfGuests > 50) {
      throw new Error('Invalid number of guests');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!guestEmail || !emailRegex.test(guestEmail)) {
      throw new Error('Invalid email format');
    }
    
    // Validate required fields
    if (!guestName || guestName.length < 2) {
      throw new Error('Guest name is required');
    }

    logStep("Request data validated", { propertyId, checkInDate, checkOutDate, numberOfGuests });

    // Supabase client with service role to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
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

    // Fetch property and validate it exists and is active
    const { data: property, error: propertyError } = await supabaseClient
      .from("properties")
      .select(`
        id, title, currency, host_id, max_guests, price_per_night,
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
    
    // Validate guest count against property max
    if (numberOfGuests > property.max_guests) {
      logStep("Too many guests", { numberOfGuests, maxGuests: property.max_guests });
      return new Response(JSON.stringify({ error: `Property can accommodate maximum ${property.max_guests} guests` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // CRITICAL: Recalculate total amount server-side - never trust client-supplied amounts
    const nightCount = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    // Fetch pricing rules for this property
    const { data: pricingRules, error: rulesError } = await supabaseClient
      .from("properties_pricing_rules")
      .select("*")
      .eq("property_id", propertyId)
      .eq("is_active", true);
    
    if (rulesError) {
      logStep("Error fetching pricing rules", { error: rulesError });
    }
    
    // Calculate base accommodation cost
    let accommodationTotal = property.price_per_night * nightCount;
    
    // Calculate cleaning fees (one-time fees)
    let cleaningTotal = 0;
    if (pricingRules) {
      const cleaningRules = pricingRules.filter(r => r.rule_type === 'cleaning_fee');
      cleaningRules.forEach(rule => {
        cleaningTotal += rule.price;
      });
    }
    
    // Calculate extra guest fees
    let extraGuestTotal = 0;
    if (pricingRules) {
      const extraGuestRules = pricingRules.filter(r => r.rule_type === 'extra_guest');
      extraGuestRules.forEach(rule => {
        const extraGuests = Math.max(0, numberOfGuests - 1); // Base price includes 1 guest
        if (extraGuests > 0) {
          if (rule.is_per_night) {
            extraGuestTotal += rule.price * extraGuests * nightCount;
          } else {
            extraGuestTotal += rule.price * extraGuests;
          }
        }
      });
    }
    
    const serverCalculatedAmount = accommodationTotal + cleaningTotal + extraGuestTotal;
    
    logStep("Price calculation", {
      nightCount,
      accommodationTotal,
      cleaningTotal,
      extraGuestTotal,
      serverCalculatedAmount
    });
    
    // Allow small rounding differences (1% tolerance) but reject significant discrepancies
    const amountDifference = Math.abs(totalAmount - serverCalculatedAmount);
    const tolerance = serverCalculatedAmount * 0.01;
    
    if (amountDifference > tolerance) {
      logStep("Amount mismatch detected", { 
        clientAmount: totalAmount, 
        serverAmount: serverCalculatedAmount,
        difference: amountDifference 
      });
      return new Response(JSON.stringify({ 
        error: "Price calculation error. Please refresh and try again.",
        serverCalculatedAmount // Return correct amount for client to update
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Use server-calculated amount for payment
    const validatedAmount = serverCalculatedAmount;

    const profileData = property.profiles as any;
    logStep("Property found", {
      propertyTitle: property.title,
      hostConnectAccount: profileData?.stripe_connect_account_id,
      commissionRate: profileData?.commission_rate,
    });

    // Commission calculation using validated amount
    const commissionRate = profileData?.commission_rate || 10;
    const platformCommission = Math.ceil(validatedAmount * (commissionRate / 100));
    const hostAmount = validatedAmount - platformCommission;

    logStep("Commission calculation", { commissionRate, platformCommission, hostAmount, validatedAmount });

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

    // Stripe line item using validated amount (already in cents)
    const lineItems = [
      {
        price_data: {
          currency: (currency || property.currency || "sek").toLowerCase(),
          product_data: {
            name: `${property.title}`,
            description: `Check-in: ${checkInDate}, Check-out: ${checkOutDate} (${nightCount} nights)`,
          },
          unit_amount: Math.round(Number(validatedAmount)),
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
        propertyTitle: property.title,
        checkInDate,
        checkOutDate,
        numberOfGuests: numberOfGuests.toString(),
        guestName,
        guestEmail,
        guestPhone: guestPhone || "",
        specialRequests: specialRequests || "",
        userId: user?.id || "",
        currency: (currency || property.currency || "sek").toLowerCase(),
        totalAmount: validatedAmount.toString(),
        hostAmount: hostAmount.toString(),
        platformCommission: platformCommission.toString(),
        commissionRate: commissionRate.toString(),
        hostId: property.host_id,
      },
    };

    // Stripe Connect payout
    if (profileData?.stripe_connect_account_id) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: Math.round(Number(platformCommission)),
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
    // Log detailed error server-side
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-booking-payment-connect", { 
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return sanitized error to client
    return new Response(JSON.stringify({ 
      error: "Unable to create payment session. Please try again or contact support." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
