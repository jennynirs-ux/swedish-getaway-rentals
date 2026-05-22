import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SupportEmailRequest = await req.json();

    // Validate + sanitize
    const escapeHtml = (s: string) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    const name = (body.name || "").trim().slice(0, 100);
    const email = (body.email || "").trim().slice(0, 255);
    const phone = (body.phone || "").trim().slice(0, 50);
    const subject = (body.subject || "").trim().slice(0, 200);
    const message = (body.message || "").trim().slice(0, 2000);

    if (name.length < 2 || !emailRegex.test(email) || subject.length < 2 || message.length < 5) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeSubject = escapeHtml(subject);
    const safeMessageHtml = escapeHtml(message).replace(/\n/g, "<br>");

    console.log("Sending support email:", { name, email, subject });

    const emailResponse = await resend.emails.send({
      from: "Nordic Getaways <support@mojjo.se>",
      to: ["support@mojjo.se"],
      replyTo: email,
      subject: `Support Request: ${subject}`,
      html: `
        <h2>New Support Request</h2>
        <p><strong>From:</strong> ${safeName} (${safeEmail})</p>
        ${phone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ''}
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <hr />
        <h3>Message:</h3>
        <p>${safeMessageHtml}</p>
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
          ${safeMessageHtml}
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
