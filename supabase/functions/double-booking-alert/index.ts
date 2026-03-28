import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

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

    // Call the double-booking detection RPC
    const { data: conflicts, error } = await supabase.rpc("detect_double_bookings");

    if (error) throw new Error(`Detection failed: ${error.message}`);

    if (!conflicts || conflicts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, conflicts: [], message: "No double bookings detected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`ALERT: ${conflicts.length} double-booking conflict(s) detected`);

    // Send alert email
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const resend = new Resend(resendKey);

      const conflictRows = conflicts.map((c: {
        property_title: string;
        overlap_start: string;
        overlap_end: string;
        booking_a_id: string;
        booking_b_id: string;
      }) =>
        `<tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${c.property_title}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${c.overlap_start} → ${c.overlap_end}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;font-size:11px;">${c.booking_a_id}<br>${c.booking_b_id}</td>
        </tr>`
      ).join("");

      await resend.emails.send({
        from: "Nordic Getaways <support@mojjo.se>",
        to: ["support@mojjo.se"],
        subject: `⚠️ DOUBLE BOOKING ALERT: ${conflicts.length} conflict(s) detected`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#dc2626;">⚠️ Double Booking Alert</h2>
            <p>${conflicts.length} overlapping booking(s) detected. Immediate action required.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <thead>
                <tr style="background:#fef2f2;">
                  <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Property</th>
                  <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Overlap</th>
                  <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Booking IDs</th>
                </tr>
              </thead>
              <tbody>${conflictRows}</tbody>
            </table>
            <p>
              <a href="${Deno.env.get("SITE_URL") || ""}/admin"
                 style="background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
                Open Admin Dashboard
              </a>
            </p>
          </div>
        `,
      });

      console.log("Double-booking alert email sent to support@mojjo.se");
    }

    return new Response(
      JSON.stringify({ success: true, conflicts, alertSent: !!resendKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("double-booking-alert error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
