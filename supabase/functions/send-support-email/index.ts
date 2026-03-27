import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") || "",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SupportEmailRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

/** Escape HTML to prevent XSS in email bodies */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 3 emails per minute per user/IP
    const rateLimitResponse = await enforceRateLimit(req, "email", corsHeaders);
    if (rateLimitResponse) return rateLimitResponse;

    const { name, email, phone, subject, message }: SupportEmailRequest = await req.json();

    console.log("Sending support email:", { name, email, subject });

    // Escape all user inputs to prevent HTML injection in emails
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = phone ? escapeHtml(phone) : '';
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    // Send email to support
    const emailResponse = await resend.emails.send({
      from: "Nordic Getaways <support@mojjo.se>",
      to: ["support@mojjo.se"],
      replyTo: email,
      subject: `Support Request: ${safeSubject}`,
      html: `
        <h2>New Support Request</h2>
        <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
        ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <h3>Message:</h3>
        <p>${safeMessage}</p>
        <hr />
        <p><small>This message was sent via the Nordic Getaways contact form.</small></p>
      `,
    });

    console.log("Support email sent successfully:", emailResponse);

    // Send confirmation to user
    await resend.emails.send({
      from: "Nordic Getaways <support@mojjo.se>",
      to: [email],
      subject: "We received your message",
      html: `
        <h1>Thank you for contacting us, ${safeName}!</h1>
        <p>We have received your message and will get back to you as soon as possible at <strong>${safeEmail}</strong>.</p>
        <p>Your message:</p>
        <blockquote style="border-left: 3px solid #ccc; padding-left: 15px; color: #666;">
          ${safeMessage}
        </blockquote>
        <p>Best regards,<br>The Nordic Getaways Team</p>
        <hr />
        <p style="font-size: 12px; color: #999;">
          If you need urgent assistance, please contact us at support@mojjo.se
        </p>
      `,
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-support-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
