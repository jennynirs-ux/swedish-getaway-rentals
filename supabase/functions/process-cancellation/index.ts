/**
 * BL-006: Process booking cancellation and issue Stripe refund.
 *
 * Expects POST with JSON body:
 *   { bookingId: string }
 *
 * Flow:
 *   1. Verify authenticated user owns the booking
 *   2. Fetch booking + property cancellation policy
 *   3. Calculate refund based on policy and timing
 *   4. Issue Stripe refund (partial or full)
 *   5. Update booking status to "cancelled"
 *   6. Return refund details
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Policy refund rules (mirrors client-side refundCalculator.ts)
type CancellationPolicy = "flexible" | "moderate" | "strict";

const POLICY_RULES: Record<CancellationPolicy, Array<{ minDays: number; refund: number }>> = {
  flexible: [
    { minDays: 1, refund: 100 },
    { minDays: 0, refund: 0 },
  ],
  moderate: [
    { minDays: 5, refund: 100 },
    { minDays: 1, refund: 50 },
    { minDays: 0, refund: 0 },
  ],
  strict: [
    { minDays: 7, refund: 50 },
    { minDays: 0, refund: 0 },
  ],
};

function calculateRefundPercentage(policy: CancellationPolicy, checkInDate: string): number {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(15, 0, 0, 0);
  const now = new Date();
  const daysBeforeCheckIn = Math.floor((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysBeforeCheckIn < 0) return 0;

  const rules = POLICY_RULES[policy] || POLICY_RULES.moderate;
  for (const rule of rules) {
    if (daysBeforeCheckIn >= rule.minDays) return rule.refund;
  }
  return 0;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ error: "bookingId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch booking - user must own it
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, property_id, user_id, check_in_date, total_amount, currency, status, stripe_payment_intent_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not your booking" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Already cancelled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch property cancellation policy
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: property } = await serviceClient
      .from("properties")
      .select("cancellation_policy, title")
      .eq("id", booking.property_id)
      .single();

    const policy = (property?.cancellation_policy || "moderate") as CancellationPolicy;
    const refundPercentage = calculateRefundPercentage(policy, booking.check_in_date);
    const refundAmountCents = Math.round(booking.total_amount * (refundPercentage / 100));

    // Process Stripe refund if applicable
    let stripeRefundId: string | null = null;

    if (refundAmountCents > 0 && booking.stripe_payment_intent_id) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2023-10-16",
      });

      const refund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
        metadata: {
          booking_id: bookingId,
          policy,
          refund_percentage: refundPercentage.toString(),
        },
      });

      stripeRefundId = refund.id;
    }

    // Update booking status
    const { error: updateError } = await serviceClient
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking status:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundPercentage,
        refundAmount: refundAmountCents,
        currency: booking.currency,
        stripeRefundId,
        policy,
        propertyTitle: property?.title,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Cancellation error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to process cancellation" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
