import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const propertyId = url.pathname.split('/').pop();
    const secret = url.searchParams.get('secret');

    if (!propertyId || !secret) {
      return new Response("Invalid request", { status: 400 });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify property and secret
    const { data: property, error: propError } = await supabaseClient
      .from('properties')
      .select('title, ical_export_secret')
      .eq('id', propertyId)
      .single();

    if (propError || !property || property.ical_export_secret !== secret) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get all bookings for this property
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'confirmed');

    if (bookingsError) {
      throw bookingsError;
    }

    // Get blocked dates from availability
    const { data: availability, error: availError } = await supabaseClient
      .from('availability')
      .select('*')
      .eq('property_id', propertyId)
      .eq('available', false);

    if (availError) {
      throw availError;
    }

    // Generate iCal content
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Nordic Getaways//Property Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${property.title} - Availability`,
      'X-WR-TIMEZONE:Europe/Stockholm',
    ];

    // Add bookings as events
    bookings?.forEach((booking: any) => {
      const startDate = new Date(booking.check_in_date);
      const endDate = new Date(booking.check_out_date);
      const uid = `booking-${booking.id}@nordicgetaways.com`;
      
      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${startDate.toISOString().split('T')[0].replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${endDate.toISOString().split('T')[0].replace(/-/g, '')}`,
        `SUMMARY:Booking - ${booking.guest_name}`,
        `DESCRIPTION:Guest: ${booking.guest_name}\\nEmail: ${booking.guest_email}\\nGuests: ${booking.number_of_guests}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      );
    });

    // Add blocked dates as events
    availability?.forEach((block: any) => {
      const date = new Date(block.date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const uid = `blocked-${block.date}-${propertyId}@nordicgetaways.com`;
      
      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${date.toISOString().split('T')[0].replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${nextDay.toISOString().split('T')[0].replace(/-/g, '')}`,
        `SUMMARY:Blocked - ${block.reason || 'Unavailable'}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      );
    });

    icalContent.push('END:VCALENDAR');

    return new Response(icalContent.join('\r\n'), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${property.title}-calendar.ics"`,
      },
    });

  } catch (error) {
    console.error('Error in export-ical:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});