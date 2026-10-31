import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdmin, alertAdminOnce, sendEmail } from "../_shared/alert.ts";
import { isAdminOrService } from "../_shared/auth.ts";
import { stockholmToday } from "../_shared/format.ts";
import { type Lock, takeLock } from "../_shared/lock.ts";
import { stripeAutoPayout } from "../_shared/payout.ts";
import {
  DAC7_DEADLINE_DAYS,
  hasReminder,
  type HostNotice,
  hostDisplayName,
  hostReminderEmail,
  noticeRows,
  planHostReminders,
  previewEntry,
  type ReminderHost,
  type ReminderListing,
} from "../_shared/host-reminders.ts";

// Daily job (owner decision 31 Oct 2026) that e-mails approved hosts what is
// still missing, one e-mail per host per run (texts and rules in
// _shared/host-reminders.ts):
//  1. Listings never published (properties.first_published_at), 2 to 30 days
//     old: what is missing before they can be published (map pin and county,
//     the current host terms, Stripe payouts, the publish window's question
//     about other booking sites unless the listing has a calendar feed; or
//     just "press Publicera"), plus tips (photos, description, tax details).
//     At most 3 reminders per listing, at least 7 days apart.
//  2. DAC7, for hosts with a published listing (or asked before) and
//     incomplete tax details: the request, then two reminders at least 14
//     days apart. Once both are out and 60 days have passed, support is
//     alerted once: the law then requires closing the account or withholding
//     payouts, so a person decides. release-host-payouts holds the host's
//     payouts, but Stripe pays each share out on its own 90 days after the
//     guest paid; the alert lists those dates.
// Each e-mail that went out is recorded in host_notices (the trail DAC7 asks
// for, and what the cadence counts); nothing is recorded for an e-mail that
// failed. Only one run at a time (a lock), so two runs never send twice.
//
// Body: { dry_run: true } or { preview: true } returns what would be sent,
// without names or e-mail addresses, and sends and records nothing;
// { profile_ids: [...] } limits a run to those hosts. Both for admins and the
// service role only. A real run for every host (the cron's, with the public
// anon key, at most one per 20 hours) only runs once HOST_REMINDERS_ENABLED
// is "true": set it when the owner has approved the texts and the cron is
// scheduled.

// Called without the service role key: at most one real run per window, so
// the endpoint can't be used to mail hosts over and over
const PUBLIC_RUN_WINDOW_MS = 20 * 60 * 60 * 1000;
const PUBLIC_RUN_KEY = "send-host-reminders-run";
// Resend allows a few requests a second
const SEND_PAUSE_MS = 600;
// Edge functions are stopped after a few minutes; leave the rest for tomorrow
const TIME_BUDGET_MS = 100_000;
// Ids per .in() filter, to keep the request URL short
const IN_CHUNK = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Postgres' and PostgREST's codes for a table, or a column, that doesn't exist
const MISSING_TABLE = new Set(["42P01", "PGRST205"]);
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);

const HOST_COLUMNS =
  "id, email, full_name, display_name, host_business_name, stripe_connect_ready, host_terms_accepted_at, host_terms_version";
