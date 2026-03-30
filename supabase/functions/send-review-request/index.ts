import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

/**
 * Sends a review request email to guests 1 day after checkout.
 * Called by a cron job (pg_cron) daily.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") || "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");
    const resend = new Resend(resendKey);

    const siteUrl = Deno.env.get("SITE_URL") || "";

    // Find bookings that checked out yesterday and haven't been sent a review request
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, guest_name, guest_email, property_id, check_out_date, properties(title, id)")
      .eq("check_out_date", yesterdayStr)
      .eq("status", "confirmed")
      .is("review_request_sent_at", null);

    if (error) throw error;

    let sent = 0;
    let failed = 0;

    for (const booking of bookings || []) {
      if (!booking.guest_email) continue;

      const property = booking.properties as { title: string; id: string } | null;
      const propertyTitle = property?.title || "your stay";
      const guestbookUrl = `${siteUrl}/property/${property?.id}/guestbook`;

      try {
        await resend.emails.send({
          from: "Nordic Getaways <support@mojjo.se>",
          to: [booking.guest_email],
          subject: `How was your stay at ${propertyTitle}? 🌿`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Thank you for staying with us, ${booking.guest_name || "Guest"}!</h2>
              <p>We hope you had a wonderful time at <strong>${propertyTitle}</strong>.</p>
              <p>Your feedback helps future guests and means the world to our hosts. Would you take a minute to share your experience?</p>
              <p style="margin: 24px 0;">
                <a href="${guestbookUrl}"
                   style="background-color: #8b5e3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Share Your Experience 🌿
                </a>
              </p>
              <p style="color: #6b7280; font-size: 14px;">
                You can also leave a review on the platform where you booked.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="font-size: 12px; color: #9ca3af;">
                This is an automated message from Nordic Getaways.
                If you need assistance, contact us at support@mojjo.se.
              </p>
            </div>
          `,
        });

        // Mark as sent
        await supabase
          .from("bookings")
          .update({ review_request_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        sent++;
      } catch (emailErr) {
        console.error(`Failed to send review request for booking ${booking.id}:`, emailErr);
        failed++;
      }
    }

    console.log(`Review requests: ${sent} sent, ${failed} failed, ${(bookings || []).length} eligible`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, eligible: (bookings || []).length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("send-review-request error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
