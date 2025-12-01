import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  currency: string;
  properties: {
    title: string;
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    country: string;
    check_in_time: string | null;
    check_out_time: string | null;
    street: string | null;
    postal_code: string | null;
    property_timezone: string;
    get_in_touch_info: any;
    check_in_instructions: string | null;
    parking_info: string | null;
    local_tips: string | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendKey);

    console.log('Starting pre-check-in reminder job...');

    // Get all bookings checking in tomorrow that haven't received reminder
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        property_id,
        guest_name,
        guest_email,
        check_in_date,
        check_out_date,
        number_of_guests,
        currency,
        properties (
          title,
          latitude,
          longitude,
          city,
          country,
          check_in_time,
          check_out_time,
          street,
          postal_code,
          property_timezone,
          get_in_touch_info,
          check_in_instructions,
          parking_info,
          local_tips,
          email_templates
        )
      `)
      .eq('check_in_date', tomorrowStr)
      .eq('status', 'confirmed')
      .is('pre_checkin_reminder_sent_at', null);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings for tomorrow`);

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No bookings found for tomorrow', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = [];

    for (const booking of bookings as unknown as Booking[]) {
      try {
        // Get or calculate travel info
        let travelInfo = null;
        if (booking.properties.latitude && booking.properties.longitude) {
          const { data: cached } = await supabase
            .from('property_travel_cache')
            .select('*')
            .eq('property_id', booking.property_id)
            .gte('computed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single();

          if (cached) {
            travelInfo = cached;
          } else {
            // Calculate nearest city and distance
            const cities = [
              { name: 'Stockholm', lat: 59.3293, lng: 18.0686 },
              { name: 'Gothenburg', lat: 57.7089, lng: 11.9746 },
              { name: 'Malmö', lat: 55.6050, lng: 13.0038 }
            ];

            const distances = cities.map(city => {
              const R = 6371; // Earth's radius in km
              const dLat = (booking.properties.latitude! - city.lat) * Math.PI / 180;
              const dLon = (booking.properties.longitude! - city.lng) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(city.lat * Math.PI / 180) * Math.cos(booking.properties.latitude! * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;
              return { ...city, distance };
            });

            const nearest = distances.sort((a, b) => a.distance - b.distance)[0];
            const driveTime = Math.round(nearest.distance * 1.2 / 5) * 5; // Round to nearest 5 min

            travelInfo = {
              nearest_city_name: nearest.name,
              drive_distance_km: Math.round(nearest.distance / 5) * 5,
              drive_time_min: driveTime
            };

            // Cache it
            await supabase.from('property_travel_cache').upsert({
              property_id: booking.property_id,
              ...travelInfo
            });
          }
        }

        // Prepare email data
        const lat = booking.properties.latitude;
        const lng = booking.properties.longitude;
        const googleMapsUrl = lat && lng ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving` : null;
        const appleMapsUrl = lat && lng ? `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d` : null;

        const checkInDate = new Date(booking.check_in_date + 'T00:00:00');
        const checkOutDate = new Date(booking.check_out_date + 'T00:00:00');
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Generate tracking ID for email opens
        const trackingId = `pre-checkin-${booking.id}-${Date.now()}`;

        // Check if property has custom pre-arrival email template
        const templates = booking.properties.email_templates || {};
        const preArrivalTemplate = templates.pre_arrival;

        let emailHTML = "";
        let emailSubject = "";

        if (preArrivalTemplate && preArrivalTemplate.enabled) {
          // Format address
          const address = [
            booking.properties.street,
            booking.properties.postal_code,
            booking.properties.city,
            booking.properties.country
          ].filter(Boolean).join(", ");

          // Use custom template with placeholders
          const replacements: Record<string, string> = {
            "{guest_name}": booking.guest_name,
            "{property_name}": booking.properties.title,
            "{check_in_date}": checkInDate,
            "{check_out_date}": checkOutDate,
            "{check_in_time}": booking.properties.check_in_time || "15:00",
            "{check_out_time}": booking.properties.check_out_time || "11:00",
            "{property_address}": address,
            "{check_in_instructions}": booking.properties.check_in_instructions || "Check-in instructions will be provided.",
          };

          emailSubject = preArrivalTemplate.subject;
          let message = preArrivalTemplate.message;

          Object.entries(replacements).forEach(([placeholder, value]) => {
            emailSubject = emailSubject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), "g"), value);
            message = message.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), "g"), value);
          });

          emailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }
              </style>
            </head>
            <body>
              ${message.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
              <img src="${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}" width="1" height="1" style="display:none;" alt="">
            </body>
            </html>
          `;
        } else {
          // Use default template
          emailSubject = `Your stay at ${booking.properties.title} starts tomorrow – all details inside`;
          emailHTML = generateEmailHTML({
          guestName: booking.guest_name,
          propertyTitle: booking.properties.title,
          city: booking.properties.city || booking.properties.country,
          checkInDate: `${dayNames[checkInDate.getDay()]}, ${checkInDate.toLocaleDateString()}`,
          checkOutDate: `${dayNames[checkOutDate.getDay()]}, ${checkOutDate.toLocaleDateString()}`,
          checkInTime: booking.properties.check_in_time || '15:00',
          checkOutTime: booking.properties.check_out_time || '11:00',
          googleMapsUrl,
          appleMapsUrl,
          travelInfo,
          contactInfo: booking.properties.get_in_touch_info,
          address: {
            street: booking.properties.street,
            postal_code: booking.properties.postal_code,
            city: booking.properties.city,
            country: booking.properties.country
          },
          checkInInstructions: booking.properties.check_in_instructions,
          parkingInfo: booking.properties.parking_info,
          localTips: booking.properties.local_tips,
            trackingId,
            supabaseUrl
          });
        }

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
          from: 'Nordic Getaways <bookings@nordicgetaways.com>',
          to: booking.guest_email,
          subject: emailSubject,
          html: emailHTML,
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
          throw emailError;
        }

        // Track email sent
        await supabase.from('booking_email_tracking').insert({
          booking_id: booking.id,
          tracking_id: trackingId,
          recipient_email: booking.guest_email,
          email_type: 'pre_checkin',
          sent_at: new Date().toISOString(),
        });

        // Mark as sent
        await supabase
          .from('bookings')
          .update({ pre_checkin_reminder_sent_at: new Date().toISOString() })
          .eq('id', booking.id);

        results.push({ booking_id: booking.id, status: 'sent', email: booking.guest_email });

      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        results.push({ booking_id: booking.id, status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ message: 'Reminders processed', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in send-precheckin-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateEmailHTML(data: any): string {
  const { 
    guestName, 
    propertyTitle, 
    city, 
    checkInDate, 
    checkOutDate, 
    checkInTime, 
    checkOutTime,
    googleMapsUrl, 
    appleMapsUrl, 
    travelInfo, 
    contactInfo, 
    address,
    checkInInstructions,
    parkingInfo,
    localTips,
    trackingId,
    supabaseUrl
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .header p { margin: 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 30px; }
    .card { background: #f8fafc; border-left: 4px solid #2c5282; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .card h2 { margin: 0 0 15px 0; color: #1a365d; font-size: 18px; }
    .card p { margin: 8px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { background: #f8fafc; padding: 15px; border-radius: 8px; }
    .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
    .info-value { font-size: 16px; font-weight: 600; color: #1a365d; }
    .btn { display: inline-block; background: #2c5282; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin: 10px 10px 10px 0; font-weight: 600; }
    .btn:hover { background: #1a365d; }
    .section { margin: 30px 0; }
    .section h3 { color: #1a365d; margin-bottom: 12px; font-size: 16px; }
    .tips-list { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 8px; }
    .tips-list li { margin: 8px 0; }
    .footer { margin-top: 30px; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
    @media only screen and (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
      body { padding: 10px; }
      .content { padding: 20px; }
      .header { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏡 Your Stay Starts Tomorrow!</h1>
      <p>${propertyTitle} · ${city}</p>
    </div>
    
    <div class="content">
      <p>Dear ${guestName},</p>
      <p>We're excited to welcome you tomorrow! Here's everything you need for a smooth check-in.</p>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Check-In</div>
          <div class="info-value">${checkInDate}<br>${checkInTime}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Check-Out</div>
          <div class="info-value">${checkOutDate}<br>${checkOutTime}</div>
        </div>
      </div>

      ${checkInInstructions ? `
      <div class="card">
        <h2>🔑 Check-In Instructions</h2>
        <p>${checkInInstructions.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}

      <div class="card">
        <h2>📍 Property Address</h2>
        <p>
          ${address.street ? `${address.street}<br>` : ''}
          ${address.postal_code || ''} ${address.city || ''}<br>
          ${address.country || ''}
        </p>
        ${googleMapsUrl || appleMapsUrl ? `
        <div style="margin-top: 15px;">
          ${googleMapsUrl ? `<a href="${googleMapsUrl}" class="btn">🗺️ Open in Google Maps</a>` : ''}
          ${appleMapsUrl ? `<a href="${appleMapsUrl}" class="btn">🍎 Open in Apple Maps</a>` : ''}
        </div>
        ` : ''}
        ${travelInfo ? `
        <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #64748b;">
          📏 Approx. ${travelInfo.drive_distance_km} km (${travelInfo.drive_time_min} min) from ${travelInfo.nearest_city_name}
        </p>
        ` : ''}
      </div>

      ${parkingInfo ? `
      <div class="card">
        <h2>🚗 Parking Information</h2>
        <p>${parkingInfo.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}

      ${localTips ? `
      <div class="tips-list">
        <h3 style="margin-top: 0; color: #92400e;">💡 Local Tips</h3>
        <p>${localTips.replace(/\n/g, '<br>')}</p>
      </div>
      ` : ''}

      ${contactInfo?.email || contactInfo?.phone ? `
      <div class="section">
        <h3>📞 Need Help?</h3>
        <p>
          ${contactInfo.email ? `Email: <a href="mailto:${contactInfo.email}" style="color: #2c5282;">${contactInfo.email}</a><br>` : ''}
          ${contactInfo.phone ? `Phone: ${contactInfo.phone}` : ''}
        </p>
      </div>
      ` : ''}

      <p style="margin-top: 30px;">We hope you have a wonderful stay! If you have any questions, don't hesitate to reach out.</p>
      <p style="margin-bottom: 0;">Warm regards,<br><strong>The Nordic Getaways Team</strong></p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Nordic Getaways. All rights reserved.</p>
    </div>
  </div>
  <img src="${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}" width="1" height="1" style="display:none;" alt="">
</body>
</html>
  `;
}