// first_published_at: migration 20261024114000
const LISTING_COLUMNS_BEFORE_MIGRATION = "id, host_id, title, active, latitude, longitude, county, gallery_images, description, created_at";
const LISTING_COLUMNS = `${LISTING_COLUMNS_BEFORE_MIGRATION}, first_published_at`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const errorText = (error: unknown) => (error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error));
const logAlertError = (alertError: unknown) => console.error("[SEND-HOST-REMINDERS] Alert failed:", errorText(alertError));
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One real run per 20 hours for callers without the service role key; false also when the log can't be read */
async function claimPublicRun(supabase: SupabaseClient): Promise<boolean> {
  const { count, error } = await supabase
    .from("security_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "job_run")
    .eq("user_agent", PUBLIC_RUN_KEY)
    .gte("created_at", new Date(Date.now() - PUBLIC_RUN_WINDOW_MS).toISOString());
  if (error || count) return false;
  const { error: insertError } = await supabase
    .from("security_audit_log")
    .insert({ action: "job_run", table_name: "host_notices", user_agent: PUBLIC_RUN_KEY });
  return !insertError;
}

/**
 * alertAdminOnce, but the key is saved only once the e-mail went out, so an
 * alert that could not be sent is tried again on the next run (alertAdminOnce
 * saves it first and can't tell a failed send). Throws when it was not sent.
 * lines is only called when the alert is still to be sent.
 */
async function alertAdminOnceSent(
  supabase: SupabaseClient,
  key: string,
  subject: string,
  lines: () => Promise<string[]>,
): Promise<void> {
  const { count, error } = await supabase
    .from("security_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "admin_alert")
    .eq("user_agent", key);
  if (error) throw new Error(`Could not read the alert log: ${error.message}`);
  if (count) return;
  if (!(await alertAdmin(subject, await lines()))) throw new Error("the e-mail to support could not be sent (see the function log)");
  const { error: saveError } = await supabase
    .from("security_audit_log")
    .insert({ action: "admin_alert", table_name: "alerts", user_agent: key });
  // Sent, so not a failure; it is only sent again on the next run
  if (saveError) console.error("[SEND-HOST-REMINDERS] Alert sent but not recorded, so it is sent again tomorrow:", key, saveError.message);
}

/** Rows whose column is one of ids, read in chunks */
async function selectIn<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  column: string,
  ids: string[],
): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await supabase.from(table).select(columns).in(column, ids.slice(i, i + IN_CHUNK));
    if (error) throw Object.assign(new Error(`Could not read ${table}: ${error.message}`), { code: error.code });
    rows.push(...((data ?? []) as unknown as T[]));
  }
  return rows;
}

interface RunOptions {
  dryRun: boolean;
  profileIds: string[] | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const body = await req.json().catch(() => ({}));
  // Strict, so that a mistyped dry run ({ dry_run: "true" }) or host list never becomes a real run for every host
  for (const flag of ["dry_run", "preview"]) {
    if (body?.[flag] !== undefined && typeof body[flag] !== "boolean") return json({ error: `${flag} must be true or false` }, 400);
  }
  const dryRun = body?.dry_run === true || body?.preview === true;
  let profileIds: string[] | null = null;
  if (body?.profile_ids !== undefined) {
    const ids = body.profile_ids;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string" && UUID.test(id))) {
      return json({ error: "profile_ids must be a list of profile ids" }, 400);
    }
    profileIds = [...new Set(ids as string[])];
  }

  const privileged = await isAdminOrService(req, supabase);
  if ((dryRun || profileIds) && !privileged) return json({ error: "Forbidden" }, 403);
  // Off until the owner has approved the texts: only dry runs and runs for named hosts until then
  if (!dryRun && !profileIds && Deno.env.get("HOST_REMINDERS_ENABLED") !== "true") {
    return json({ error: "Host reminders to every host are not switched on (HOST_REMINDERS_ENABLED)" }, 403);
  }
  if (!privileged && !(await claimPublicRun(supabase))) return json({ ok: true, skipped: "ran recently" });

  // A dry run sends and records nothing, so it needs no lock
  if (dryRun) {
    try {
      return await runJob(supabase, { dryRun, profileIds });
    } catch (runError) {
      console.error("[SEND-HOST-REMINDERS]", errorText(runError));
      return json({ ok: false, error: errorText(runError) }, 500);
    }
  }

  let runLock: Lock | null;
  try {
    runLock = await takeLock(supabase, "send-host-reminders");
  } catch (lockError) {
    console.error("[SEND-HOST-REMINDERS]", errorText(lockError));
    await alertAdminOnce(supabase, `host-reminders-job:${stockholmToday()}`, "Host reminder job failed", [
      errorText(lockError),
      "No host reminders were sent today. The job runs again tomorrow.",
    ]).catch(logAlertError);
    return json({ ok: false }, 500);
  }
  if (!runLock) return json({ ok: true, skipped: "another run is in progress" });
  try {
    return await runJob(supabase, { dryRun, profileIds });
  } catch (runError) {
    // Reading the hosts failed (e.g. host_notices is missing): nothing was sent
    console.error("[SEND-HOST-REMINDERS]", errorText(runError));
    await alertAdminOnce(supabase, `host-reminders-job:${stockholmToday()}`, "Host reminder job failed", [
      errorText(runError),
      "No host reminders were sent today. The job runs again tomorrow.",
    ]).catch(logAlertError);
    return json({ ok: false }, 500);
  } finally {
    await runLock.release();
  }
});

