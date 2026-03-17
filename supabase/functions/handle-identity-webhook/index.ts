import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@14.21.0";

/**
 * Handle Stripe Identity webhook events.
 * Updates profile.identity_verified when verification succeeds.
 *
 * Configure webhook in Stripe Dashboard:
 *   Events: identity.verification_session.verified, identity.verification_session.requires_input
 *   URL: https://<project>.supabase.co/functions/v1/handle-identity-webhook
 */

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    const webhookSecret = Deno.env.get("STRIPE_IDENTITY_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    console.log("Identity webhook event:", event.type);

    switch (event.type) {
      case "identity.verification_session.verified": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        const userId = session.metadata?.user_id;

        if (userId) {
          const { error } = await supabase
            .from("profiles")
            .update({
              identity_verified: true,
              identity_verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (error) {
            console.error("Error updating profile:", error);
          } else {
            console.log("Identity verified for user:", userId);
          }
        }
        break;
      }

      case "identity.verification_session.requires_input": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        const userId = session.metadata?.user_id;

        if (userId) {
          await supabase
            .from("profiles")
            .update({
              identity_verified: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          console.log("Identity verification needs input for user:", userId);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Identity webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook error" }), {
      headers: { "Content-Type": "application/json" },
      status: 200, // Return 200 to prevent retries
    });
  }
});
