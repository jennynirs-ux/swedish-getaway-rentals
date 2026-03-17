import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

/**
 * Create a Stripe Identity VerificationSession for guest ID checks.
 * Called before or during booking to verify the guest's identity.
 *
 * Stripe Identity docs: https://docs.stripe.com/identity
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { returnUrl } = await req.json();

    // Check if user already has a verified session
    const { data: profile } = await supabase
      .from("profiles")
      .select("identity_verified, identity_verification_id")
      .eq("id", user.id)
      .single();

    if (profile?.identity_verified) {
      return new Response(
        JSON.stringify({ alreadyVerified: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe Identity VerificationSession
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: user.id,
        user_email: user.email || "",
      },
      options: {
        document: {
          require_matching_selfie: true,
          allowed_types: ["driving_license", "passport", "id_card"],
        },
      },
      return_url: returnUrl || `${Deno.env.get("SITE_URL")}/profile?verified=true`,
    });

    // Store verification session ID on the profile
    await supabase
      .from("profiles")
      .update({
        identity_verification_id: verificationSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({
        sessionId: verificationSession.id,
        clientSecret: verificationSession.client_secret,
        url: verificationSession.url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating verification session:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create verification session" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
