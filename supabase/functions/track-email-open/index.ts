import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  // Return a 1x1 transparent GIF
  const gif = Uint8Array.from(
    atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
    (c) => c.charCodeAt(0)
  );

  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get("id");

    if (trackingId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Update the email tracking record
      const { error } = await supabase
        .from("booking_email_tracking")
        .update({
          opened_at: new Date().toISOString(),
          opened_count: supabase.raw("opened_count + 1"),
        })
        .eq("tracking_id", trackingId)
        .is("opened_at", null); // Only set opened_at on first open

      if (error) {
        console.error("Error updating email tracking:", error);
      } else {
        // Also increment count if already opened
        await supabase
          .from("booking_email_tracking")
          .update({
            opened_count: supabase.raw("opened_count + 1"),
          })
          .eq("tracking_id", trackingId)
          .not("opened_at", "is", null);
      }
    }
  } catch (error) {
    console.error("Error in track-email-open:", error);
  }

  // Always return the tracking pixel regardless of errors
  return new Response(gif, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
