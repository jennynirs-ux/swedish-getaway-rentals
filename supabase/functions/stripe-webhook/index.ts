import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { clientIpFrom, processCheckoutSession } from "../_shared/process-checkout-session.ts";

// Stripe calls this after Checkout, so bookings/orders are recorded even if the
// guest never returns to /booking-success (closed tab, lost connection, ...).
// Configure in Stripe: endpoint .../functions/v1/stripe-webhook with events
// checkout.session.completed + checkout.session.async_payment_succeeded,
// and store its signing secret as the STRIPE_WEBHOOK_SECRET function secret.

const HANDLED_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
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

  const session = event.data.object as Stripe.Checkout.Session;
  console.log(`[STRIPE-WEBHOOK] ${event.type} for session ${session.id} (${session.payment_status})`);

  // Delayed payment methods complete later and send async_payment_succeeded
  if (session.payment_status !== "paid") {
    return json({ received: true, pending: session.payment_status });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const result = await processCheckoutSession(stripe, supabase, session.id, {
      ip: clientIpFrom(req),
      userAgent: req.headers.get("user-agent") || "stripe-webhook",
    });
    console.log("[STRIPE-WEBHOOK] Processed", result);
    return json({ received: true, ...result });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Processing failed:", {
      sessionId: session.id,
      message: error instanceof Error ? error.message : String(error),
    });
    // Non-2xx so Stripe retries with backoff
    return json({ error: "Processing failed" }, 500);
  }
});