async function runJob(supabase: SupabaseClient, { dryRun, profileIds }: RunOptions): Promise<Response> {
  const now = new Date();
  const today = stockholmToday();
  const deadline = Date.now() + TIME_BUDGET_MS;

  let hostQuery = supabase.from("profiles").select(HOST_COLUMNS).eq("is_host", true).eq("host_approved", true);
  if (profileIds) hostQuery = hostQuery.in("id", profileIds);
  const { data: hostData, error: hostError } = await hostQuery;
  if (hostError) throw new Error(`Could not read the hosts: ${hostError.message}`);
  const hosts = (hostData ?? []) as unknown as ReminderHost[];
  const hostIds = hosts.map((h) => h.id);

  // A dry run may preview the texts before the migration is applied; a real
  // run never sends without the trail or first_published_at
  const warnings: string[] = [];
  const beforeMigration = (readError: unknown, codes: Set<string>) =>
    dryRun && codes.has((readError as { code?: string }).code ?? "");
  const [listings, taxRows, notices] = await Promise.all([
    selectIn<ReminderListing>(supabase, "properties", LISTING_COLUMNS, "host_id", hostIds).catch((listingError) => {
      if (!beforeMigration(listingError, MISSING_COLUMN)) throw listingError;
      warnings.push("properties.first_published_at does not exist yet (migration not applied): listings unpublished after being live are shown as if never published");
      return selectIn<ReminderListing>(supabase, "properties", LISTING_COLUMNS_BEFORE_MIGRATION, "host_id", hostIds);
    }),
    selectIn<{ profile_id: string; dac7_complete: boolean }>(supabase, "host_tax_profiles", "profile_id, dac7_complete", "profile_id", hostIds),
    selectIn<HostNotice & { profile_id: string }>(supabase, "host_notices", "profile_id, kind, property_id, sent_at", "profile_id", hostIds)
      .catch((noticeError) => {
        if (!beforeMigration(noticeError, MISSING_TABLE)) throw noticeError;
        warnings.push("host_notices does not exist yet (migration not applied): shown as if no reminder had been sent before");
        return [];
      }),
  ]);
  const taxComplete = new Set(taxRows.filter((t) => t.dac7_complete).map((t) => t.profile_id));
  // The publish window's "Andra bokningssajter" step is done with a calendar feed
  const unpublishedIds = listings.filter((l) => !l.active).map((l) => l.id);
  const feeds = await selectIn<{ property_id: string }>(supabase, "ical_feeds", "property_id", "property_id", unpublishedIds);
  const withFeed = new Set(feeds.map((f) => f.property_id));
  for (const l of listings) l.has_calendar_feed = withFeed.has(l.id);

  const previews: ReturnType<typeof previewEntry>[] = [];
  const failures: string[] = [];
  let emailed = 0;
  let recorded = 0;
  let overdue = 0;
  let deferred = 0;

  for (const host of hosts) {
    const label = host.id.slice(0, 8);
    try {
      const plan = planHostReminders(
        host,
        listings.filter((l) => l.host_id === host.id),
        taxComplete.has(host.id),
        notices.filter((n) => n.profile_id === host.id),
        now,
      );
      if (dryRun) {
        if (hasReminder(plan) || plan.dac7Overdue) previews.push(previewEntry(host, plan));
        continue;
      }
      if (Date.now() > deadline) {
        if (hasReminder(plan) || plan.dac7Overdue) deferred++;
        continue;
      }

      if (plan.dac7Overdue) {
        overdue++;
        await alertDac7Overdue(
          supabase,
          host.id,
          listings.filter((l) => l.host_id === host.id),
          notices.filter((n) => n.profile_id === host.id),
          today,
        ).catch((alertError) => {
          // Not saved as sent, so it is tried again tomorrow
          logAlertError(alertError);
          failures.push(`${label}: the DAC7 overdue alert failed (${errorText(alertError)})`);
        });
      }
      if (!hasReminder(plan)) continue;

      if (!host.email) throw new Error("the host has no e-mail address");
      const { subject, html } = hostReminderEmail(hostDisplayName(host), plan);
      if (emailed > 0) await pause(SEND_PAUSE_MS);
      if (!(await sendEmail(host.email, subject, html))) throw new Error("the e-mail could not be sent (see the function log)");
      emailed++;

      const rows = noticeRows(host.id, plan);
      const { error: recordError } = await supabase.from("host_notices").insert(rows);
      if (recordError) {
        // Sent but not in the trail: the next run would send it again, and the DAC7 trail misses it
        await alertAdminOnce(supabase, `host-notices-unrecorded:${host.id}:${today}`, "Host reminder sent but not recorded", [
          `A reminder went to host profile ${host.id}, but saving it in host_notices failed: ${recordError.message}`,
          `Add these rows by hand (sent_at ${now.toISOString()}), or the host is reminded again tomorrow: ${JSON.stringify(rows)}`,
        ]).catch(logAlertError);
        failures.push(`${label}: sent, but not recorded (${recordError.message})`);
        continue;
      }
      recorded += rows.length;
    } catch (hostError) {
      console.error("[SEND-HOST-REMINDERS] Host", label, errorText(hostError));
      failures.push(`${label}: ${errorText(hostError)}`);
    }
  }

  if (dryRun) return json({ ok: true, dryRun: true, ...(warnings.length ? { warnings } : {}), hosts: previews, failed: failures });

  if (failures.length) {
    await alertAdminOnce(supabase, `host-reminders-failed:${today}`, "Host reminders failed", [
      `Reminders to ${failures.length} host(s) failed (profile ids start with):`,
      ...failures,
      "The job tries again tomorrow; nothing is recorded for an e-mail that was not sent.",
    ]).catch(logAlertError);
  }
  console.log(`[SEND-HOST-REMINDERS] ${emailed} e-mailed, ${recorded} notices, ${overdue} DAC7 overdue, ${failures.length} failed, ${deferred} deferred`);
  return json({ ok: failures.length === 0, emailed, notices: recorded, dac7Overdue: overdue, failed: failures.length, deferred });
}

