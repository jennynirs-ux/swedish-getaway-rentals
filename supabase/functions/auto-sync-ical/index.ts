import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-SYNC-ICAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting automatic iCal sync");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active iCal feeds that need syncing
    const { data: feeds, error: feedsError } = await supabaseClient
      .from('ical_feeds')
      .select('*')
      .eq('active', true);

    if (feedsError) {
      throw feedsError;
    }

    logStep("Found active feeds", { count: feeds?.length || 0 });

    let syncedCount = 0;
    let errorCount = 0;

    for (const feed of feeds || []) {
      try {
        logStep("Syncing feed", { feedId: feed.id, name: feed.name });

        // Call the sync-ical function for each feed
        const syncResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-ical`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ feedId: feed.id })
        });

        if (syncResponse.ok) {
          syncedCount++;
          logStep("Feed synced successfully", { feedId: feed.id });
        } else {
          errorCount++;
          logStep("Feed sync failed", { feedId: feed.id, status: syncResponse.status });
        }
      } catch (error) {
        errorCount++;
        logStep("Error syncing feed", { feedId: feed.id, error: error instanceof Error ? error.message : String(error) });
      }

      // Add a small delay between syncs to avoid overwhelming external services
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logStep("Auto-sync completed", { 
      totalFeeds: feeds?.length || 0,
      syncedCount,
      errorCount 
    });

    return new Response(JSON.stringify({ 
      success: true,
      totalFeeds: feeds?.length || 0,
      syncedCount,
      errorCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in auto-sync-ical", { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});