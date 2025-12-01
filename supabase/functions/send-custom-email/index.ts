import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  bookingId: string;
  emailType: "booking_confirmation" | "pre_arrival" | "check_out" | "thank_you";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { bookingId, emailType }: EmailRequest = await req.json();

    console.log("Processing custom email:", { bookingId, emailType });

    // Fetch booking details with property
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        properties (
          id,
          title,
          email_templates,
          street,
          city,
          postal_code,
          country,
          check_in_instructions,
          check_in_time,
          check_out_time
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    const property = booking.properties as any;
    const templates = property.email_templates || {};
    const template = templates[emailType];

    // Check if template is enabled
    if (!template || !template.enabled) {
      console.log(`Email type ${emailType} is not enabled for this property`);
      return new Response(
        JSON.stringify({ message: "Email type not enabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format address
    const address = [property.street, property.city, property.postal_code, property.country]
      .filter(Boolean)
      .join(", ");

    // Prepare replacement values
    const replacements: Record<string, string> = {
      "{guest_name}": booking.guest_name,
      "{property_name}": property.title,
      "{check_in_date}": new Date(booking.check_in_date).toLocaleDateString(),
      "{check_out_date}": new Date(booking.check_out_date).toLocaleDateString(),
      "{check_in_time}": property.check_in_time || "15:00",
      "{check_out_time}": property.check_out_time || "11:00",
      "{number_of_guests}": booking.number_of_guests.toString(),
      "{total_amount}": (booking.total_amount / 100).toFixed(2),
      "{currency}": booking.currency,
      "{property_address}": address,
      "{check_in_instructions}": property.check_in_instructions || "Check-in instructions will be provided.",
    };

    // Replace placeholders in subject and message
    let subject = template.subject;
    let message = template.message;

    Object.entries(replacements).forEach(([placeholder, value]) => {
      subject = subject.replace(new RegExp(placeholder, "g"), value);
      message = message.replace(new RegExp(placeholder, "g"), value);
    });

    // Generate tracking ID
    const trackingId = crypto.randomUUID();

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Nordic Getaways <support@mojjo.se>",
      to: [booking.guest_email],
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${message.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
          <img src="${supabaseUrl}/functions/v1/track-email-open?tracking_id=${trackingId}" width="1" height="1" style="display:none;" />
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Track email
    await supabase.from("booking_email_tracking").insert({
      booking_id: bookingId,
      recipient_email: booking.guest_email,
      email_type: emailType,
      tracking_id: trackingId,
    });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-custom-email function:", error);
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
