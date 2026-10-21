import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// A one-time login link to the host's own Stripe Express dashboard, where they
// see their balance, payouts (sent the day after check-in, or 85 days after
// the guest paid if that comes first) and bank details.
// Errors carry a readable { error } for BankAccountSetup to show.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // The caller's own token, so RLS limits the profile read to their own row
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return json({ error: "Please sign in again" }, 401);

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_connect_account_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) throw new Error(`Could not read your profile: ${profileError.message}`);
    if (!profile?.stripe_connect_account_id) {
      return json({ error: "Connect your bank account first" }, 404);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Stripe refuses login links until onboarding is finished; say what to do
    // instead of passing on its error
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);
    if (!account.details_submitted) {
      return json({ error: "Finish connecting your bank account with Stripe first (Connect bank account)" }, 409);
    }

    const loginLink = await stripe.accounts.createLoginLink(profile.stripe_connect_account_id);
    return json({ url: loginLink.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error creating dashboard link:", message);
    return json({ error: message }, 500);
  }
});
