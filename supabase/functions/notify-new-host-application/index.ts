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
    const { applicationId } = await req.json();
    if (!applicationId) throw new Error("applicationId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the application with applicant details
    const { data: application, error } = await supabase
      .from("host_applications")
      .select("*, profiles!inner(full_name, email)")
      .eq("id", applicationId)
      .single();

    if (error || !application) {
      throw new Error(`Application not found: ${error?.message}`);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendKey);
    const siteUrl = Deno.env.get("SITE_URL") || "";
    const applicantName = application.profiles?.full_name || "Unknown";
    const applicantEmail = application.profiles?.email || "No email";

    await resend.emails.send({
      from: "Nordic Getaways <support@mojjo.se>",
      to: ["support@mojjo.se"],
      subject: `🏠 New Host Application: ${applicantName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">New Host Application</h2>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Name:</strong> ${applicantName}</p>
            <p><strong>Email:</strong> ${applicantEmail}</p>
            <p><strong>Business:</strong> ${application.business_name || "N/A"}</p>
            <p><strong>Experience:</strong> ${application.experience || "N/A"}</p>
            <p><strong>Phone:</strong> ${application.contact_phone || "N/A"}</p>
            <p><strong>Submitted:</strong> ${new Date(application.submitted_at || application.created_at).toLocaleString("sv-SE")}</p>
          </div>
          <p style="margin: 24px 0;">
            <a href="${siteUrl}/admin"
               style="background-color: #8b5e3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Review in Admin Dashboard
            </a>
          </p>
          <p style="font-size: 12px; color: #9ca3af;">
            Go to Admin → Rentals → Hosts to approve or reject this application.
          </p>
        </div>
      `,
    });

    console.log(`Admin notified about new host application from ${applicantName}`);

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
