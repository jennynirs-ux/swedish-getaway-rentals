import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isAdminOrService } from "../_shared/auth.ts";
import { guestbookInvitationEmail } from "../_shared/guestbook-email.ts";
import { guestLang, guestPageUrl, guestTexts } from "../_shared/guest-lang.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SITE_URL = Deno.env.get("SITE_URL") || "https://nordic-getaways.com";

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

    // Every call re-sends yesterday's invitations: admins or scheduled jobs only
    if (!(await isAdminOrService(req, supabaseClient))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        guest_lang,
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
        // The guestbook page on the site, in the guest's language
        const lang = guestLang(booking.guest_lang);
        const guestbookUrl = `${guestPageUrl(SITE_URL, lang, `/property/${property.id}/guestbook`)}?token=${token}`;
        const texts = await guestTexts(supabaseClient, property.id, lang);

        // Send email, in the language the guest booked in
        const { subject, html: emailHtml } = guestbookInvitationEmail({
          lang,
          guestName: booking.guest_name,
          propertyTitle: texts.text("property", "title", property.title),
          checkIn: booking.check_in_date,
          checkOut: booking.check_out_date,
          url: guestbookUrl,
        });

        const { error: emailError } = await resend.emails.send({
          from: "Nordic Getaways <support@mojjo.se>",
          to: [booking.guest_email],
          subject,
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
