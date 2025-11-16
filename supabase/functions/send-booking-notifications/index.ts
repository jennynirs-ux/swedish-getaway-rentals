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
          cancellation_policy,
          guidebook_sections,
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

    // Extract house rules from guidebook sections
    const guidebookSections = property.guidebook_sections || [];
    const rulesSection = guidebookSections.find((s: any) => s.id === 'rules');
    const houseRules = rulesSection?.blocks?.filter((b: any) => b.type === 'list')
      .flatMap((b: any) => b.items || []) || [];

    // Get cancellation policy details
    const cancellationPolicyMap = {
      flexible: {
        title: "Flexible Cancellation",
        description: "Full refund up to 1 day before check-in. Cancellations made within 24 hours are non-refundable."
      },
      moderate: {
        title: "Moderate Cancellation",
        description: "Full refund up to 5 days before check-in. Cancellations made within 5 days receive a 50% refund."
      },
      strict: {
        title: "Strict Cancellation",
        description: "50% refund up to 7 days before check-in. Cancellations made within 7 days are non-refundable."
      }
    };
    const policyKey = (property.cancellation_policy || 'moderate') as keyof typeof cancellationPolicyMap;
    const cancellationPolicy = cancellationPolicyMap[policyKey];

    // Format check-in and check-out times
    const formatDateTime = (date: string, time: string) => {
      const d = new Date(date);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return `${dateStr} at ${time}`;
    };

    const checkInDateTime = formatDateTime(booking.check_in_date, property.check_in_time || '15:00');
    const checkOutDateTime = formatDateTime(booking.check_out_date, property.check_out_time || '11:00');

    // Create email open tracking pixel
    const trackingId = `${bookingId}-${Date.now()}`;
    const trackingPixel = `${baseUrl}/api/track-email-open?id=${trackingId}`;

    // Send email to guest
    console.log('Sending confirmation email to guest:', booking.guest_email);
    const guestEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - Nordic Getaways</title>
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #2D5F5D 0%, #1a3635 100%); color: white; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 40px 30px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 20px; font-weight: 600; color: #2D5F5D; margin-bottom: 15px; border-bottom: 2px solid #2D5F5D; padding-bottom: 8px; }
          .info-box { background: #f8f9fa; border-left: 4px solid #2D5F5D; padding: 20px; margin: 15px 0; border-radius: 4px; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
          .info-label { font-weight: 600; color: #495057; }
          .info-value { color: #212529; }
          .rules-list { list-style: none; padding: 0; margin: 15px 0; }
          .rules-list li { padding: 12px; background: #f8f9fa; margin: 8px 0; border-radius: 4px; border-left: 3px solid #2D5F5D; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #2D5F5D 0%, #1a3635 100%); color: white !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
          .cta-button:hover { background: linear-gradient(135deg, #1a3635 0%, #0f2221 100%); }
          .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #dee2e6; }
          @media only screen and (max-width: 600px) {
            .content { padding: 20px 15px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .info-row { flex-direction: column; }
            .info-label, .info-value { margin: 5px 0; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for choosing Nordic Getaways</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; line-height: 1.6;">Hi ${booking.guest_name},</p>
            <p style="font-size: 16px; line-height: 1.6;">Your booking for <strong>${property.title}</strong> has been confirmed! We're excited to host you.</p>
            
            <div class="section">
              <div class="section-title">Check-In & Check-Out</div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Check-In:</span>
                  <span class="info-value">${checkInDateTime}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Check-Out:</span>
                  <span class="info-value">${checkOutDateTime}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Guests:</span>
                  <span class="info-value">${booking.number_of_guests}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Property Location</div>
              <p style="font-size: 16px; line-height: 1.6; color: #495057;">${propertyAddress || property.title}</p>
            </div>

            ${houseRules.length > 0 ? `
            <div class="section">
              <div class="section-title">House Rules</div>
              <ul class="rules-list">
                ${houseRules.map((rule: string) => `<li>${rule}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            <div class="section">
              <div class="section-title">Cancellation Policy</div>
              <div class="info-box">
                <strong style="color: #2D5F5D;">${cancellationPolicy.title}</strong>
                <p style="margin: 10px 0 0 0; line-height: 1.6; color: #495057;">${cancellationPolicy.description}</p>
              </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${guidebookUrl}" class="cta-button">View Your Complete Guest Guide</a>
              <p style="margin: 15px 0; color: #6c757d; font-size: 14px;">Access directions, amenities, local recommendations, and more</p>
            </div>

            <div class="section">
              <div class="section-title">Booking Summary</div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">Booking ID:</span>
                  <span class="info-value">${booking.id}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Total Amount:</span>
                  <span class="info-value">${booking.total_amount} ${booking.currency}</span>
                </div>
              </div>
            </div>

            <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">If you have any questions, feel free to reach out to us. We're here to help make your stay unforgettable!</p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Best regards,<br><strong>The Nordic Getaways Team</strong></p>
          </div>
          
          <div class="footer">
            <p style="margin: 5px 0;">Nordic Getaways - Your Home Away from Home</p>
            <p style="margin: 5px 0;">This is an automated confirmation email</p>
          </div>
        </div>
        <img src="${trackingPixel}" width="1" height="1" alt="" style="display:none;" />
      </body>
      </html>
    `;

    // Send email to guest with plain text fallback
    const guestEmailPlainText = `
Booking Confirmed!

Hi ${booking.guest_name},

Your booking for ${property.title} has been confirmed!

CHECK-IN & CHECK-OUT:
- Check-In: ${checkInDateTime}
- Check-Out: ${checkOutDateTime}
- Guests: ${booking.number_of_guests}

PROPERTY LOCATION:
${propertyAddress || property.title}

${houseRules.length > 0 ? `
HOUSE RULES:
${houseRules.map((rule: string, i: number) => `${i + 1}. ${rule}`).join('\n')}
` : ''}

CANCELLATION POLICY:
${cancellationPolicy.title}
${cancellationPolicy.description}

VIEW YOUR COMPLETE GUEST GUIDE:
${guidebookUrl}

BOOKING SUMMARY:
- Booking ID: ${booking.id}
- Total Amount: ${booking.total_amount} ${booking.currency}

If you have any questions, feel free to reach out to us.

Best regards,
The Nordic Getaways Team
    `;

    try {
      const guestEmailResponse = await resend.emails.send({
        from: "Nordic Getaways <bookings@nordicgetaways.com>",
        to: [booking.guest_email],
        subject: `Booking Confirmed - ${property.title}`,
        html: guestEmailHtml,
        text: guestEmailPlainText,
      });

      console.log('Guest email sent successfully:', guestEmailResponse);

      // Record email tracking
      await supabase.from('booking_email_tracking').insert({
        booking_id: bookingId,
        tracking_id: trackingId,
        recipient_email: booking.guest_email,
        email_type: 'booking_confirmation',
        sent_at: new Date().toISOString(),
      });

    } catch (emailError) {
      console.error('Failed to send guest email:', emailError);
      throw emailError;
    }

    // Send notification to host
    const hostEmail = hostProfile?.email;
    if (hostEmail) {
      console.log('Sending notification to host:', hostEmail);
      
      const hostEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Booking - Nordic Getaways</title>
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #2D5F5D 0%, #1a3635 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .info-box { background: #f8f9fa; border-left: 4px solid #2D5F5D; padding: 20px; margin: 15px 0; border-radius: 4px; }
            .info-row { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏡 New Booking Received</h1>
            </div>
            <div class="content">
              <p>Hi ${hostProfile.full_name || 'Host'},</p>
              <p>You have a new booking for <strong>${property.title}</strong>.</p>
              <div class="info-box">
                <div class="info-row"><strong>Guest:</strong> ${booking.guest_name}</div>
                <div class="info-row"><strong>Check-In:</strong> ${checkInDateTime}</div>
                <div class="info-row"><strong>Check-Out:</strong> ${checkOutDateTime}</div>
                <div class="info-row"><strong>Guests:</strong> ${booking.number_of_guests}</div>
                <div class="info-row"><strong>Total:</strong> ${booking.total_amount} ${booking.currency}</div>
              </div>
              <p>Log in to your admin panel to view full booking details.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "Nordic Getaways <bookings@nordicgetaways.com>",
          to: [hostEmail],
          subject: `New Booking - ${property.title}`,
          html: hostEmailHtml,
        });
        console.log('Host notification sent successfully');
      } catch (hostEmailError) {
        console.error('Failed to send host notification:', hostEmailError);
        // Don't throw - guest email is more critical
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Booking notification sent successfully',
      trackingId: trackingId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in send-booking-notifications:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to send booking notifications'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

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
