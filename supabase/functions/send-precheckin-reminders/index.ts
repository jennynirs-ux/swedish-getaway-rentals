import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";
import { escapeHtml } from "../_shared/auth.ts";
import { hhmm, longDate } from "../_shared/format.ts";
import { type GuestLang, type GuestTexts, guestLang, guestTexts } from "../_shared/guest-lang.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The reminder's own words in the language the guest booked in
// (bookings.guest_lang). What the host wrote comes from their translations.
interface ReminderCopy {
  subject: (title: string) => string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  checkIn: string;
  checkOut: string;
  checkInInstructions: string;
  address: string;
  googleMaps: string;
  appleMaps: string;
  distance: (km: number, min: number, city: string) => string;
  parking: string;
  localTips: string;
  needHelp: string;
  email: string;
  phone: string;
  closing: string;
  regards: string;
  team: string;
  rights: (year: number) => string;
  /** {check_in_instructions} in a host's template when they left them empty */
  noCheckInInstructions: string;
  /** Names of the cities we measure the drive from */
  cityNames: Record<string, string>;
}

const GUEST_COPY: Record<GuestLang, ReminderCopy> = {
  en: {
    subject: (title) => `Your stay at ${title} starts tomorrow – all details inside`,
    heading: "🏡 Your Stay Starts Tomorrow!",
    greeting: (name) => `Dear ${name},`,
    intro: "We're excited to welcome you tomorrow! Here's everything you need for a smooth check-in.",
    checkIn: "Check-In",
    checkOut: "Check-Out",
    checkInInstructions: "🔑 Check-In Instructions",
    address: "📍 Property Address",
    googleMaps: "🗺️ Open in Google Maps",
    appleMaps: "🍎 Open in Apple Maps",
    distance: (km, min, city) => `📏 Approx. ${km} km (${min} min) from ${city}`,
    parking: "🚗 Parking Information",
    localTips: "💡 Local Tips",
    needHelp: "📞 Need Help?",
    email: "Email",
    phone: "Phone",
    closing: "We hope you have a wonderful stay! If you have any questions, don't hesitate to reach out.",
    regards: "Warm regards,",
    team: "The Nordic Getaways Team",
    rights: (year) => `© ${year} Nordic Getaways. All rights reserved.`,
    noCheckInInstructions: "Check-in instructions will be provided.",
    cityNames: {},
  },
  sv: {
    subject: (title) => `Din vistelse på ${title} börjar i morgon – här är allt du behöver veta`,
    heading: "🏡 I morgon börjar din vistelse!",
    greeting: (name) => `Hej ${name}!`,
    intro: "Vi ser fram emot att välkomna dig i morgon! Här är allt du behöver för en smidig incheckning.",
    checkIn: "Incheckning",
    checkOut: "Utcheckning",
    checkInInstructions: "🔑 Så checkar du in",
    address: "📍 Adress",
    googleMaps: "🗺️ Öppna i Google Maps",
    appleMaps: "🍎 Öppna i Apple Kartor",
    distance: (km, min, city) => `📏 Cirka ${km} km (${min} min) från ${city}`,
    parking: "🚗 Parkering",
    localTips: "💡 Lokala tips",
    needHelp: "📞 Behöver du hjälp?",
    email: "E-post",
    phone: "Telefon",
    closing: "Vi hoppas att du får en underbar vistelse! Hör gärna av dig om du har några frågor.",
    regards: "Varma hälsningar",
    team: "Nordic Getaways-teamet",
    rights: (year) => `© ${year} Nordic Getaways. Alla rättigheter förbehållna.`,
    noCheckInInstructions: "Information om incheckningen kommer senare.",
    cityNames: { Gothenburg: "Göteborg" },
  },
  de: {
    subject: (title) => `Dein Aufenthalt in ${title} beginnt morgen – alle Infos im Überblick`,
    heading: "🏡 Morgen beginnt dein Aufenthalt!",
    greeting: (name) => `Hallo ${name}!`,
    intro: "Wir freuen uns, dich morgen willkommen zu heißen! Hier findest du alles, was du für einen reibungslosen Check-in brauchst.",
    checkIn: "Check-in",
    checkOut: "Check-out",
    checkInInstructions: "🔑 So funktioniert der Check-in",
    address: "📍 Adresse",
    googleMaps: "🗺️ In Google Maps öffnen",
    appleMaps: "🍎 In Apple Karten öffnen",
    distance: (km, min, city) => `📏 Etwa ${km} km (${min} Min.) von ${city} entfernt`,
    parking: "🚗 Parken",
    localTips: "💡 Tipps für die Umgebung",
    needHelp: "📞 Brauchst du Hilfe?",
    email: "E-Mail",
    phone: "Telefon",
    closing: "Wir wünschen dir einen wunderschönen Aufenthalt! Wenn du Fragen hast, melde dich jederzeit gern.",
    regards: "Herzliche Grüße",
    team: "Dein Nordic Getaways-Team",
    rights: (year) => `© ${year} Nordic Getaways. Alle Rechte vorbehalten.`,
    noCheckInInstructions: "Die Infos zum Check-in folgen noch.",
    cityNames: { Gothenburg: "Göteborg" },
  },
};

interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_lang: string | null;
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

// Guest-only fields live in property_private_details (not publicly readable).
// This function uses the service role, so it can read them; flatten them onto
// booking.properties so the email code below can stay unchanged.
type PrivateDetails = Pick<
  Booking['properties'],
  'street' | 'postal_code' | 'check_in_instructions' | 'parking_info'
>;

function withPrivateDetails(booking: any): Booking {
  const raw = booking.properties?.property_private_details;
  const details: Partial<PrivateDetails> = (Array.isArray(raw) ? raw[0] : raw) ?? {};
  return {
    ...booking,
    properties: {
      ...booking.properties,
      street: details.street ?? null,
      postal_code: details.postal_code ?? null,
      check_in_instructions: details.check_in_instructions ?? null,
      parking_info: details.parking_info ?? null,
    },
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
        guest_lang,
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
          property_timezone,
          get_in_touch_info,
          local_tips,
          email_templates,
          property_private_details (
            street,
            postal_code,
            check_in_instructions,
            parking_info
          )
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

    // The host's text in each guest's language, read once per listing and language for this run
    const textsByListing = new Map<string, Promise<GuestTexts>>();
    const textsFor = (propertyId: string, lang: GuestLang): Promise<GuestTexts> => {
      const key = `${propertyId}\n${lang}`;
      let texts = textsByListing.get(key);
      if (!texts) {
        texts = guestTexts(supabase, propertyId, lang);
        textsByListing.set(key, texts);
      }
      return texts;
    };

    for (const booking of bookings.map(withPrivateDetails)) {
      try {
        const lang = guestLang(booking.guest_lang);
        const copy = GUEST_COPY[lang];
        const texts = await textsFor(booking.property_id, lang);
        const listing = texts.listing({ title: booking.properties.title, local_tips: booking.properties.local_tips });
        const checkInInstructions = texts.text("property_private", "check_in_instructions", booking.properties.check_in_instructions);
        const parkingInfo = texts.text("property_private", "parking_info", booking.properties.parking_info);

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
            "{property_name}": listing.title,
            "{check_in_date}": longDate(booking.check_in_date, lang),
            "{check_out_date}": longDate(booking.check_out_date, lang),
            "{check_in_time}": hhmm(booking.properties.check_in_time, "15:00"),
            "{check_out_time}": hhmm(booking.properties.check_out_time, "11:00"),
            "{property_address}": address,
            "{check_in_instructions}": checkInInstructions || copy.noCheckInInstructions,
          };

          // The host's subject and message in the guest's language (placeholders kept, filled in below)
          const hostTemplateText = (part: "subject" | "message") => {
            const value = preArrivalTemplate[part];
            return typeof value === "string" ? texts.text("property_private", `email_templates.pre_arrival.${part}`, value) : value;
          };
          emailSubject = hostTemplateText("subject");
          let message = hostTemplateText("message");

          // The subject is plain text; the message is HTML, so the host's text
          // and every value are escaped there (placeholders have no HTML
          // characters, so they survive). A function, so "$&" in a name is not a pattern
          message = escapeHtml(message ?? "");
          Object.entries(replacements).forEach(([placeholder, value]) => {
            const pattern = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), "g");
            emailSubject = String(emailSubject ?? "").replace(pattern, () => value);
            message = message.replace(pattern, () => escapeHtml(value));
          });

          emailHTML = `
            <!DOCTYPE html>
            <html lang="${lang}">
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
          emailSubject = copy.subject(listing.title);
          emailHTML = generateEmailHTML({
          lang,
          copy,
          guestName: booking.guest_name,
          propertyTitle: listing.title,
          city: booking.properties.city || booking.properties.country,
          checkInDate: longDate(booking.check_in_date, lang),
          checkOutDate: longDate(booking.check_out_date, lang),
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
          checkInInstructions,
          parkingInfo,
          localTips: listing.local_tips,
            trackingId,
            supabaseUrl
          });
        }

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
          from: 'Nordic Getaways <support@mojjo.se>',
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
    lang,
    copy,
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
  // What guests and hosts typed is escaped: a name like "<b>" must not change the e-mail
  const e = (value: unknown) => escapeHtml(value ?? "");
  const lines = (value: string) => e(value).replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="${lang}">
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
      <h1>${copy.heading}</h1>
      <p>${e(propertyTitle)} · ${e(city)}</p>
    </div>
    
    <div class="content">
      <p>${copy.greeting(e(guestName))}</p>
      <p>${copy.intro}</p>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">${copy.checkIn}</div>
          <div class="info-value">${checkInDate}<br>${checkInTime}</div>
        </div>
        <div class="info-item">
          <div class="info-label">${copy.checkOut}</div>
          <div class="info-value">${checkOutDate}<br>${checkOutTime}</div>
        </div>
      </div>

      ${checkInInstructions ? `
      <div class="card">
        <h2>${copy.checkInInstructions}</h2>
        <p>${lines(checkInInstructions)}</p>
      </div>
      ` : ''}

      <div class="card">
        <h2>${copy.address}</h2>
        <p>
          ${address.street ? `${e(address.street)}<br>` : ''}
          ${e(address.postal_code)} ${e(address.city)}<br>
          ${e(address.country)}
        </p>
        ${googleMapsUrl || appleMapsUrl ? `
        <div style="margin-top: 15px;">
          ${googleMapsUrl ? `<a href="${googleMapsUrl}" class="btn">${copy.googleMaps}</a>` : ''}
          ${appleMapsUrl ? `<a href="${appleMapsUrl}" class="btn">${copy.appleMaps}</a>` : ''}
        </div>
        ` : ''}
        ${travelInfo ? `
        <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #64748b;">
          ${copy.distance(travelInfo.drive_distance_km, travelInfo.drive_time_min, copy.cityNames[travelInfo.nearest_city_name] ?? travelInfo.nearest_city_name)}
        </p>
        ` : ''}
      </div>

      ${parkingInfo ? `
      <div class="card">
        <h2>${copy.parking}</h2>
        <p>${lines(parkingInfo)}</p>
      </div>
      ` : ''}

      ${localTips ? `
      <div class="tips-list">
        <h3 style="margin-top: 0; color: #92400e;">${copy.localTips}</h3>
        <p>${lines(localTips)}</p>
      </div>
      ` : ''}

      ${contactInfo?.email || contactInfo?.phone ? `
      <div class="section">
        <h3>${copy.needHelp}</h3>
        <p>
          ${contactInfo.email ? `${copy.email}: <a href="mailto:${e(contactInfo.email)}" style="color: #2c5282;">${e(contactInfo.email)}</a><br>` : ''}
          ${contactInfo.phone ? `${copy.phone}: ${e(contactInfo.phone)}` : ''}
        </p>
      </div>
      ` : ''}

      <p style="margin-top: 30px;">${copy.closing}</p>
      <p style="margin-bottom: 0;">${copy.regards}<br><strong>${copy.team}</strong></p>
    </div>

    <div class="footer">
      <p>${copy.rights(new Date().getFullYear())}</p>
    </div>
  </div>
  <img src="${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}" width="1" height="1" style="display:none;" alt="">
</body>
</html>
  `;
}
