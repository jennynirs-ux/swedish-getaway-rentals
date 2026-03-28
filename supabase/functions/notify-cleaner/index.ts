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
    const { cleaningTaskId } = await req.json();
    if (!cleaningTaskId) throw new Error("cleaningTaskId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch cleaning task with property details
    const { data: task, error: taskError } = await supabase
      .from("cleaning_tasks")
      .select("*, properties(title, location, check_out_time)")
      .eq("id", cleaningTaskId)
      .single();

    if (taskError || !task) {
      throw new Error(`Cleaning task not found: ${taskError?.message}`);
    }

    if (!task.cleaner_email) {
      throw new Error("No cleaner email set for this task. Assign a cleaner first.");
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const resend = new Resend(resendKey);
    const siteUrl = Deno.env.get("SITE_URL") || "";
    const completionUrl = `${siteUrl}/cleaning/complete/${task.completion_token}`;
    const property = task.properties;
    const checkOutTime = property?.check_out_time || "11:00";

    const { error: emailError } = await resend.emails.send({
      from: "Nordic Getaways <support@mojjo.se>",
      to: [task.cleaner_email],
      subject: `Cleaning task: ${property?.title || "Property"} on ${task.scheduled_date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Cleaning Task Assigned</h2>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Property:</strong> ${property?.title || "N/A"}</p>
            <p><strong>Location:</strong> ${property?.location || "N/A"}</p>
            <p><strong>Date:</strong> ${task.scheduled_date}</p>
            <p><strong>Checkout time:</strong> ${checkOutTime}</p>
            ${task.notes ? `<p><strong>Notes:</strong> ${task.notes}</p>` : ""}
          </div>
          <p>When you've finished cleaning, click the button below to mark it as complete:</p>
          <p style="margin: 24px 0;">
            <a href="${completionUrl}"
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              ✓ Mark as Complete
            </a>
          </p>
          <p style="font-size: 12px; color: #9ca3af;">
            This is an automated message from Nordic Getaways.
          </p>
        </div>
      `,
    });

    if (emailError) throw new Error(`Email send failed: ${emailError.message}`);

    // Update task status to 'notified'
    await supabase
      .from("cleaning_tasks")
      .update({ status: "notified" })
      .eq("id", cleaningTaskId);

    console.log(`Cleaner notified for task ${cleaningTaskId}: ${task.cleaner_email}`);

    return new Response(
      JSON.stringify({ success: true, sentTo: task.cleaner_email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("notify-cleaner error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
