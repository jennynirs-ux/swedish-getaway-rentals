import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId, userId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let hostName = "Unknown";
    let hostEmail = "N/A";
    let businessName = "N/A";
    let phone = "N/A";

    if (userId) {
      const { data: user } = await supabase.auth.admin.getUserById(userId);
      hostEmail = user?.user?.email || "N/A";
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, host_business_name")
        .eq("user_id", userId)
        .single();
      hostName = profile?.full_name || "Unknown";
      businessName = profile?.host_business_name || "N/A";
    } else if (applicationId) {
      const { data: app } = await supabase
        .from("host_applications")
        .select("*, profiles!inner(full_name, email)")
        .eq("id", applicationId)
        .single();
      hostName = app?.profiles?.full_name || "Unknown";
      hostEmail = app?.profiles?.email || "N/A";
      businessName = app?.business_name || "N/A";
      phone = app?.contact_phone || "N/A";
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendKey);
    const siteUrl = Deno.env.get("SITE_URL") || "";

    await resend.emails.send({
      from: "Nordic Getaways <support@mojjo.se>",
      to: ["support@mojjo.se"],
      subject: `🏠 New Host Signed Up: ${hostName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">New Host Registration</h2>
          <p>A new host just signed up and was auto-approved.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Name:</strong> ${hostName}</p>
            <p><strong>Email:</strong> ${hostEmail}</p>
            <p><strong>Business:</strong> ${businessName}</p>
            ${phone !== "N/A" ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
          </div>
          <p style="margin: 24px 0;">
            <a href="${siteUrl}/admin"
               style="background-color: #8b5e3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Admin
            </a>
          </p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("notify-new-host-application error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
