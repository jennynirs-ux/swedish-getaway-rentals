import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { processCheckoutSession } from "../_shared/process-checkout-session.ts";
import { alertAdminOnce } from "../_shared/alert.ts";
import { isAdminOrService } from "../_shared/auth.ts";
import { stockholmToday } from "../_shared/format.ts";

// Safety net for paid bookings that were never saved: the guest closed the tab
// and the webhook failed or never arrived. Lists the paid booking Checkout
// sessions of the last 72 hours in Stripe and saves each one that has no
// booking through the same locked save path as the webhook and the redirect
// (which alerts support@mojjo.se if saving fails). Meant to run hourly.
//
// Takes no input and only saves what Stripe itself reports as paid, and the
// save path claims each session once, so running it twice is harmless.
// Callers without the service role key get one run per 10 minutes.

const LOOKBACK_SECONDS = 72 * 60 * 60;
// Far more than a few days of bookings; bounds the run if something is odd
const MAX_SESSIONS = 1000;
// Called without the service role key (the cron's anon key, or anyone with
// it): at most one run per window. Each run lists up to 10 pages of sessions,
// so a loop of calls could otherwise use up the Stripe rate limit that real
// checkouts need.
const PUBLIC_RUN_WINDOW_MS = 10 * 60 * 1000;

/** One run per window for callers without the service role key (check-then-insert; overlapping runs are safe anyway) */
async function claimPublicRun(supabase: SupabaseClient): Promise<boolean> {
  const key = `reconcile-payments-run:${Math.floor(Date.now() / PUBLIC_RUN_WINDOW_MS)}`;
  const { count } = await supabase
    .from("security_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "job_run")
    .eq("user_agent", key);
  if (count) return false;
  await supabase.from("security_audit_log").insert({ action: "job_run", table_name: "processed_sessions", user_agent: key });
  return true;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  if (!(await isAdminOrService(req, supabase)) && !(await claimPublicRun(supabase))) {
    return json({ ok: true, skipped: "ran recently" });
  }

  try {
    const since = Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS;
    const sessions: Stripe.Checkout.Session[] = await stripe.checkout.sessions
      .list({ created: { gte: since }, status: "complete", limit: 100 })
      .autoPagingToArray({ limit: MAX_SESSIONS });
    const paid = sessions.filter((s) => s.payment_status === "paid" && s.metadata?.type === "booking");

    const paymentIntentIds = paid
      .map((s) => (typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id))
      .filter((id): id is string => !!id);
    const sessionIds = paid.map((s) => s.id);

    const [{ data: bookings, error: bookingsError }, { data: claims, error: claimsError }] = await Promise.all([
      paymentIntentIds.length
        ? supabase.from("bookings").select("stripe_payment_intent_id").in("stripe_payment_intent_id", paymentIntentIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? supabase.from("processed_sessions").select("session_id, session_type").in("session_id", sessionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (bookingsError || claimsError) throw bookingsError ?? claimsError;

    const saved = new Set((bookings ?? []).map((b: { stripe_payment_intent_id: string }) => b.stripe_payment_intent_id));
    // Refunded instead of saved (dates taken, or refunded by hand): done
    const settled = new Set(
      (claims ?? [])
        .filter((c: { session_type: string }) => c.session_type.startsWith("booking_refunded"))
        .map((c: { session_id: string }) => c.session_id),
    );
    const missing = paid.filter((s) => {
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      return !(pi && saved.has(pi)) && !settled.has(s.id);
    });

    const outcome = { checked: paid.length, missing: missing.length, saved: 0, refunded: 0, inProgress: 0, failed: 0 };
    for (const session of missing) {
      try {
        const result = await processCheckoutSession(stripe, supabase, session.id, {
          ip: null,
          userAgent: "reconcile-payments",
        });
        if (result.success) outcome.saved++;
        else if (result.message === "processing") outcome.inProgress++;
        else outcome.refunded++;
        console.log("[RECONCILE-PAYMENTS] Session", session.id, result);
      } catch (error) {
        // processCheckoutSession has already alerted for this session
        outcome.failed++;
        console.error("[RECONCILE-PAYMENTS] Saving failed:", session.id, error instanceof Error ? error.message : error);
      }
    }

    console.log("[RECONCILE-PAYMENTS]", outcome);
    return json({ ok: outcome.failed === 0, ...outcome });
  } catch (error) {
    // Could not even compare Stripe with the bookings: at most one e-mail a day
    const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error);
    console.error("[RECONCILE-PAYMENTS] Failed:", message);
    await alertAdminOnce(supabase, `reconcile-failed:${stockholmToday()}`, "Payment check could not run", [
      `reconcile-payments compares paid Stripe checkouts with bookings every hour. It failed: ${message}`,
      "Until it runs again, check Stripe payments against the bookings in admin by hand.",
    ]).catch((alertError) => console.error("[RECONCILE-PAYMENTS] Alert failed:", alertError));
    return json({ ok: false, error: "Reconcile failed" }, 500);
  }
});
