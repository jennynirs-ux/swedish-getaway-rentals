import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://nordic-getaways.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Stripe sends the host back here; only our own site (or a local dev server)
const safeReturnUrl = (url: unknown) => {
  if (typeof url !== "string") return `${SITE_URL}/host-dashboard`;
  try {
    const u = new URL(url);
    const ok = u.origin === SITE_URL || u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return ok ? u.toString() : `${SITE_URL}/host-dashboard`;
  } catch {
    return `${SITE_URL}/host-dashboard`;
  }
};

/**
 * A host's Stripe Connect payouts.
 *   { action: "status" } → whether the account can receive transfers yet
 *     (also saved as profiles.stripe_connect_ready, which publishing needs)
 *   otherwise → an onboarding link, creating the Express account on first use;
 *     the same link finishes an onboarding the host left halfway
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.email) return json({ error: "User not authenticated" }, 401);

    // Service role: profile updates bypass the privilege trigger
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_host, host_approved, stripe_connect_account_id, stripe_connect_ready")
      .eq("user_id", user.id)
      .single();
    if (!profile?.is_host || !profile.host_approved) return json({ error: "Only hosts can set up payouts" }, 403);

    const body = await req.json().catch(() => ({}));
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    let accountId = profile.stripe_connect_account_id;

    if (body?.action === "status") {
      if (!accountId) return json({ hasAccount: false, ready: false });
      const account = await stripe.accounts.retrieve(accountId);
      const ready = !!account.details_submitted && account.capabilities?.transfers === "active";
      if (ready !== profile.stripe_connect_ready) {
        await supabase.from("profiles").update({ stripe_connect_ready: ready }).eq("id", profile.id);
      }
      return json({
        hasAccount: true,
        ready,
        detailsSubmitted: !!account.details_submitted,
        payoutsEnabled: !!account.payouts_enabled,
        requirementsDue: account.requirements?.currently_due?.length ?? 0,
      });
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;

      // If this fails we must stop: otherwise every click creates another
      // orphaned Stripe account and the host is never paid
      const { error: saveError } = await supabase
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", profile.id);
      if (saveError) throw new Error(`Could not save Stripe account ${accountId}: ${saveError.message}`);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: safeReturnUrl(body?.refreshUrl),
      return_url: safeReturnUrl(body?.returnUrl),
      type: "account_onboarding",
    });
    return json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creating Connect account:", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
