import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") || "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEAM_API_BASE = "https://connect.getseam.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { logId } = await req.json();
    if (!logId) {
      return new Response(JSON.stringify({ error: "logId required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the access log entry with lock info
    const { data: logEntry, error: logError } = await supabaseClient
      .from("lock_access_log")
      .select("*, yale_locks!inner(id, property_id, api_credentials)")
      .eq("id", logId)
      .single();

    if (logError || !logEntry) {
      return new Response(JSON.stringify({ error: "Access code not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // If we have a Seam access code ID, delete it from the physical lock
    if (logEntry.seam_access_code_id) {
      const seamApiKey =
        Deno.env.get("SEAM_API_KEY") ??
        (logEntry.yale_locks?.api_credentials
          ? atob(logEntry.yale_locks.api_credentials)
          : "");

      if (seamApiKey) {
        const res = await fetch(`${SEAM_API_BASE}/access_codes/delete`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${seamApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            access_code_id: logEntry.seam_access_code_id,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error(`Seam delete failed ${res.status}: ${body}`);
          // Continue — still revoke in our DB even if Seam call fails
        } else {
          console.log("Seam access code deleted:", logEntry.seam_access_code_id);
        }
      }
    }

    // Update our database
    const { error: updateError } = await supabaseClient
      .from("lock_access_log")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq("id", logId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in revoke-access-code:", error);
    return new Response(
      JSON.stringify({ error: "Failed to revoke access code" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
