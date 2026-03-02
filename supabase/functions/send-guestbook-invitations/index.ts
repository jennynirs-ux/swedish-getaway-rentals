import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting guestbook invitation send process");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Find bookings that checked out yesterday and haven't received guestbook invitation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(yesterday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select(`
        id,
        property_id,
        guest_name,
        guest_email,
        check_in_date,
        check_out_date,
        properties (
          id,
          title,
          hero_image_url
        )
      `)
      .eq("status", "confirmed")
      .gte("check_out_date", yesterday.toISOString().split('T')[0])
      .lt("check_out_date", tomorrow.toISOString().split('T')[0]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      console.log("No bookings found for guestbook invitations");
      return new Response(
        JSON.stringify({ message: "No bookings to process", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${bookings.length} bookings to send guestbook invitations`);
    let successCount = 0;
    let errorCount = 0;

    for (const booking of bookings) {
      try {
        // Check if token already exists
        const { data: existingToken } = await supabaseClient
          .from("guestbook_tokens")
          .select("id")
          .eq("booking_id", booking.id)
          .single();

        let token;
        if (existingToken) {
          console.log(`Token already exists for booking ${booking.id}`);
          const { data: tokenData } = await supabaseClient
            .from("guestbook_tokens")
            .select("token")
            .eq("booking_id", booking.id)
            .single();
          token = tokenData?.token;
        } else {
          // Create guestbook token
          const { data: tokenData, error: tokenError } = await supabaseClient
            .from("guestbook_tokens")
            .insert({
              booking_id: booking.id,
            })
            .select("token")
            .single();

          if (tokenError) {
            console.error(`Error creating token for booking ${booking.id}:`, tokenError);
            errorCount++;
            continue;
          }
          token = tokenData.token;
        }

        const property = booking.properties as any;
        const guestbookUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/property/${property.id}/guestbook?token=${token}`;

        // Send email
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #2c3e50; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #7c9885 0%, #556b2f 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e1e8e1; border-top: none; }
                .button { display: inline-block; background: #7c9885; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
                .button:hover { background: #6a8573; }
                .footer { text-align: center; padding: 20px; color: #7f8c8d; font-size: 14px; }
                .highlight { background: #f0f4f0; padding: 20px; border-left: 4px solid #7c9885; margin: 20px 0; border-radius: 4px; }
                h1 { margin: 0; font-size: 28px; font-weight: 600; }
                p { margin: 16px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🌿 Thank You for Staying With Us!</h1>
                </div>
                <div class="content">
                  <p>Dear ${booking.guest_name},</p>
                  
                  <p>We hope you had a wonderful and relaxing stay at <strong>${property.title}</strong>. It was our pleasure to host you from ${new Date(booking.check_in_date).toLocaleDateString()} to ${new Date(booking.check_out_date).toLocaleDateString()}.</p>
                  
                  <div class="highlight">
                    <p><strong>Share Your Experience 🌟</strong></p>
                    <p>We would love to hear about your stay! Leave a note in our guestbook and share your favorite moments, photos, or memories from your time with us.</p>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${guestbookUrl}" class="button">Write in Our Guestbook 🌿</a>
                  </p>
                  
                  <p>Your words inspire future guests and help us continue creating memorable experiences. Whether you share a photo, a star rating, or simply a few kind words, we treasure every message.</p>
                  
                  <p>This invitation is valid for 30 days and is specifically for your recent stay.</p>
                  
                  <p>We hope to welcome you back soon!</p>
                  
                  <p>With warm regards,<br>
                  <strong>The Nordic Getaways Team</strong></p>
                </div>
                <div class="footer">
                  <p>Nordic Getaways - Escape to Nature</p>
                  <p style="font-size: 12px; color: #95a5a6;">This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
          </html>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "Nordic Getaways <bookings@resend.dev>",
          to: [booking.guest_email],
          subject: `🌿 Share Your Experience at ${property.title}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${booking.guest_email}:`, emailError);
          errorCount++;
        } else {
          console.log(`Successfully sent guestbook invitation to ${booking.guest_email}`);
          successCount++;
        }

      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Guestbook invitations sent: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        message: "Guestbook invitations processed",
        total: bookings.length,
        successful: successCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in send-guestbook-invitations:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(
      JSON.stringify({ 
        error: "Unable to send guestbook invitations. Please try again later." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
