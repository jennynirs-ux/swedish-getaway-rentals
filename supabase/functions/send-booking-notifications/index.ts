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
    const requestData = await req.json();
    const {
      bookingId,
      propertyId,
      propertyTitle,
      guestName,
      guestEmail,
      guestPhone,
      numberOfGuests,
      checkInDate,
      checkOutDate,
      totalAmount,
      currency,
      hostId,
    } = requestData;
    
    // Validate email format before sending
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!guestEmail || !emailRegex.test(guestEmail)) {
      console.error('Invalid guest email format:', guestEmail);
      throw new Error('Invalid email format');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get property details including address
    const { data: property } = await supabase
      .from("properties")
      .select("street, city, postal_code, country, check_in_time, check_out_time")
      .eq("id", propertyId)
      .single();

    // Get host email
    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", hostId)
      .single();

    const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(
      "https://bbuutvozqfzbsnllsiai.supabase.co",
      "https://jolofsson.lovable.app"
    ) || "https://jolofsson.lovable.app";

    const guidebookUrl = `${baseUrl}/property/${propertyId}/guide`;
    
    // Format property address
    const propertyAddress = [
      property?.street,
      property?.postal_code,
      property?.city,
      property?.country
    ].filter(Boolean).join(", ");

    // Send email to guest
    const guestEmailHtml = `
      <h1>Booking Confirmed! 🎉</h1>
      <p>Hi ${guestName},</p>
      <p>Your booking for <strong>${propertyTitle}</strong> has been confirmed!</p>
      
      <h2>Property Address:</h2>
      <p style="font-size: 16px; line-height: 1.5;">
        ${propertyAddress || propertyTitle}
      </p>

      <h2>Booking Details:</h2>
      <ul>
        <li><strong>Check-in:</strong> ${new Date(checkInDate).toLocaleDateString()} ${property?.check_in_time ? `at ${property.check_in_time.slice(0, 5)}` : ''}</li>
        <li><strong>Check-out:</strong> ${new Date(checkOutDate).toLocaleDateString()} ${property?.check_out_time ? `at ${property.check_out_time.slice(0, 5)}` : ''}</li>
        <li><strong>Guests:</strong> ${numberOfGuests}</li>
        <li><strong>Total Amount:</strong> ${totalAmount} ${currency}</li>
      </ul>

      <p><a href="${guidebookUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Guest Guidebook</a></p>

      <p>Your guidebook contains important information about:</p>
      <ul>
        <li>Check-in instructions and access codes</li>
        <li>House rules and amenities</li>
        <li>Local recommendations</li>
        <li>Emergency contacts</li>
      </ul>

      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>We look forward to hosting you!</p>
    `;

    await resend.emails.send({
      from: "Bookings <onboarding@resend.dev>",
      to: [guestEmail],
      subject: `Booking Confirmed - ${propertyTitle}`,
      html: guestEmailHtml,
    });

    // Send email to host if host email exists
    if (hostProfile?.email) {
      const hostEmailHtml = `
        <h1>New Booking Received! 📅</h1>
        <p>Hi ${hostProfile.full_name || "Host"},</p>
        <p>You have a new booking for <strong>${propertyTitle}</strong>!</p>
        
        <h2>Guest Information:</h2>
        <ul>
          <li><strong>Name:</strong> ${guestName}</li>
          <li><strong>Email:</strong> ${guestEmail}</li>
          ${guestPhone ? `<li><strong>Phone:</strong> ${guestPhone}</li>` : ''}
          <li><strong>Number of Guests:</strong> ${numberOfGuests}</li>
        </ul>

        <h2>Booking Details:</h2>
        <ul>
          <li><strong>Check-in:</strong> ${new Date(checkInDate).toLocaleDateString()} ${property?.check_in_time ? `at ${property.check_in_time.slice(0, 5)}` : ''}</li>
          <li><strong>Check-out:</strong> ${new Date(checkOutDate).toLocaleDateString()} ${property?.check_out_time ? `at ${property.check_out_time.slice(0, 5)}` : ''}</li>
          <li><strong>Total Amount:</strong> ${totalAmount} ${currency}</li>
          <li><strong>Booking ID:</strong> ${bookingId}</li>
        </ul>

        <p><a href="${baseUrl}/host-dashboard" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">View in Dashboard</a></p>

        <p>The booking dates have been automatically marked as unavailable in your calendar.</p>
      `;

      await resend.emails.send({
        from: "Bookings <onboarding@resend.dev>",
        to: [hostProfile.email],
        subject: `New Booking - ${propertyTitle}`,
        html: hostEmailHtml,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Log detailed error server-side for debugging
    console.error("Error sending booking notifications:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return generic error to client
    return new Response(
      JSON.stringify({ 
        error: "Unable to send booking notifications. The booking was created successfully." 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
