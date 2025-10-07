import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

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
    street: string | null;
    postal_code: string | null;
    property_timezone: string;
    get_in_touch_info: any;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
          street,
          postal_code,
          property_timezone,
          get_in_touch_info
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

        const emailData = {
          to: booking.guest_email,
          subject: `Your stay at ${booking.properties.title} starts tomorrow – directions & check-in details`,
          html: generateEmailHTML({
            guestName: booking.guest_name,
            propertyTitle: booking.properties.title,
            city: booking.properties.city || booking.properties.country,
            checkInDate: `${dayNames[checkInDate.getDay()]}, ${checkInDate.toLocaleDateString()}`,
            checkOutDate: `${dayNames[checkOutDate.getDay()]}, ${checkOutDate.toLocaleDateString()}`,
            checkInTime: booking.properties.check_in_time || '15:00',
            googleMapsUrl,
            appleMapsUrl,
            travelInfo,
            contactInfo: booking.properties.get_in_touch_info,
            address: {
              street: booking.properties.street,
              postal_code: booking.properties.postal_code,
              city: booking.properties.city,
              country: booking.properties.country
            }
          })
        };

        // Log the email data (in production, send via your email provider)
        console.log('Email prepared for booking:', booking.id, emailData);

        // Mark as sent
        await supabase
          .from('bookings')
          .update({ pre_checkin_reminder_sent_at: new Date().toISOString() })
          .eq('id', booking.id);

        results.push({ booking_id: booking.id, status: 'prepared', email: booking.guest_email });

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
  const { guestName, propertyTitle, city, checkInDate, checkOutDate, checkInTime, googleMapsUrl, appleMapsUrl, travelInfo, contactInfo, address } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; margin-bottom: 10px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .btn { display: inline-block; background: #667eea; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 10px 10px 10px 0; }
    .btn-secondary { background: #6c757d; }
    .info-row { margin: 10px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${propertyTitle}</h1>
    <p>${city}</p>
  </div>

  <p>Hi ${guestName},</p>
  <p>Your stay begins tomorrow! Here's everything you need for a smooth check-in.</p>

  <div class="card">
    <h2>📅 Your Stay</h2>
    <div class="info-row"><strong>Check-in:</strong> ${checkInDate} at ${checkInTime}</div>
    <div class="info-row"><strong>Check-out:</strong> ${checkOutDate}</div>
  </div>

  ${googleMapsUrl ? `
  <div class="card">
    <h2>🗺️ Directions</h2>
    ${travelInfo ? `
      <p>Approximately <strong>${travelInfo.drive_distance_km} km</strong> (≈ ${travelInfo.drive_time_min} min) from ${travelInfo.nearest_city_name}.</p>
    ` : ''}
    ${address.street ? `
      <p><strong>Address:</strong><br>
      ${address.street}<br>
      ${address.postal_code} ${address.city}<br>
      ${address.country}</p>
    ` : ''}
    <a href="${googleMapsUrl}" class="btn">📍 View Directions in Google Maps</a>
    ${appleMapsUrl ? `<a href="${appleMapsUrl}" class="btn btn-secondary">🍎 Open in Apple Maps</a>` : ''}
  </div>
  ` : ''}

  <div class="card">
    <h2>🏠 Check-in Information</h2>
    <p><strong>Check-in time:</strong> ${checkInTime}</p>
    <p>Please review the House Rules and Guest Guidebook before arrival.</p>
  </div>

  ${contactInfo?.contact_email || contactInfo?.contact_phone ? `
  <div class="card">
    <h2>📞 Contact</h2>
    ${contactInfo.contact_email ? `<p><strong>Email:</strong> ${contactInfo.contact_email}</p>` : ''}
    ${contactInfo.contact_phone ? `<p><strong>Phone:</strong> ${contactInfo.contact_phone}</p>` : ''}
  </div>
  ` : ''}

  <p>We're excited to host you! If you have any questions, don't hesitate to reach out.</p>

  <div class="footer">
    <p>Map data © OpenStreetMap contributors</p>
  </div>
</body>
</html>
  `;
}
