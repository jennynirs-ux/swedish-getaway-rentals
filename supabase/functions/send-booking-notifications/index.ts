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
    const { bookingId } = requestData;
    
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Booking ID is required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    console.log('Processing booking notification for booking:', bookingId);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 🔒 SECURITY: Fetch actual booking data from database instead of trusting client input
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        property_id,
        guest_name,
        guest_email,
        guest_phone,
        number_of_guests,
        check_in_date,
        check_out_date,
        total_amount,
        currency,
        properties (
          id,
          title,
          street,
          city,
          postal_code,
          country,
          check_in_time,
          check_out_time,
          host_id,
          profiles (
            email,
            full_name
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingId, bookingError);
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const property = booking.properties as any;
    const hostProfile = property?.profiles as any;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!booking.guest_email || !emailRegex.test(booking.guest_email)) {
      console.error('Invalid guest email format:', booking.guest_email);
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    const resend = new Resend(resendApiKey);
    const baseUrl = Deno.env.get("SITE_URL") || "https://jolofsson.lovable.app";
    const guidebookUrl = `${baseUrl}/property/${property.id}/guide`;
    
    // Format property address
    const propertyAddress = [
      property?.street,
      property?.postal_code,
      property?.city,
      property?.country
    ].filter(Boolean).join(", ");

    // Send email to guest
    console.log('Sending confirmation email to guest:', booking.guest_email);
    const guestEmailHtml = `
      <h1>Booking Confirmed! 🎉</h1>
      <p>Hi ${booking.guest_name},</p>
      <p>Your booking for <strong>${property.title}</strong> has been confirmed!</p>
      
      <h2>Property Address:</h2>
      <p style="font-size: 16px; line-height: 1.5;">
        ${propertyAddress || property.title}
      </p>

      <h2>Booking Details:</h2>
      <ul>
        <li><strong>Check-in:</strong> ${new Date(booking.check_in_date).toLocaleDateString()} ${property?.check_in_time ? `at ${property.check_in_time.slice(0, 5)}` : ''}</li>
        <li><strong>Check-out:</strong> ${new Date(booking.check_out_date).toLocaleDateString()} ${property?.check_out_time ? `at ${property.check_out_time.slice(0, 5)}` : ''}</li>
        <li><strong>Guests:</strong> ${booking.number_of_guests}</li>
        <li><strong>Total Amount:</strong> ${booking.total_amount} ${booking.currency}</li>
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

    const { error: guestEmailError } = await resend.emails.send({
      from: "Bookings <onboarding@resend.dev>",
      to: [booking.guest_email],
      subject: `Booking Confirmed - ${property.title}`,
      html: guestEmailHtml,
    });

    if (guestEmailError) {
      console.error('Failed to send guest email:', guestEmailError);
      return new Response(JSON.stringify({ error: 'Failed to send guest confirmation email' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }
    
    console.log('Guest email sent successfully');

    // Send email to host if host email exists
    if (hostProfile?.email) {
      console.log('Sending notification email to host:', hostProfile.email);
      const hostEmailHtml = `
        <h1>New Booking Received! 📅</h1>
        <p>Hi ${hostProfile.full_name || "Host"},</p>
        <p>You have a new booking for <strong>${property.title}</strong>!</p>
        
        <h2>Guest Information:</h2>
        <ul>
          <li><strong>Name:</strong> ${booking.guest_name}</li>
          <li><strong>Email:</strong> ${booking.guest_email}</li>
          ${booking.guest_phone ? `<li><strong>Phone:</strong> ${booking.guest_phone}</li>` : ''}
          <li><strong>Number of Guests:</strong> ${booking.number_of_guests}</li>
        </ul>

        <h2>Booking Details:</h2>
        <ul>
          <li><strong>Check-in:</strong> ${new Date(booking.check_in_date).toLocaleDateString()} ${property?.check_in_time ? `at ${property.check_in_time.slice(0, 5)}` : ''}</li>
          <li><strong>Check-out:</strong> ${new Date(booking.check_out_date).toLocaleDateString()} ${property?.check_out_time ? `at ${property.check_out_time.slice(0, 5)}` : ''}</li>
          <li><strong>Total Amount:</strong> ${booking.total_amount} ${booking.currency}</li>
          <li><strong>Booking ID:</strong> ${booking.id}</li>
        </ul>

        <p><a href="${baseUrl}/host-dashboard" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0;">View in Dashboard</a></p>

        <p>The booking dates have been automatically marked as unavailable in your calendar.</p>
      `;

      const { error: hostEmailError } = await resend.emails.send({
        from: "Bookings <onboarding@resend.dev>",
        to: [hostProfile.email],
        subject: `New Booking - ${property.title}`,
        html: hostEmailHtml,
      });

      if (hostEmailError) {
        console.error('Failed to send host email:', hostEmailError);
        // Don't fail the whole request if host email fails
      } else {
        console.log('Host email sent successfully');
      }
    } else {
      console.log('No host email found, skipping host notification');
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
