import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";
import { escapeHtml, getCallerUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

    // Only the new host themselves, right after signing up: the welcome mail
    // goes to the caller's own address, never to an id from the request
    const caller = await getCallerUser(req, supabase);
    if (!caller?.email) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, is_host")
      .eq("user_id", caller.id)
      .single();
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentSignups } = await supabase
      .from("host_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile?.id ?? "")
      .gte("submitted_at", since);
    if (!profile?.is_host || !recentSignups) {
      return new Response(JSON.stringify({ error: "No recent host signup" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hostName = escapeHtml(profile.full_name || "there");
    const hostEmail = caller.email;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendKey);
    const siteUrl = Deno.env.get("SITE_URL") || "https://nordic-getaways.com";

    await resend.emails.send({
      from: "Nordic Getaways <support@mojjo.se>",
      to: [hostEmail],
      subject: `Welcome to Nordic Getaways, ${hostName}! 🏠`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937;">Welcome, ${hostName}! 🎉</h1>
          <p>You're now a host on Nordic Getaways. Let's get your first property listed!</p>

          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <h3 style="color: #166534; margin-top: 0;">Get started in 3 steps:</h3>
            <ol style="color: #15803d; padding-left: 20px;">
              <li style="margin-bottom: 8px;"><strong>Add your property</strong> — Photos, description, amenities, and pricing</li>
              <li style="margin-bottom: 8px;"><strong>Connect your bank</strong> — Set up Stripe for automatic payouts</li>
              <li style="margin-bottom: 8px;"><strong>Go live</strong> — Publish and start receiving bookings!</li>
            </ol>
          </div>

          <p style="margin: 24px 0;">
            <a href="${siteUrl}/host-dashboard"
               style="background-color: #8b5e3c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
              Open Your Dashboard →
            </a>
          </p>

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #4b5563;">
              <strong>How pricing works:</strong> You set the nightly rate. We add a 10% service fee for guests — you always receive exactly what you set. Need help? Email support@mojjo.se.
            </p>
          </div>

          <p>Welcome aboard!<br><strong>The Nordic Getaways Team</strong></p>
        </div>
      `,
    });

    console.log(`Welcome email sent to new host: ${hostEmail}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("notify-host-approved error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