/**
 * Tells support once that a host's tax details are still missing after the
 * request, both reminders and 60 days. Withholding is only partly in our
 * hands: release-host-payouts holds the host's payouts, but Stripe pays a
 * share left in the host's account out on its own 90 days after the guest
 * paid, so the alert lists when that happens for each held booking. Throws
 * when it could not be sent (it is then tried again on the next run).
 */
async function alertDac7Overdue(
  supabase: SupabaseClient,
  hostId: string,
  hostListings: ReminderListing[],
  hostNotices: HostNotice[],
  today: string,
): Promise<void> {
  const dates = (kind: string) =>
    hostNotices.filter((n) => n.kind === kind).map((n) => n.sent_at.slice(0, 10)).sort().join(", ");
  const published = hostListings.filter((l) => l.active).map((l) => l.title || l.id);
  await alertAdminOnceSent(supabase, `dac7-overdue:${hostId}`, "Host's tax details still missing after 60 days", async () => {
    let held: { id: string; created_at: string; check_in_date: string }[] = [];
    if (hostListings.length) {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, created_at, check_in_date")
        .eq("host_payout_status", "held")
        .in("property_id", hostListings.map((l) => l.id));
      if (error) throw new Error(`Could not read the host's held bookings: ${error.message}`);
      held = (data ?? []) as typeof held;
    }
    const stripePays = held
      .map((b) => ({ b, auto: stripeAutoPayout(b.created_at, today) }))
      .sort((x, y) => x.auto.on.localeCompare(y.auto.on))
      .map(({ b, auto }) =>
        `Booking ${b.id} (check-in ${b.check_in_date}): ${
          auto.daysLeft > 0 ? `Stripe pays it out on its own on ${auto.on}, in ${auto.daysLeft} day(s)` : `Stripe's own payout was due ${auto.on}, so it may already have been paid out`
        }.`
      );
    return [
      `Host profile ${hostId} (${published.length ? `published: ${published.join(", ")}` : "no listing published right now"}) has no complete tax details (DAC7).`,
      `We asked on ${dates("dac7_request")} and reminded on ${dates("dac7_reminder")}; ${DAC7_DEADLINE_DAYS} days have passed since we asked.`,
      "The law (DAC7) now requires us to close the host's account or withhold their payouts until the details are in.",
      held.length
        ? `release-host-payouts pays this host nothing until then, but that only withholds a share until Stripe pays it out on its own, 90 days after the guest paid (support also gets an alert per booking from day 80). Held now:`
        : "No booking of this host is held for payout right now.",
      ...stripePays,
      "A person decides: contact the host, close the account, or withhold the payouts beyond Stripe's 90 days (e.g. by reversing the transfers). This alert is not repeated.",
    ];
  });
}
