import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { processShopSession } from "../_shared/process-shop-session.ts";
import { clientIpFrom } from "../_shared/process-checkout-session.ts";

// Shop checkouts run on the shop Stripe account (STRIPE_SECRET_KEY_SHOP).
// Two callers, same work (whoever comes first creates the order):
// - that account's webhook (checkout.session.completed, signed with
//   STRIPE_WEBHOOK_SECRET_SHOP), so orders are saved even if the customer
//   never returns to the site;
// - the customer's /order-success page with { session_id }. The session is
//   always re-read from Stripe and must be paid, so the id alone proves nothing.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_SHOP") || "", { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  let sessionId: string | undefined;

  if (signature) {
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        Deno.env.get("STRIPE_WEBHOOK_SECRET_SHOP") ?? "",
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
    } catch (error) {
      console.error("[SHOP] Webhook signature verification failed:", error instanceof Error ? error.message : error);
      return json({ error: "Invalid signature" }, 400);
    }
    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
      return json({ received: true, ignored: event.type });
    }
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return json({ received: true, pending: session.payment_status });
    sessionId = session.id;
  } else {
    try {
      sessionId = JSON.parse(rawBody || "{}").session_id;
    } catch {
      // handled below
    }
    if (!sessionId?.startsWith("cs_")) return json({ error: "A checkout session id is required" }, 400);
  }

  try {
    const result = await processShopSession(stripe, supabase, sessionId!, {
      ip: clientIpFrom(req),
      userAgent: req.headers.get("user-agent") || (signature ? "stripe-webhook-shop" : "unknown"),
    });
    console.log("[SHOP] Processed", sessionId, result);
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SHOP] Processing failed:", { sessionId, message });
    // An unknown session id (not from this Stripe account)
    if ((error as { code?: string })?.code === "resource_missing") {
      return json({ error: "Checkout session not found" }, 404);
    }
    // Non-2xx so the webhook is retried (support was alerted if it was paid)
    return json({ error: "Order could not be processed" }, 500);
  }
});
