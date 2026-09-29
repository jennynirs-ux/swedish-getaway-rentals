import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Retired: this endpoint charged whatever amount the browser sent and skipped
// the availability and house-rule checks. Bookings go through
// create-booking-payment-connect.
serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({ error: "This booking endpoint has been retired. Please refresh the page and try again." }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 410 },
  );
});
