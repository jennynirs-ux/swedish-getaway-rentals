import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-ICAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { feedId } = await req.json();
    
    if (!feedId) {
      throw new Error("Feed ID is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    logStep("Getting iCal feed", { feedId });

    // Get the iCal feed
    const { data: feed, error: feedError } = await supabaseClient
      .from('ical_feeds')
      .select('*')
      .eq('id', feedId)
      .eq('active', true)
      .single();

    if (feedError || !feed) {
      throw new Error(`Feed not found: ${feedError?.message}`);
    }

    logStep("Found feed", { feedUrl: feed.url, propertyId: feed.property_id });

    // Fetch the iCal data
    const response = await fetch(feed.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
    }

    const icalData = await response.text();
    logStep("iCal data fetched", { dataLength: icalData.length });

    // Parse iCal events (simple parser for VEVENT blocks)
    const events = parseICalEvents(icalData);
    logStep("Parsed events", { eventCount: events.length });

    // Update availability based on events
    let updatedDates = 0;
    for (const event of events) {
      const startDate = event.startDate;
      const endDate = event.endDate;
      
      // Block dates for each day in the event
      let currentDate = new Date(startDate);
      while (currentDate < endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Upsert availability (mark as unavailable)
        const { error: upsertError } = await supabaseClient
          .from('availability')
          .upsert({
            property_id: feed.property_id,
            date: dateStr,
            available: false,
            reason: `Blocked by ${feed.name}`,
          }, {
            onConflict: 'property_id,date'
          });

        if (upsertError) {
          logStep("Error upserting availability", { error: upsertError.message, date: dateStr });
        } else {
          updatedDates++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Update feed sync status
    const { error: updateError } = await supabaseClient
      .from('ical_feeds')
      .update({
        last_sync: new Date().toISOString(),
        sync_status: 'success',
        error_message: null
      })
      .eq('id', feedId);

    if (updateError) {
      logStep("Error updating feed status", { error: updateError.message });
    }

    logStep("Sync completed", { updatedDates, eventCount: events.length });

    return new Response(JSON.stringify({ 
      success: true, 
      eventsProcessed: events.length,
      datesUpdated: updatedDates 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-ical", { message: errorMessage });

    // Try to update the feed with error status
    try {
      const { feedId } = await req.json();
      if (feedId) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        await supabaseClient
          .from('ical_feeds')
          .update({
            sync_status: 'error',
            error_message: errorMessage
          })
          .eq('id', feedId);
      }
    } catch (updateError) {
      logStep("Failed to update error status", { error: updateError });
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function parseICalEvents(icalData: string) {
  const events = [];
  const lines = icalData.split('\n').map(line => line.trim());
  
  let currentEvent: any = null;
  
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.startDate && currentEvent.endDate) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent && line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');
      
      if (key.startsWith('DTSTART')) {
        // Parse date (handle both DATE and DATETIME formats)
        const dateValue = value.replace(/[TZ]/g, '').substring(0, 8);
        currentEvent.startDate = parseICalDate(dateValue);
      } else if (key.startsWith('DTEND')) {
        const dateValue = value.replace(/[TZ]/g, '').substring(0, 8);
        currentEvent.endDate = parseICalDate(dateValue);
      } else if (key === 'SUMMARY') {
        currentEvent.summary = value;
      }
    }
  }
  
  return events;
}

function parseICalDate(dateStr: string): Date {
  // Format: YYYYMMDD
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-based
  const day = parseInt(dateStr.substring(6, 8));
  
  return new Date(year, month, day);
}