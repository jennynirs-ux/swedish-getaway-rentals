import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { clientIpFrom, processCheckoutSession } from "../_shared/process-checkout-session.ts";
import { alertAdminOnce } from "../_shared/alert.ts";

// Stripe calls this after Checkout, so bookings/orders are recorded even if the
// guest never returns to /booking-success (closed tab, lost connection, ...).
// Configure in Stripe: endpoint .../functions/v1/stripe-webhook with events
// checkout.session.completed, checkout.session.async_payment_succeeded and
// charge.refunded, and store its signing secret as STRIPE_WEBHOOK_SECRET.

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "charge.refunded",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[STRIPE-WEBHOOK] STRIPE_WEBHOOK_SECRET is not configured");
    // 500 makes Stripe retry, so no events are lost while the secret is being set up
    return json({ error: "Webhook not configured" }, 500);
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature ?? "",
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Signature verification failed:", error instanceof Error ? error.message : error);
    return json({ error: "Invalid signature" }, 400);
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return json({ received: true, ignored: event.type });
  }

  if (event.type === "charge.refunded") {
    return handleRefund(stripe, event.data.object as Stripe.Charge);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  console.log(`[STRIPE-WEBHOOK] ${event.type} for session ${session.id} (${session.payment_status})`);

  // Delayed payment methods complete later and send async_payment_succeeded
  if (session.payment_status !== "paid") {
    return json({ received: true, pending: session.payment_status });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const result = await processCheckoutSession(stripe, supabase, session.id, {
      ip: clientIpFrom(req),
      userAgent: req.headers.get("user-agent") || "stripe-webhook",
    });
    console.log("[STRIPE-WEBHOOK] Processed", result);
    return json({ received: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[STRIPE-WEBHOOK] Processing failed:", { sessionId: session.id, message });
    // The guest has paid but nothing was saved: a person must look (once per session)
    await alertAdminOnce(supabase, `payment-failed:${session.id}`, "Paid checkout could not be saved", [
      `Stripe session: ${session.id} (${session.metadata?.type ?? "unknown"})`,
      `Property: ${session.metadata?.propertyTitle ?? "-"}, ${session.metadata?.checkInDate ?? ""} to ${session.metadata?.checkOutDate ?? ""}`,
      `Error: ${message}`,
      "Stripe keeps retrying for 3 days. Fix the cause, or refund the payment in Stripe.",
    ]).catch((alertError) => console.error("[STRIPE-WEBHOOK] Alert failed:", alertError));
    // Non-2xx so Stripe retries with backoff
    return json({ error: "Processing failed" }, 500);
  }
});

// A refund made in the Stripe dashboard: record it on the booking, and if the
// whole payment went back, cancel the booking so its dates open up again.
// Refunds from the admin "Avboka & återbetala" flow carry metadata.source and
// are already recorded, so they only update the amount.
async function handleRefund(stripe: Stripe, charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return json({ received: true, ignored: "no payment intent" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, check_in_date, check_out_date, guest_name, refunded_amount, properties(title)")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!booking) return json({ received: true, ignored: "no booking for this payment" });

  const fullyRefunded = charge.refunded === true;
  const cancel = fullyRefunded && booking.status === "confirmed";
  const { error } = await supabase
    .from("bookings")
    .update({
      refunded_amount: charge.amount_refunded,
      ...(cancel ? { status: "cancelled", cancelled_at: new Date().toISOString() } : {}),
    })
    .eq("id", booking.id);
  if (error) {
    console.error("[STRIPE-WEBHOOK] Recording refund failed:", error.message);
    return json({ error: "Could not record refund" }, 500);
  }

  const { data: refunds } = await stripe.refunds.list({ charge: charge.id, limit: 1 });
  const fromAdmin = refunds.data[0]?.metadata?.source === "nordic-getaways-admin";
  if (!fromAdmin) {
    const title = (booking.properties as { title?: string } | null)?.title ?? "booking";
    await alertAdminOnce(supabase, `refund:${charge.id}:${charge.amount_refunded}`, "Refund made in Stripe", [
      `${title}, ${booking.check_in_date} to ${booking.check_out_date}, guest ${booking.guest_name}`,
      `Refunded so far: ${(charge.amount_refunded / 100).toLocaleString("sv-SE")} ${charge.currency.toUpperCase()}`,
      cancel
        ? "The whole payment is refunded, so the booking is now cancelled and its dates are open."
        : "Partial refund: the booking is still active. Cancel it in admin if the guest isn't coming.",
    ]).catch((alertError) => console.error("[STRIPE-WEBHOOK] Alert failed:", alertError));
  }

  return json({ received: true, refundRecorded: true, cancelled: cancel });
}
