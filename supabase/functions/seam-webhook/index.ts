import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Seam Webhook Handler
 * ---
 * Receives events from Seam when access code status changes on the physical lock.
 * Docs: https://docs.seam.co/latest/capability-guides/webhooks
 *
 * Configure in Seam Console → Webhooks → add this URL:
 *   https://<project>.supabase.co/functions/v1/seam-webhook
 *
 * Events we care about:
 *   - access_code.set_on_device       → code is active on the lock
 *   - access_code.removed_from_device → code removed from lock
 *   - access_code.failed_to_set_on_device → code push failed
 *   - access_code.deleted             → code deleted from Seam
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, seam-webhook-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify webhook token if configured
    const webhookSecret = Deno.env.get("SEAM_WEBHOOK_SECRET");
    if (webhookSecret) {
      const token = req.headers.get("seam-webhook-token");
      if (token !== webhookSecret) {
        console.error("Invalid webhook token");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const event = await req.json();
    console.log("Seam webhook event:", event.event_type, event.payload?.access_code_id);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const accessCodeId = event.payload?.access_code_id;
    if (!accessCodeId) {
      return new Response(JSON.stringify({ ok: true, skipped: "no access_code_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (event.event_type) {
      case "access_code.set_on_device": {
        // Code is now active on the physical lock
        await supabaseClient
          .from("lock_access_log")
          .update({
            status: "active",
            error_message: null,
          })
          .eq("seam_access_code_id", accessCodeId);

        console.log("Access code confirmed on device:", accessCodeId);
        break;
      }

      case "access_code.failed_to_set_on_device": {
        const errorMsg =
          event.payload?.error?.message || "Failed to program code on lock";

        await supabaseClient
          .from("lock_access_log")
          .update({
            status: "failed",
            error_message: errorMsg,
          })
          .eq("seam_access_code_id", accessCodeId);

        // Also update lock sync status
        const { data: logEntry } = await supabaseClient
          .from("lock_access_log")
          .select("yale_lock_id")
          .eq("seam_access_code_id", accessCodeId)
          .single();

        if (logEntry?.yale_lock_id) {
          await supabaseClient
            .from("yale_locks")
            .update({
              sync_status: "error",
              error_message: errorMsg,
              last_sync: new Date().toISOString(),
            })
            .eq("id", logEntry.yale_lock_id);
        }

        console.error("Access code failed on device:", accessCodeId, errorMsg);
        break;
      }

      case "access_code.removed_from_device":
      case "access_code.deleted": {
        await supabaseClient
          .from("lock_access_log")
          .update({
            status: "expired",
            revoked_at: new Date().toISOString(),
          })
          .eq("seam_access_code_id", accessCodeId)
          .eq("status", "active"); // Only update if still active

        console.log("Access code removed/deleted:", accessCodeId);
        break;
      }

      default:
        console.log("Unhandled Seam event:", event.event_type);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Seam webhook error:", error);
    // Return 200 to prevent Seam from retrying — log the error internally
    return new Response(JSON.stringify({ ok: false, error: "Internal error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
