import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { clientIpFrom, processCheckoutSession } from "../_shared/process-checkout-session.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const requestBody = JSON.parse(rawBody);
    const { session_id } = requestBody;
    
    if (!session_id) {
      console.error("Missing session ID in request");
      throw new Error("Session ID is required");
    }

    // Validate session ID format (Stripe session IDs start with cs_)
    if (!session_id.startsWith('cs_')) {
      console.error("Invalid session ID format:", session_id);
      throw new Error("Invalid session ID format");
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';
    console.log(`Payment success handler called from IP: ${clientIpFrom(req)}, Session: ${session_id}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const result = await processCheckoutSession(stripe, supabase, session_id, {
      ip: clientIpFrom(req),
      userAgent,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error handling payment success:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(JSON.stringify({ 
      error: "Unable to process payment confirmation. Please contact support if the issue persists." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});