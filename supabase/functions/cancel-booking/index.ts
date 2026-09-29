import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { escapeHtml, isAdminOrService } from "../_shared/auth.ts";
import { sendEmail, SUPPORT_EMAIL } from "../_shared/alert.ts";
import { daysBeforeArrival, loadCancellationPolicy, policySummary, refundPercentage } from "../_shared/cancellation.ts";
import { longDate } from "../_shared/format.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Admin "Avboka & återbetala". With { preview: true } it only reports what the
// policy gives; otherwise it refunds in Stripe (reversing any Connect payout
// and service fee in proportion), cancels the booking, which releases the
// dates, and e-mails the guest. refundPercentage overrides the policy (e.g. 100
// as a goodwill gesture).
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  if (!(await isAdminOrService(req, supabase))) {
    return json({ error: "Forbidden" }, 403);
  }

  try {
    const { bookingId, preview = false, refundPercentage: override } = await req.json();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, status, total_amount, refunded_amount, currency, check_in_date, check_out_date, guest_name, guest_email, stripe_payment_intent_id, properties(title)")
      .eq("id", bookingId)
      .maybeSingle();
    if (error) throw error;
    if (!booking) return json({ error: "Booking not found" }, 404);
    if (booking.status !== "confirmed") return json({ error: "Only confirmed bookings can be cancelled here" }, 400);

    const policy = await loadCancellationPolicy(supabase);
    const days = daysBeforeArrival(booking.check_in_date);
    const policyPercentage = refundPercentage(policy, days);
    const percentage = typeof override === "number" && override >= 0 && override <= 100 ? override : policyPercentage;
    const alreadyRefunded = booking.refunded_amount ?? 0;
    const refundAmount = Math.max(0, Math.round((booking.total_amount * percentage) / 100) - alreadyRefunded);
    const hasPayment = !!booking.stripe_payment_intent_id;

    if (preview) {
      return json({ daysBeforeArrival: days, policyPercentage, refundPercentage: percentage, refundAmount, currency: booking.currency, hasPayment });
    }

    if (refundAmount > 0) {
      if (!hasPayment) return json({ error: "No card payment to refund (not booked on the site)" }, 400);
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
      const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id!);
      await stripe.refunds.create(
        {
          payment_intent: paymentIntent.id,
          amount: refundAmount,
          reason: "requested_by_customer",
          // The webhook recognises refunds made here and doesn't alert about them
          metadata: { source: "nordic-getaways-admin", bookingId: booking.id },
          ...(paymentIntent.transfer_data ? { reverse_transfer: true, refund_application_fee: true } : {}),
        },
        { idempotencyKey: `cancel-${booking.id}-${alreadyRefunded + refundAmount}` },
      );
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), refunded_amount: alreadyRefunded + refundAmount })
      .eq("id", booking.id);
    if (updateError) throw updateError;

    const title = (booking.properties as { title?: string } | null)?.title ?? "your cabin";
    const amountText = `${(refundAmount / 100).toLocaleString("sv-SE")} ${(booking.currency || "SEK").toUpperCase()}`;
    await sendEmail(
      booking.guest_email,
      `Your booking is cancelled – ${title}`,
      `<p>Hi ${escapeHtml(booking.guest_name)},</p>
       <p>Your booking of ${escapeHtml(title)}, ${longDate(booking.check_in_date)} to ${longDate(booking.check_out_date)}, is cancelled.</p>
       <p>${refundAmount > 0
         ? `We have refunded ${amountText} (${percentage}% of what you paid). It usually shows on your card within 5–10 business days.`
         : "Under our cancellation policy this cancellation is not refunded."}</p>
       <p>Our policy: ${escapeHtml(policySummary(policy))}.</p>
       <p>Questions? Reply to this e-mail or write to ${SUPPORT_EMAIL}.</p>
       <p>Jenny &amp; Jon, Nordic Getaways</p>`,
    );

    return json({ cancelled: true, refundPercentage: percentage, refundAmount });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CANCEL-BOOKING]", message);
    return json({ error: message }, 500);
  }
});
