import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      currency,
      couponId
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
    
    // BUG-038: Validate minimum guest count is at least 1
    if (numberOfGuests < 1 || numberOfGuests > 50) {
      return new Response(JSON.stringify({ error: 'Number of guests must be at least 1 and at most 50' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
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

    logStep("Request data validated", { propertyId, checkInDate, checkOutDate, numberOfGuests, couponId });

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

    // CRITICAL BUG-001: Check for conflicting bookings and create reservation lock
    // Pattern: Check for existing bookings, then immediately insert a 'pending' booking
    // to prevent race condition where another booking sneaks in between check and confirmation
    const { data: existingBookings, error: bookingCheckError } = await supabaseClient
      .from("bookings")
      .select("id, status, check_in_date, check_out_date")
      .eq("property_id", propertyId)
      .in("status", ["confirmed", "pending"])
      .gte("check_out_date", checkInDate)
      .lt("check_in_date", checkOutDate);

    if (bookingCheckError) {
      logStep("Error checking booking conflicts", { error: bookingCheckError });
      return new Response(JSON.stringify({ error: "Unable to verify availability. Please try again." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (existingBookings && existingBookings.length > 0) {
      logStep("Booking conflict detected", { propertyId, checkInDate, checkOutDate, conflictCount: existingBookings.length });
      return new Response(JSON.stringify({ error: "These dates are no longer available. Please select different dates." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    // Insert a temporary 'pending' booking to act as a reservation lock
    // This prevents other concurrent requests from booking the same dates
    // If payment fails, this pending record will be cleaned up by a separate process
    const { data: reservationLock, error: lockError } = await supabaseClient
      .from("bookings")
      .insert({
        property_id: propertyId,
        user_id: user?.id || null,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone || null,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        number_of_guests: numberOfGuests,
        special_requests: specialRequests || null,
        total_amount: 0, // Will be updated after payment confirmation
        currency: (property.currency || currency || "SEK").toUpperCase(),
        status: 'payment_pending', // Temporary status indicating payment in progress
        stripe_payment_intent_id: null
      })
      .select()
      .single();

    if (lockError) {
      logStep("Error creating reservation lock", { error: lockError });
      return new Response(JSON.stringify({ error: "Unable to reserve dates. Please try again." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const reservationLockId = reservationLock.id;
    logStep("Reservation lock created", { reservationLockId, checkInDate, checkOutDate });

    // CRITICAL: Recalculate total amount server-side - never trust client-supplied amounts
    const nightCount = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    // price_per_night is stored in SEK in the database, convert to cents
    const pricePerNightCents = property.price_per_night * 100;
    
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
    let accommodationTotal = pricePerNightCents * nightCount;
    
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
    
    const subtotal = accommodationTotal + cleaningTotal + extraGuestTotal;
    
    logStep("Price calculation", {
      nightCount,
      accommodationTotal,
      cleaningTotal,
      extraGuestTotal,
      subtotal
    });
    
    // Validate and apply coupon discount if provided
    let discountAmount = 0;
    let validatedCoupon = null;
    
    if (couponId) {
      // Validate coupon via RPC
      const { data: couponValidation, error: couponError } = await supabaseClient.rpc('validate_coupon', {
        coupon_code: '', // We have the ID, so we fetch directly
        property_id_param: propertyId,
        booking_amount: subtotal,
        user_id_param: user?.id || null
      });
      
      // Fetch coupon directly by ID to validate
      const { data: coupon, error: fetchError } = await supabaseClient
        .from('coupons')
        .select('*')
        .eq('id', couponId)
        .eq('is_active', true)
        .single();
      
      if (fetchError || !coupon) {
        logStep("Coupon not found or inactive", { couponId, error: fetchError });
        return new Response(JSON.stringify({ error: "Invalid or expired coupon" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      // Validate coupon is still valid
      const now = new Date();
      const validUntil = new Date(coupon.valid_until);
      const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
      
      if (validUntil < now) {
        logStep("Coupon expired", { couponId, validUntil });
        return new Response(JSON.stringify({ error: "Coupon has expired" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      if (validFrom && validFrom > now) {
        logStep("Coupon not yet valid", { couponId, validFrom });
        return new Response(JSON.stringify({ error: "Coupon is not yet valid" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      // Check if coupon applies to bookings
      const validApplicableTo = ['all', 'bookings', 'both'];
      if (!validApplicableTo.includes(coupon.applicable_to)) {
        logStep("Coupon not applicable to bookings", { couponId, applicableTo: coupon.applicable_to });
        return new Response(JSON.stringify({ error: "Coupon is not valid for bookings" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      // Check property restriction
      if (coupon.property_id && coupon.property_id !== propertyId) {
        logStep("Coupon not valid for this property", { couponId, couponPropertyId: coupon.property_id, propertyId });
        return new Response(JSON.stringify({ error: "Coupon is not valid for this property" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      // Check usage limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        logStep("Coupon usage limit reached", { couponId, usageLimit: coupon.usage_limit, usedCount: coupon.used_count });
        return new Response(JSON.stringify({ error: "Coupon usage limit has been reached" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      // Check minimum amount
      if (coupon.minimum_amount && subtotal < coupon.minimum_amount) {
        logStep("Minimum amount not met", { couponId, minimumAmount: coupon.minimum_amount, subtotal });
        return new Response(JSON.stringify({ error: `Minimum booking amount of ${coupon.minimum_amount / 100} required for this coupon` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      // Calculate discount
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round(subtotal * (coupon.discount_value / 100));
        // Apply maximum discount cap if set
        if (coupon.maximum_discount_amount && discountAmount > coupon.maximum_discount_amount) {
          discountAmount = coupon.maximum_discount_amount;
        }
      } else {
        // Fixed amount discount (stored in cents)
        discountAmount = coupon.discount_value;
      }
      
      // Ensure discount doesn't exceed subtotal
      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }
      
      validatedCoupon = coupon;
      logStep("Coupon validated and applied", { 
        couponId, 
        couponCode: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountAmount 
      });
    }
    
    const serverCalculatedAmount = subtotal - discountAmount;
    
    logStep("Final amount calculation", {
      subtotal,
      discountAmount,
      serverCalculatedAmount
    });
    
    // BUG-009: Stricter amount verification with 0.1% tolerance instead of 1% to prevent manipulation
    // on large bookings, and never leak server-calculated amount in error response
    const amountDifference = Math.abs(totalAmount - serverCalculatedAmount);
    const tolerance = serverCalculatedAmount * 0.001; // 0.1% instead of 1%

    if (amountDifference > tolerance) {
      logStep("Amount mismatch detected", {
        clientAmount: totalAmount,
        serverAmount: serverCalculatedAmount,
        difference: amountDifference
      });
      // Do NOT return serverCalculatedAmount to prevent information leakage
      return new Response(JSON.stringify({
        error: "Price mismatch, please refresh and try again."
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

    // Build product description
    let productDescription = `Check-in: ${checkInDate}, Check-out: ${checkOutDate} (${nightCount} nights)`;
    if (validatedCoupon) {
      productDescription += ` | Coupon: ${validatedCoupon.code} (-${discountAmount / 100} ${currency || property.currency || 'SEK'})`;
    }

    // Stripe line item using validated amount (already in cents)
    // BUG-037: Use SEK as default currency, prefer property.currency over client-provided currency
    const finalCurrency = (property.currency || currency || "sek").toLowerCase();
    const lineItems = [
      {
        price_data: {
          currency: finalCurrency,
          product_data: {
            name: `${property.title}`,
            description: productDescription,
          },
          unit_amount: Math.round(Number(validatedAmount)),
        },
        quantity: 1,
      },
    ];

    // Calculate VAT amount for audit trail (typically 25% in Sweden)
    const vatRate = 0.25; // Swedish VAT rate
    const vatAmount = Math.ceil(validatedAmount * vatRate);

    // Stripe checkout session config
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, '') || Deno.env.get("SITE_URL") || "";
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : guestEmail,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/property/${propertyId}`,
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
        currency: finalCurrency,
        totalAmount: validatedAmount.toString(),
        subtotal: subtotal.toString(),
        discountAmount: discountAmount.toString(),
        vatAmount: vatAmount.toString(),
        couponId: validatedCoupon?.id || "",
        couponCode: validatedCoupon?.code || "",
        reservationLockId: reservationLockId,
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
