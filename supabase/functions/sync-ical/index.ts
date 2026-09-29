import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-ICAL] ${step}${detailsStr}`);
};

// Import this far ahead; channels rarely publish more than a year or two
const HORIZON_DAYS = 730;
const CHANNEL_PREFIX = 'Blocked by ';

interface Feed {
  id: string;
  property_id: string;
  name: string;
  url: string;
}

interface FeedResult {
  feedId: string;
  name: string;
  ok: boolean;
  events: number;
  error?: string;
}

// Syncs one feed ({ feedId }, the host's "Sync now" button), one property
// ({ propertyId }) or every active feed ({}, the cron job). All active feeds of
// a property are synced together so a date that another channel still blocks
// is never released.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    // dryRun: report what would change without writing anything
    const { feedId, propertyId, dryRun = false } = body as { feedId?: string; propertyId?: string; dryRun?: boolean };

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let scopeProperty = propertyId;
    if (feedId) {
      const { data: feed, error } = await supabaseClient
        .from('ical_feeds')
        .select('property_id')
        .eq('id', feedId)
        .eq('active', true)
        .maybeSingle();
      if (error || !feed) throw new Error(`Feed not found: ${error?.message ?? feedId}`);
      scopeProperty = feed.property_id;
    }

    let query = supabaseClient
      .from('ical_feeds')
      .select('id, property_id, name, url')
      .eq('active', true)
      .order('name');
    if (scopeProperty) query = query.eq('property_id', scopeProperty);

    const { data: feeds, error: feedsError } = await query;
    if (feedsError) throw feedsError;

    const byProperty = new Map<string, Feed[]>();
    for (const feed of (feeds ?? []) as Feed[]) {
      byProperty.set(feed.property_id, [...(byProperty.get(feed.property_id) ?? []), feed]);
    }

    let eventsProcessed = 0;
    let datesUpdated = 0;
    let datesReleased = 0;
    const feedResults: FeedResult[] = [];
    const preview: Record<string, { block: string[]; release: string[] }> = {};

    for (const [property, propertyFeeds] of byProperty) {
      const result = await syncProperty(supabaseClient, property, propertyFeeds, dryRun);
      if (dryRun) preview[property] = { block: result.blockDates, release: result.releaseDates };
      eventsProcessed += result.feeds.reduce((sum, f) => sum + f.events, 0);
      datesUpdated += result.blocked;
      datesReleased += result.released;
      feedResults.push(...result.feeds);
    }

    logStep("Sync completed", { properties: byProperty.size, eventsProcessed, datesUpdated, datesReleased });

    // The "Sync now" button reports the feed it asked for
    const requested = feedId ? feedResults.find((f) => f.feedId === feedId) : undefined;
    if (requested && !requested.ok) {
      throw new Error(`${requested.name}: ${requested.error}`);
    }

    return new Response(JSON.stringify({
      success: feedResults.every((f) => f.ok),
      eventsProcessed,
      datesUpdated,
      datesReleased,
      feeds: feedResults,
      ...(dryRun ? { dryRun, preview } : {}),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-ical", { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function syncProperty(supabase: SupabaseClient, propertyId: string, feeds: Feed[], dryRun: boolean) {
  const today = stockholmToday();
  const horizon = addDays(today, HORIZON_DAYS);

  // Dates each channel currently blocks
  const feedDates = new Map<string, Set<string>>();
  const results: FeedResult[] = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url, {
        headers: { "User-Agent": "NordicGetaways-CalendarSync/1.0" },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`Calendar link returned HTTP ${response.status}`);
      const icalData = await response.text();
      if (!icalData.includes('BEGIN:VCALENDAR')) throw new Error('Calendar link did not return an iCal calendar');

      const events = parseICalEvents(icalData);
      const dates = new Set<string>();
      for (const event of events) {
        for (let d = event.start; d < event.end; d = addDays(d, 1)) {
          if (d >= today && d < horizon) dates.add(d);
        }
      }
      feedDates.set(feed.name, dates);
      results.push({ feedId: feed.id, name: feed.name, ok: true, events: events.length });

      if (!dryRun) await supabase
        .from('ical_feeds')
        .update({ last_sync: new Date().toISOString(), sync_status: 'success', error_message: null })
        .eq('id', feed.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logStep("Feed failed", { feedId: feed.id, name: feed.name, message });
      results.push({ feedId: feed.id, name: feed.name, ok: false, events: 0, error: message });

      if (!dryRun) await supabase
        .from('ical_feeds')
        .update({ sync_status: 'error', error_message: message })
        .eq('id', feed.id);
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('availability')
    .select('date, available, reason')
    .eq('property_id', propertyId)
    .gte('date', today)
    .lt('date', horizon)
    .range(0, 9999);
  if (existingError) throw existingError;

  const existing = new Map(
    (existingRows ?? []).map((row) => [row.date as string, row as { available: boolean; reason: string | null }]),
  );

  // Block every date some channel holds. Keep the current label while that
  // channel still holds the date, and never overwrite a direct booking, a
  // host's own block or preparation days.
  const toBlock: { property_id: string; date: string; available: boolean; reason: string }[] = [];
  const blockedDates = new Set<string>();
  for (const [name, dates] of feedDates) {
    for (const date of dates) {
      if (blockedDates.has(date)) continue;
      blockedDates.add(date);

      const row = existing.get(date);
      const rowChannel = row?.reason?.startsWith(CHANNEL_PREFIX) ? row.reason.slice(CHANNEL_PREFIX.length) : null;
      if (row && !row.available && !rowChannel) continue;
      if (row && !row.available && rowChannel && feedDates.get(rowChannel)?.has(date)) continue;

      toBlock.push({ property_id: propertyId, date, available: false, reason: `${CHANNEL_PREFIX}${name}` });
    }
  }

  const summary = {
    feeds: results,
    blocked: toBlock.length,
    released: 0,
    blockDates: toBlock.map((r) => `${r.date} ${r.reason}`),
    releaseDates: [] as string[],
  };

  for (const chunk of dryRun ? [] : chunks(toBlock, 500)) {
    const { error } = await supabase.from('availability').upsert(chunk, { onConflict: 'property_id,date' });
    if (error) throw error;
  }

  // Release dates a channel no longer blocks (cancelled or moved bookings).
  // Only for channels we could read just now; a failing link keeps its dates.
  const toRelease = [...existing.entries()]
    .filter(([date, row]) => {
      if (row.available || !row.reason?.startsWith(CHANNEL_PREFIX)) return false;
      const channel = row.reason.slice(CHANNEL_PREFIX.length);
      const channelFailed = results.some((r) => !r.ok && r.name === channel);
      return !channelFailed && !blockedDates.has(date);
    })
    .map(([date]) => date);
  summary.released = toRelease.length;
  summary.releaseDates = toRelease;

  for (const dates of dryRun ? [] : chunks(toRelease, 200)) {
    // Keep rows that carry a special price or minimum stay; drop the rest
    const { error: updateError } = await supabase
      .from('availability')
      .update({ available: true, reason: null })
      .eq('property_id', propertyId)
      .like('reason', `${CHANNEL_PREFIX}%`)
      .in('date', dates);
    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from('availability')
      .delete()
      .eq('property_id', propertyId)
      .eq('available', true)
      .is('reason', null)
      .is('seasonal_price', null)
      .lte('minimum_nights', 1)
      .in('date', dates);
    if (deleteError) throw deleteError;
  }

  logStep("Property synced", { propertyId, dryRun, blocked: toBlock.length, released: toRelease.length });
  return summary;
}

function parseICalEvents(icalData: string) {
  const events: { start: string; end: string }[] = [];
  // Unfold continuation lines (RFC 5545 3.1)
  const lines = icalData.replace(/\r?\n[ \t]/g, '').split(/\r?\n/).map((line) => line.trim());

  let current: { start?: string; end?: string; cancelled?: boolean } | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      if (current.start && !current.cancelled) {
        // An all-day event without DTEND lasts one day
        const end = current.end && current.end > current.start ? current.end : addDays(current.start, 1);
        events.push({ start: current.start, end });
      }
      current = null;
    } else if (current) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const key = line.slice(0, colon).split(';')[0];
      const value = line.slice(colon + 1);

      if (key === 'DTSTART') current.start = parseICalDate(value);
      else if (key === 'DTEND') current.end = parseICalDate(value);
      else if (key === 'STATUS' && value === 'CANCELLED') current.cancelled = true;
    }
  }

  return events;
}

// "20261220" or "20261220T150000Z" -> "2026-12-20" (the night the guest arrives)
function parseICalDate(value: string): string | undefined {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : undefined;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function stockholmToday(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }).format(new Date());
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
