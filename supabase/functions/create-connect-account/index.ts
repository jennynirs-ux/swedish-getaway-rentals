import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdminOnce } from "../_shared/alert.ts";
import { stockholmToday } from "../_shared/format.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://nordic-getaways.com";

// Prefilled so Stripe asks the host less. No business_type: some hosts rent
// out privately, others through their own company (AB), and Stripe asks.
const BUSINESS_PROFILE = {
  mcc: "6513", // Real estate agents and managers - rentals
  product_description: "Holiday home rentals booked through nordic-getaways.com",
  url: SITE_URL,
};

// Hosts are paid by release-host-payouts the day after check-in, or 85 days
// after the guest paid if that comes first, so Stripe must never pay out on
// its own schedule
const MANUAL_PAYOUTS = { payouts: { schedule: { interval: "manual" as const } } };

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
 *     (also saved as profiles.stripe_connect_ready, which publishing needs);
 *     also puts an existing account on manual payouts if it isn't
 *   otherwise → an onboarding link, creating the Express account (Sweden,
 *     manual payouts) on first use; the same link finishes an onboarding the
 *     host left halfway
 * Errors return Stripe's own message as { error } and alert support once a
 * day per host, since a host who can't connect can't publish.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Kept for the alert if something fails
  let userId: string | null = null;
  let profileId: string | null = null;

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user?.email) return json({ error: "User not authenticated" }, 401);
    userId = user.id;

    // Service role: profile updates bypass the privilege trigger
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_host, host_approved, stripe_connect_account_id, stripe_connect_ready")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw new Error(`Could not read your profile: ${profileError.message}`);
    if (!profile?.is_host || !profile.host_approved) return json({ error: "Only hosts can set up payouts" }, 403);
    profileId = profile.id;

    const body = await req.json().catch(() => ({}));
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    let accountId = profile.stripe_connect_account_id;

    if (body?.action === "status") {
      if (!accountId) return json({ hasAccount: false, ready: false });
      const account = await stripe.accounts.retrieve(accountId);
      if (account.settings?.payouts?.schedule?.interval !== "manual") {
        // Accounts made before payouts moved to our payout job. Not
        // fatal for the status check, but until it's fixed Stripe pays the
        // host before the stay, so support must know.
        try {
          await stripe.accounts.update(accountId, { settings: MANUAL_PAYOUTS });
        } catch (updateError) {
          const message = updateError instanceof Error ? updateError.message : String(updateError);
          console.error("Could not set manual payouts:", accountId, message);
          await alertAdminOnce(supabase, `connect-manual-payouts:${accountId}`, "Host account not on manual payouts", [
            `Stripe account ${accountId} (profile ${profile.id}) could not be switched to manual payouts: ${message}`,
            "Until it is, Stripe pays this host on its own schedule instead of on our payout job's dates (the day after check-in, or 85 days after the guest paid if that comes first). Set the payout schedule to manual in the Stripe dashboard.",
          ]).catch((alertError) => console.error("Alert failed:", alertError));
        }
      }
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
        // Rejected or disabled accounts (e.g. "rejected.other") can't be
        // fixed by waiting: the bank card tells the host to contact support
        disabledReason: account.requirements?.disabled_reason ?? null,
        pendingVerification: account.requirements?.pending_verification?.length ?? 0,
      });
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "SE",
        email: user.email,
        capabilities: { transfers: { requested: true } },
        business_profile: BUSINESS_PROFILE,
        settings: MANUAL_PAYOUTS,
        metadata: { profile_id: profile.id },
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
    // Stripe's own message tells the host (BankAccountSetup shows it) and us
    // far more than "Edge Function returned a non-2xx status code"
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating Connect account:", message);
    if (userId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await alertAdminOnce(supabase, `connect-error:${userId}:${stockholmToday()}`, "Host could not connect Stripe payouts", [
        `Host profile ${profileId ?? "(unknown)"}, user ${userId}`,
        `Error: ${message}`,
        "The host can't publish until payouts are connected.",
      ]).catch((alertError) => console.error("Alert failed:", alertError));
    }
    return json({ error: message }, 500);
  }
});
