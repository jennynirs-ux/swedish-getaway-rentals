import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdminOnce, sendEmail, SUPPORT_EMAIL } from "../_shared/alert.ts";
import { escapeHtml, isAdminOrService } from "../_shared/auth.ts";
import { longDate, stockholmToday } from "../_shared/format.ts";
import { HOST_LOCK_WAIT_MS, hostMoneyLock, type Lock, LOCK_BUSY, takeLock } from "../_shared/lock.ts";
import {
  bookingPayoutTarget,
  daysPastDue,
  dayAfterCheckIn,
  expectedHostReduction,
  heldBalanceShortfall,
  hostHoldsFromTransfer,
  hostShareAmount,
  isOwnRefundRecovery,
  ownRecoveryFromTransfer,
  payableNow,
  pendingHostReduction,
  remainingHostShare,
  shareTakenBack,
  stableUuid,
  stripeAutoPayout,
} from "../_shared/payout.ts";
import {
  CHARGE_CLAIM_PREFIX,
  describeBooking,
  effectiveDueOn,
  livePayout,
  loadStripeMoney,
  MONEY_BOOKING_COLUMNS,
  type MoneyBooking,
  openRefundRecoveries,
  reconcileBookingMoney,
  type StripeMoney,
} from "../_shared/booking-money.ts";

// Daily job (cron) that pays hosts (owner decisions 21 Oct 2026). A
// destination charge leaves the host's share in the host's own Stripe
// balance; their Express account is on manual payouts, so the money only
// reaches their bank when this job pays it out, on host_payout_due_on: the
// day after check-in, or 85 days after the guest paid if that comes first, so
// we always pay before Stripe's 90-day limit and Stripe never pays out held
// money on its own (unless a host's tax details are missing, see 3). Each run:
//  0. Payouts made in the last 30 days that failed or were canceled put their
//     booking back to held (and alert), so it is paid again. Host-charge
//     settlements interrupted by a crash are finished or released.
//  1. Held bookings saved before the 85-day rule get the earlier due date.
//  2. Every booking whose refunds still require more from the host than was
//     taken (held, due or not; or paid_out with a refund after payout not yet
//     recorded as a host charge) is reconciled again before anything is paid:
//     reversed from its transfer, or recorded as a host charge.
//  3. Per host with something due:
//     Nothing is paid to a host whose DAC7 tax details are not complete
//     (host_tax_profiles.dac7_complete, read for all hosts at once; owner
//     decision 31 Oct 2026): their bookings stay held. The first time a due
//     booking is held this way the host is e-mailed (one e-mail per run for
//     all such bookings) and it is recorded in host_notices, so it is never
//     sent again. From 80 days after the guest paid, support is alerted once
//     per booking, due or not (a stay booked months ahead is only due on day
//     85), since Stripe pays out held money on its own after 90.
//     Bookings without a host are not affected. For every other host:
//     a. Stripe's figures for all their held bookings; any refund Stripe
//        shows that the database hasn't taken back yet is reconciled.
//     b. Safety stop: per Stripe account, available + pending must cover what
//        the held bookings hold less our payouts for them. If not (money left
//        the account in a way we did not record, e.g. an automatic Stripe
//        payout or the host's own), nothing is paid to that host this run and
//        support gets the numbers and the payouts that caused it. Nothing is
//        ever marked paid on a guess.
//     c. Each due booking, oldest first: reconciled again with fresh Stripe
//        figures (nothing is paid while a reduction is pending); its own
//        refunds after payout still open as host charges taken from its own
//        transfer if its payout failed and the money came back (without
//        lowering what it pays); the host's other open charges (card fees,
//        other bookings' refunds after payout) settled by reversing them from
//        this booking's transfer (in part if needed, never more than what is
//        left of this booking); then min(what is left, available) paid out.
//        Short of funds: stays held, alert after 3 days.
// Only one run at a time (a lock in job_locks; a second run stops at once),
// and each host is handled under the host's money lock, which cancellations
// and refund webhooks take too: a refund reversed from a booking's transfer
// can't land between this job reading Stripe's figures and paying out. Every
// Stripe call also carries an idempotency key. A payout's comes from the
// booking and what was paid for it before, never the amount (which depends on
// each run's balance), so a repeated run never pays a booking twice. A host
// charge is claimed in the database before it is reversed; a run that finds
// one of its booking's charges claimed (or loses a claim) pays nothing for
// that booking until the next run.
//
// 'Manual' bookings (no transfer: the money reached our own account and a
// person pays the host by hand) are due the day after check-in. The 85-day
// limit is about money waiting in a host's Stripe account; ours has none, and
// paying by hand months before the stay only adds refund risk (accepted
// deviation from the 85-day rule).

// A payout still waiting for the host's balance this many days after it was
// due gets an alert
const WAIT_ALERT_DAYS = 3;
// A payout held for the host's tax details this many days after the guest
// paid gets an alert: Stripe pays it out on its own at 90 (STRIPE_AUTO_PAYOUT_DAYS)
const TAX_HOLD_ALERT_DAYS = 80;
// Where the host fills in their tax details ("Utbetalningar & skatt")
const PAYOUTS_TAB_URL = "https://nordic-getaways.com/host-dashboard?tab=payouts";
// Payouts younger than this are checked for a late failure
const RECHECK_DAYS = 30;
// Payouts we didn't make, this far back, are named in the safety stop's alert
const FOREIGN_PAYOUT_DAYS = 90;
// A host-charge settlement claimed this long ago and not finished was interrupted
const STALE_CLAIM_MS = 60 * 60 * 1000;
// Edge functions are stopped after a few minutes; leave the rest for tomorrow
const TIME_BUDGET_MS = 100_000;
// Called without the service role key (the cron's anon key, or anyone with
// it): at most one run per window, so the endpoint can't be used to burn the
// Stripe rate limit
const PUBLIC_RUN_WINDOW_MS = 15 * 60 * 1000;
// Statuses whose due share is paid out (a cancelled booking keeps what the
// cancellation left the host)
const PAYABLE_STATUSES = new Set(["confirmed", "completed", "cancelled"]);
// host_charges.settled_by while a settlement is in progress
const CLAIM_PREFIX = CHARGE_CLAIM_PREFIX;
const HOST_CHARGE_COLUMNS = "id, host_profile_id, booking_id, amount, currency, reason, settled_by";

type Outcome = "paidOut" | "partial" | "settled" | "nothingLeft" | "waiting" | "blocked";
type Counts = Record<
  Outcome | "manual" | "failed" | "payoutsFailed" | "deferredHosts" | "dueDatesMoved" | "reductionsRetried" | "safetyStops" | "claimsRecovered" | "heldForTax",
  number
>;

interface HeldEntry {
  booking: MoneyBooking;
  money: StripeMoney;
  transfer: Stripe.Transfer;
  /** What the host holds in Stripe from this booking (our payouts not deducted) */
  holds: number;
}

/** Shared across one host account's bookings in this run */
interface AccountRun {
  accountId: string;
  currency: string;
  /** Available balance not yet used by this run */
  available: number;
  /** Payouts from this account since its oldest held transfer, or the last 90 days if longer (ours carry metadata.booking_id) */
  payouts: Stripe.Payout[];
  /** When the oldest held transfer was made (unix seconds) */
  oldestHeld: number;
}

interface HostCharge {
  id: string;
  host_profile_id: string;
  booking_id: string | null;
  amount: number;
  currency: string;
  reason: string;
  settled_by?: string | null;
}

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  !value ? null : typeof value === "string" ? value : value.id;

const kr = (ore: number) => `${(ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} kr`;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error));
const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);
const ourPayouts = (payouts: Stripe.Payout[], bookingId: string) => payouts.filter((p) => p.metadata?.booking_id === bookingId);
const logAlertError = (alertError: unknown) => console.error("[RELEASE-HOST-PAYOUTS] Alert failed:", errorText(alertError));
/** A name to greet with: the first one set that is not an e-mail address (full_name may hold one) */
const shownName = (...names: (string | null | undefined)[]) =>
  names.map((n) => n?.trim()).find((n) => n && !n.includes("@")) ?? null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** One run per window for callers without the service role key (check-then-insert; overlapping runs are safe anyway) */
async function claimPublicRun(supabase: SupabaseClient): Promise<boolean> {
  const key = `host-payouts-run:${Math.floor(Date.now() / PUBLIC_RUN_WINDOW_MS)}`;
  const { count } = await supabase
    .from("security_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "job_run")
    .eq("user_agent", key);
  if (count) return false;
  await supabase.from("security_audit_log").insert({ action: "job_run", table_name: "bookings", user_agent: key });
  return true;
}

async function heldBookings(supabase: SupabaseClient): Promise<MoneyBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(MONEY_BOOKING_COLUMNS)
    .eq("host_payout_status", "held")
    .order("host_payout_due_on");
  if (error) throw new Error(`Could not read the bookings held for payout: ${error.message}`);
  return (data ?? []) as unknown as MoneyBooking[];
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  if (!(await isAdminOrService(req, supabase)) && !(await claimPublicRun(supabase))) {
    return json({ ok: true, skipped: "ran recently" });
  }
  let runLock: Lock | null;
  try {
    runLock = await takeLock(supabase, "release-host-payouts");
  } catch (lockError) {
    // E.g. the job_locks table is missing: nobody is paid until it is fixed
    console.error("[RELEASE-HOST-PAYOUTS]", errorText(lockError));
    await alertAdminOnce(supabase, `host-payouts-job:${stockholmToday()}`, "Host payout job failed", [
      errorText(lockError),
      "No host was paid today. The job runs again tomorrow.",
    ]).catch(logAlertError);
    return json({ ok: false }, 500);
  }
  if (!runLock) return json({ ok: true, skipped: "another run is in progress" });
  try {
    return await runJob(supabase);
  } finally {
    await runLock.release();
  }
});

async function runJob(supabase: SupabaseClient): Promise<Response> {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  const today = stockholmToday();
  const deadline = Date.now() + TIME_BUDGET_MS;
  const counts: Counts = {
    paidOut: 0, partial: 0, settled: 0, nothingLeft: 0, waiting: 0, blocked: 0, manual: 0, failed: 0,
    payoutsFailed: 0, deferredHosts: 0, dueDatesMoved: 0, reductionsRetried: 0, safetyStops: 0, claimsRecovered: 0,
    heldForTax: 0,
  };

  // 0. Payouts that failed after we marked their booking paid out, and
  // host-charge settlements a crash left half done
  for (const [name, step] of [
    ["re-check recent host payouts", async () => (counts.payoutsFailed = await recheckRecentPayouts(stripe, supabase))],
    ["finish interrupted host-charge settlements", async () => (counts.claimsRecovered = await recoverChargeClaims(stripe, supabase))],
  ] as const) {
    try {
      await step();
    } catch (stepError) {
      counts.failed++;
      console.error("[RELEASE-HOST-PAYOUTS]", name, errorText(stepError));
      await alertAdminOnce(supabase, `host-payouts-step:${name}:${today}`, "Host payout check failed", [
        `Could not ${name}: ${errorText(stepError)}`,
        "The job tries again tomorrow.",
      ]).catch(logAlertError);
    }
  }

  let held: MoneyBooking[];
  let taxReady: Set<string>;
  try {
    held = await heldBookings(supabase);
    // 1. Due dates from before the 85-day rule
    counts.dueDatesMoved = await moveDueDates(supabase, held);
    // 2. Refunds not yet fully taken from the host, due or not
    counts.reductionsRetried = await retryPendingReductions(stripe, supabase, held, counts);
    held = await heldBookings(supabase);
    // Hosts whose tax details are complete: step 3 pays no other host (bookings without one aside)
    taxReady = await hostsWithTaxDetails(supabase, held);
  } catch (readError) {
    console.error("[RELEASE-HOST-PAYOUTS]", errorText(readError));
    await alertAdminOnce(supabase, `host-payouts-job:${today}`, "Host payout job failed", [
      errorText(readError),
      "No host was paid today. The job runs again tomorrow.",
    ]).catch(logAlertError);
    return json({ ok: false }, 500);
  }

  // 3. Hosts with something due, the longest-waiting first
  const isDue = (b: MoneyBooking) => effectiveDueOn(b) <= today && PAYABLE_STATUSES.has(b.status);
  const byHost = new Map<string, MoneyBooking[]>();
  for (const b of held) {
    const hostId = b.properties?.host_id ?? `no-host:${b.id}`;
    byHost.set(hostId, [...(byHost.get(hostId) ?? []), b]);
  }
  const earliestDue = (bookings: MoneyBooking[]) => bookings.filter(isDue).map((b) => effectiveDueOn(b)).sort()[0] ?? "9999";
  // Hosts without complete tax details: every held booking nearing Stripe's
  // own payout is alerted, due or not (cheap, no Stripe call)
  for (const bookings of byHost.values()) {
    const hostProfileId = bookings[0].properties?.host_id;
    if (hostProfileId && !taxReady.has(hostProfileId)) await alertTaxHoldNearingStripe(supabase, hostProfileId, bookings, today);
  }
  const hosts = [...byHost.entries()]
    .filter(([, bookings]) => bookings.some(isDue))
    .sort(([, a], [, b]) => earliestDue(a).localeCompare(earliestDue(b)));

  for (const [hostId, bookings] of hosts) {
    // No complete tax details: nothing paid, no Stripe call (cheap, so done
    // past the time budget too, which keeps the host's e-mail from being put off)
    const hostProfileId = bookings[0].properties?.host_id;
    if (hostProfileId && !taxReady.has(hostProfileId)) {
      const due = bookings.filter(isDue);
      counts.heldForTax += due.length;
      await holdForTaxDetails(supabase, hostProfileId, due, today);
      continue;
    }
    if (Date.now() > deadline) {
      counts.deferredHosts++;
      continue;
    }
    try {
      await releaseHost(stripe, supabase, hostId, bookings, isDue, today, counts);
    } catch (hostError) {
      counts.failed++;
      console.error("[RELEASE-HOST-PAYOUTS] Host", hostId, errorText(hostError));
      await alertAdminOnce(supabase, `host-payouts-host:${hostId}:${today}`, "Host payout failed", [
        `Host profile ${hostId}: ${bookings.filter(isDue).length} booking(s) due.`,
        `Stripe or the database said: ${errorText(hostError)}`,
        "The bookings stay held and the job tries again tomorrow.",
      ]).catch(logAlertError);
    }
  }

  console.log("[RELEASE-HOST-PAYOUTS]", today, counts);
  // Counts only: the endpoint is reachable with the public key
  return json({ ok: counts.failed === 0, ...counts });
}

/** 1. Held bookings saved with the day after check-in although the guest paid more than 85 days before it */
async function moveDueDates(supabase: SupabaseClient, held: MoneyBooking[]): Promise<number> {
  let moved = 0;
  for (const b of held) {
    const due = effectiveDueOn(b);
    if (due === b.host_payout_due_on) continue;
    const { error } = await supabase
      .from("bookings")
      .update({ host_payout_due_on: due })
      .eq("id", b.id)
      .eq("host_payout_status", "held");
    if (error) throw new Error(`Moving the payout date of booking ${b.id} failed: ${error.message}`);
    b.host_payout_due_on = due;
    moved++;
  }
  return moved;
}

/**
 * 2. Every booking whose refunds still require more from the host's share
 * than was taken (a reversal or a host charge failed, or never ran), whatever
 * its due date: reconciled again, so the alerts' "retried every day" holds.
 * Held bookings stay unpaid until it succeeds.
 */
async function retryPendingReductions(stripe: Stripe, supabase: SupabaseClient, held: MoneyBooking[], counts: Counts): Promise<number> {
  const { data: paidOut, error } = await supabase
    .from("bookings")
    .select(MONEY_BOOKING_COLUMNS)
    .eq("host_payout_status", "paid_out")
    .gt("refunded_amount", 0);
  if (error) throw new Error(`Could not read paid-out bookings with refunds: ${error.message}`);
  const pending = [...held, ...((paidOut ?? []) as unknown as MoneyBooking[])].filter((b) => pendingHostReduction(b) > 0);
  let retried = 0;
  for (const booking of pending) {
    try {
      await reconcileBookingMoney(stripe, supabase, booking, { context: "payout job: refund not yet taken from the host (daily retry)" });
      retried++;
    } catch (reconcileError) {
      // A cancellation or webhook is on it right now; a held booking is
      // reconciled again under the lock before it is paid
      if ((reconcileError as { code?: string }).code === LOCK_BUSY) {
        counts.blocked++;
        continue;
      }
      counts.failed++;
      await bookingFailed(supabase, booking, reconcileError);
    }
  }
  return retried;
}

/** The hosts of these bookings whose DAC7 tax details are complete (host_tax_profiles.dac7_complete), in one query */
async function hostsWithTaxDetails(supabase: SupabaseClient, bookings: MoneyBooking[]): Promise<Set<string>> {
  const hostIds = [...new Set(bookings.map((b) => b.properties?.host_id).filter((id): id is string => !!id))];
  if (!hostIds.length) return new Set();
  const { data, error } = await supabase
    .from("host_tax_profiles")
    .select("profile_id, dac7_complete")
    .in("profile_id", hostIds);
  if (error) throw new Error(`Could not read the hosts' tax details: ${error.message}`);
  const rows = (data ?? []) as { profile_id: string; dac7_complete: boolean | null }[];
  return new Set(rows.filter((t) => t.dac7_complete === true).map((t) => t.profile_id));
}

/**
 * 3. A host whose tax details are not complete: support is alerted once per
 * held booking, due or not, from 80 days after the guest paid. Never throws.
 */
async function alertTaxHoldNearingStripe(supabase: SupabaseClient, hostId: string, held: MoneyBooking[], today: string) {
  for (const b of held) {
    const stripePays = stripeAutoPayout(b.created_at, today);
    if (stripePays.daysSincePaid < TAX_HOLD_ALERT_DAYS) continue;
    const left = stripePays.daysLeft;
    await alertAdminOnce(supabase, `host-payout-tax-hold:${b.id}`, "Host payout held for tax details: Stripe pays it out on its own soon", [
      describeBooking(b),
      `Not paid out: the host (profile ${hostId}) has no complete tax details (DAC7, host_tax_profiles.dac7_complete), and the job pays nothing until they do.`,
      `The guest paid ${stripePays.daysSincePaid} days ago (${stripePays.paidOn}). Stripe pays out money left in the host's account for 90 days on its own: ${
        left > 0 ? `${left} day${left === 1 ? "" : "s"} left (${stripePays.on})` : `that was due ${stripePays.on}, so it may already have happened`
      }.`,
      left > 0
        ? "A person must act: get the host to fill in their tax details under Utbetalningar & skatt before then (the job then pays this booking on its first run once it is due), or decide what to do with this payout."
        : "If Stripe has paid it out on its own, the job's balance check will stop this host's payouts once their tax details are in; mark this booking paid out with Stripe's payout id then (see that alert's steps). Otherwise get the host to fill in their tax details.",
    ]).catch(logAlertError);
  }
}

/**
 * 3. A host whose tax details are not complete: their due bookings stay held
 * and nothing is paid; the host is told about bookings held for the first
 * time. Never throws: the bookings stay held whatever fails here.
 */
async function holdForTaxDetails(supabase: SupabaseClient, hostId: string, due: MoneyBooking[], today: string) {
  try {
    await tellHostPayoutHeld(supabase, hostId, due);
  } catch (noticeError) {
    console.error("[RELEASE-HOST-PAYOUTS] Tax-hold notice for host", hostId, errorText(noticeError));
    await alertAdminOnce(supabase, `host-tax-hold-notice:${hostId}:${today}`, "Host not told that their payout waits for tax details", [
      `Host profile ${hostId}: ${due.length} due booking(s) stay held until the host completes their tax details, but telling them failed: ${errorText(noticeError)}`,
      "The payouts stay held either way. The job tries again tomorrow.",
    ]).catch(logAlertError);
  }
}

/**
 * E-mails the host once about the due bookings held for their tax details
 * that they have not been told about yet (one e-mail for all of them), and
 * records each in host_notices, which keeps it from being sent again.
 */
async function tellHostPayoutHeld(supabase: SupabaseClient, hostId: string, due: MoneyBooking[]) {
  if (!due.length) return;
  const { data: told, error: toldError } = await supabase
    .from("host_notices")
    .select("booking_id")
    .eq("profile_id", hostId)
    .eq("kind", "payout_held_tax")
    .in("booking_id", due.map((b) => b.id));
  if (toldError) throw new Error(`Reading the host's earlier notices failed: ${toldError.message}`);
  const toldIds = new Set(((told ?? []) as { booking_id: string | null }[]).map((n) => n.booking_id));
  const fresh = due.filter((b) => !toldIds.has(b.id)).sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
  if (!fresh.length) return;

  const [listings, host] = await Promise.all([
    // property_id is not among the money columns
    supabase.from("bookings").select("id, property_id").in("id", fresh.map((b) => b.id)),
    supabase.from("profiles").select("email, display_name, full_name").eq("id", hostId).maybeSingle(),
  ]);
  if (listings.error) throw new Error(`Reading the bookings' property ids failed: ${listings.error.message}`);
  if (host.error) throw new Error(`Reading the host's profile failed: ${host.error.message}`);
  const profile = host.data as { email: string | null; display_name: string | null; full_name: string | null } | null;
  if (!profile?.email) throw new Error("The host's profile has no e-mail address");

  const email = taxHoldEmail(shownName(profile.display_name, profile.full_name), fresh);
  if (!(await sendEmail(profile.email, email.subject, email.html))) throw new Error("Sending the e-mail failed (see the function's log)");
  // Recorded once it is sent: a failed send is tried again on the next run
  // (a failed save may send it twice, never not at all)
  const propertyOf = new Map(((listings.data ?? []) as { id: string; property_id: string | null }[]).map((r) => [r.id, r.property_id]));
  const { error: saveError } = await supabase.from("host_notices").insert(
    fresh.map((b) => ({
      profile_id: hostId,
      kind: "payout_held_tax",
      booking_id: b.id,
      property_id: propertyOf.get(b.id) ?? null,
      details: { missing: ["tax"] },
    })),
  );
  if (saveError) throw new Error(`The e-mail was sent, but recording it failed (${saveError.message}), so the next run sends it again`);
}

/** The host's e-mail (Swedish, like the host panel): these bookings' payouts wait for their tax details */
function taxHoldEmail(name: string | null, bookings: MoneyBooking[]): { subject: string; html: string } {
  const one = bookings.length === 1;
  const items = bookings
    .map((b) => `<li>${escapeHtml(b.properties?.title || "Ditt boende")}, incheckning ${escapeHtml(longDate(b.check_in_date, "sv"))}</li>`)
    .join("");
  return {
    subject: one ? "Din utbetalning väntar på dina skatteuppgifter" : "Dina utbetalningar väntar på dina skatteuppgifter",
    html: [
      `<p>Hej${name ? ` ${escapeHtml(name)}` : ""},</p>`,
      `<p>Det är dags att betala ut pengarna för ${one ? "den här bokningen" : "de här bokningarna"}:</p>`,
      `<ul>${items}</ul>`,
      "<p>Men vi har inte fått dina skatteuppgifter än. Enligt lag (EU:s DAC7-regler) måste vi samla in några uppgifter från alla värdar, och vi betalar ut när de är ifyllda.</p>",
      "<p>Pengarna ligger kvar och väntar på dig. Du fyller i uppgifterna under Utbetalningar &amp; skatt i värdpanelen – det tar bara några minuter – och när de är klara betalar vi ut automatiskt.</p>",
      `<p style="margin: 24px 0;"><a href="${PAYOUTS_TAB_URL}" style="background-color: #8b5e3c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">Fyll i skatteuppgifter</a></p>`,
      `<p>Frågor? Svara på det här mejlet eller skriv till ${SUPPORT_EMAIL}.</p>`,
      "<p>Jenny &amp; Jon, Nordic Getaways</p>",
    ].join("\n"),
  };
}

async function releaseHost(
  stripe: Stripe,
  supabase: SupabaseClient,
  hostId: string,
  listed: MoneyBooking[],
  isDue: (b: MoneyBooking) => boolean,
  today: string,
  counts: Counts,
) {
  // The host's money lock: a cancellation or refund webhook for this host
  // waits until we are done (or we wait for it)
  const lock = await takeLock(supabase, hostMoneyLock(listed[0].properties?.host_id, listed[0].id), HOST_LOCK_WAIT_MS);
  if (!lock) {
    counts.blocked += listed.filter(isDue).length;
    return;
  }
  try {
    // Read again under the lock: a cancellation may have changed them
    const ids = new Set(listed.map((b) => b.id));
    const sameHost = (b: MoneyBooking) =>
      listed[0].properties?.host_id ? b.properties?.host_id === listed[0].properties.host_id : ids.has(b.id);
    const bookings = (await heldBookings(supabase)).filter(sameHost);
    await releaseHostLocked(stripe, supabase, hostId, bookings, isDue, today, counts);
  } finally {
    await lock.release();
  }
}

async function releaseHostLocked(
  stripe: Stripe,
  supabase: SupabaseClient,
  hostId: string,
  bookings: MoneyBooking[],
  isDue: (b: MoneyBooking) => boolean,
  today: string,
  counts: Counts,
) {
  // a. Stripe's figures for every held booking of this host, grouped by the
  // account the transfer went to (a host who changed accounts has two)
  const byAccount = new Map<string, HeldEntry[]>();
  let unreadable = 0;
  for (const booking of bookings) {
    try {
      const money = await loadStripeMoney(stripe, booking);
      const accountId = idOf(money?.transfer?.destination);
      if (!money?.transfer || !money.state || !accountId) {
        counts.manual++;
        await markManual(supabase, booking, money);
        continue;
      }
      let holds = hostHoldsFromTransfer(money.state);
      // A refund Stripe has that the database hasn't taken back yet (e.g. the
      // webhook is still retrying): take it back before anything is compared
      const missing = expectedHostReduction(hostShareAmount(booking), money.amountRefunded) -
        Math.max(booking.host_reversed_amount ?? 0, shareTakenBack(money.state));
      if (missing > 0 || money.amountRefunded !== (booking.refunded_amount ?? 0)) {
        const reconciled = await reconcileBookingMoney(stripe, supabase, booking, { money, context: "payout job: refund found in Stripe", lockHeld: true });
        if (reconciled.status !== "held") continue;
        holds = reconciled.hostHolds ?? holds;
      }
      byAccount.set(accountId, [...(byAccount.get(accountId) ?? []), { booking, money, transfer: money.transfer, holds }]);
    } catch (loadError) {
      unreadable++;
      counts.failed++;
      await bookingFailed(supabase, booking, loadError);
    }
  }
  if (unreadable > 0) {
    // Without every held booking the balance can't be checked: pay nothing
    counts.blocked += bookings.filter(isDue).length;
    return;
  }

  // b. Safety stop, for every account before anything is paid
  const runs: { run: AccountRun; entries: HeldEntry[] }[] = [];
  let stopped = false;
  for (const [accountId, entries] of byAccount) {
    const run = await startAccountRun(stripe, accountId, entries);
    const owedByBooking = entries.map((e) => e.holds - sum(ourPayouts(run.payouts, e.booking.id).filter(livePayout)));
    const shortfall = heldBalanceShortfall(owedByBooking, run.available, run.pending);
    if (shortfall > 0) {
      stopped = true;
      await alertSafetyStop(supabase, hostId, run, entries, owedByBooking, shortfall);
    }
    runs.push({ run, entries });
  }
  if (stopped) {
    counts.safetyStops++;
    counts.blocked += bookings.filter(isDue).length;
    return;
  }

  // c. Each due booking, oldest first
  for (const { run, entries } of runs) {
    const due = entries
      .filter((e) => isDue(e.booking))
      .sort((a, b) => effectiveDueOn(a.booking).localeCompare(effectiveDueOn(b.booking)) || a.transfer.created - b.transfer.created);
    for (const entry of due) {
      try {
        counts[await releaseBooking(stripe, supabase, entry, run, today)]++;
      } catch (payoutError) {
        counts.failed++;
        await bookingFailed(supabase, entry.booking, payoutError);
      }
    }
  }
}

async function bookingFailed(supabase: SupabaseClient, booking: MoneyBooking, failure: unknown) {
  const code = (failure as { code?: string }).code ?? "error";
  console.error("[RELEASE-HOST-PAYOUTS]", booking.id, code, errorText(failure));
  await alertAdminOnce(supabase, `host-payout-error:${booking.id}:${code}`, "Host payout failed", [
    describeBooking(booking),
    `Stripe or the database said: ${errorText(failure)}`,
    "Nothing is paid for it, and the job tries again tomorrow. Fix the cause (e.g. the host's bank account in Stripe).",
  ]).catch(logAlertError);
}

/** No transfer to the host: the money is in the platform account, so only a person can pay the host */
async function markManual(supabase: SupabaseClient, booking: MoneyBooking, money: StripeMoney | null) {
  // Paid by hand from our own balance: the day after check-in, as for every
  // 'manual' booking (the 85-day limit is only for money in a host's Stripe account)
  const dueOn = dayAfterCheckIn(booking.check_in_date);
  const { error } = await supabase
    .from("bookings")
    .update({ host_payout_status: "manual", host_payout_due_on: dueOn })
    .eq("id", booking.id)
    .eq("host_payout_status", "held");
  if (error) throw new Error(`Setting booking ${booking.id} to manual failed: ${error.message}`);
  const share = hostShareAmount(booking);
  const owed = remainingHostShare(share, Math.max(booking.host_reversed_amount ?? 0, Math.min(share, money?.amountRefunded ?? 0)));
  await alertAdminOnce(supabase, `host-payout-manual:${booking.id}`, "Pay host by hand", [
    describeBooking(booking),
    money
      ? `No Stripe transfer to the host exists for this booking, so the host's share is in the platform account. Owed to the host: ${kr(owed)}.`
      : "The booking has no card payment in Stripe, so there is nothing for the job to pay out.",
    `Pay the host by hand on ${dueOn}, the day after check-in: the money is in our own account, so the 85-day rule for shares waiting in a host's Stripe account does not apply. Deduct what they owe in host_charges (card fees, refunds after payout), then set the booking's payout status to paid_out.`,
  ]);
}

/** The account's balance and its payouts since the oldest held transfer (and the last 90 days, for the safety stop's alert) */
async function startAccountRun(stripe: Stripe, accountId: string, entries: HeldEntry[]): Promise<AccountRun & { pending: number }> {
  const currency = (entries[0].booking.currency || "SEK").toLowerCase();
  const oldest = Math.min(...entries.map((e) => e.transfer.created));
  const since = Math.min(oldest, Math.floor(Date.now() / 1000) - FOREIGN_PAYOUT_DAYS * 86_400);
  const payouts = await stripe.payouts
    .list({ limit: 100, created: { gte: since } }, { stripeAccount: accountId })
    .autoPagingToArray({ limit: 1000 });
  const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });
  return {
    accountId,
    currency,
    available: sum(balance.available.filter((b) => b.currency === currency)),
    pending: sum(balance.pending.filter((b) => b.currency === currency)),
    payouts,
    oldestHeld: oldest,
  };
}

/** The safety stop's alert: the numbers, and what a person should look at */
async function alertSafetyStop(
  supabase: SupabaseClient,
  hostId: string,
  run: AccountRun & { pending: number },
  entries: HeldEntry[],
  owedByBooking: number[],
  shortfall: number,
) {
  const expected = owedByBooking.reduce((total, owed) => total + Math.max(0, owed), 0);
  const describePayout = (p: Stripe.Payout) =>
    `${p.id}: ${kr(p.amount)} on ${new Date(p.created * 1000).toISOString().slice(0, 10)}${p.method ? `, ${p.method}` : ""}`;
  // Ours carry metadata.booking_id; anything else that left the account
  // since the oldest held booking was paid explains the shortfall
  const recent = run.payouts.filter((p) => p.created >= run.oldestHeld && livePayout(p));
  const automatic = recent.filter((p) => p.automatic);
  const notOurs = recent.filter((p) => !p.automatic && !p.metadata?.booking_id);
  const foreign = automatic.length + notOurs.length > 0;
  // Older ones can still explain it: see the last paragraph of the alert
  const olderNotOurs = run.payouts.filter((p) => p.created < run.oldestHeld && livePayout(p) && !p.metadata?.booking_id);
  await alertAdminOnce(supabase, `host-balance-short:${run.accountId}:${shortfall}`, "Host payouts stopped: balance lower than their held bookings", [
    `Host profile ${hostId}, Stripe account ${run.accountId}: the balance is ${kr(run.available)} available + ${kr(run.pending)} pending = ${kr(run.available + run.pending)}, but the bookings we hold for this host should hold ${kr(expected)}. Short by ${kr(shortfall)}.`,
    "Nothing is paid to this host until the balance covers their held bookings again. No booking is marked paid out automatically.",
    ...entries.map((e, i) => `${describeBooking(e.booking)}: holds ${kr(e.holds)}, already paid out by us ${kr(e.holds - owedByBooking[i])}.`),
    ...(automatic.length
      ? [`Automatic Stripe payout(s) from this account in the period: ${automatic.map(describePayout).join("; ")}. Expected only when Stripe paid out money held for 90 days (e.g. a booking held for missing tax details: see any "Host payout held for tax details" alert); otherwise check that the account's payout schedule is manual.`]
      : []),
    ...(notOurs.length
      ? [`Payout(s) the payout job did not make (no booking on them), e.g. the host's own payout from their Stripe dashboard: ${notOurs.map(describePayout).join("; ")}.`]
      : []),
    foreign
      ? "To fix it: those payouts took the money of the host's oldest held bookings. Mark those bookings as paid out with that payout's id, oldest first, until the payout's amount is used up (in the bookings table: host_payout_status paid_out, stripe_payout_id the payout's id, host_paid_out_at its date). A later refund on them is then taken from the host's next payouts as a host charge. If the payout covered only part of the last of them, mark that one too: the rest of its share stays in the host's Stripe balance, and it is theirs."
      : [
        "No payout other than the job's left this account since the oldest held booking was paid. Look at the account's balance history in the Stripe dashboard:",
        `(1) A refund taken back from a booking after the money had already left the account (e.g. in a payout the host made themselves, and the booking was marked paid out only afterwards${olderNotOurs.length ? `; payouts we did not make in the last ${FOREIGN_PAYOUT_DAYS} days: ${olderNotOurs.map(describePayout).join("; ")}` : ""}) made the balance negative, and later bookings' transfers covered it. Then do not add money: mark the oldest held bookings as paid out (host_payout_status paid_out, no payout id) until what they hold covers the shortfall. What is left of the last one in the account is the host's.`,
        "(2) Otherwise a dispute, or a reversal or transfer made by hand: put the missing money back (e.g. refund the application fee of an over-reversed refund).",
      ].join(" "),
    `The job resumes for this host by itself once the balance covers the bookings still held: ${foreign ? "after those bookings are marked, or once the money is back in the account" : "after the bookings are marked (case 1) or once the money is back in the account (case 2)"}. Until then it pays this host nothing, and Stripe pays out money that waits 90 days on its own.`,
  ]).catch(logAlertError);
}

async function markPaidOut(supabase: SupabaseClient, bookingId: string, payoutId: string | null, paidAt: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ host_payout_status: "paid_out", stripe_payout_id: payoutId, host_paid_out_at: paidAt })
    .eq("id", bookingId)
    .eq("host_payout_status", "held");
  if (error) throw new Error(`Payout ${payoutId ?? "(none)"} is done in Stripe, but saving it failed: ${error.message}. The next run finds the payout and saves it.`);
}

async function markReversed(supabase: SupabaseClient, bookingId: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ host_payout_status: "reversed" })
    .eq("id", bookingId)
    .eq("host_payout_status", "held");
  if (error) throw new Error(`Setting booking ${bookingId} to reversed failed: ${error.message}. The next run tries again.`);
}

/** The host's charges not settled yet, oldest first */
async function hostOpenCharges(supabase: SupabaseClient, booking: Pick<MoneyBooking, "properties">): Promise<HostCharge[]> {
  const hostProfileId = booking.properties?.host_id;
  if (!hostProfileId) return [];
  const { data, error } = await supabase
    .from("host_charges")
    .select(HOST_CHARGE_COLUMNS)
    .eq("host_profile_id", hostProfileId)
    .is("settled_at", null)
    .order("created_at");
  if (error) throw new Error(`Reading the host's charges failed: ${error.message}`);
  return (data ?? []) as HostCharge[];
}

/**
 * The host's open charges, oldest first, and whether a settlement that
 * matters to this booking is in progress in another run (claimed from this
 * booking's transfer, or of this booking's own refund after payout): its
 * money is then neither open nor in Stripe's figures yet.
 */
async function hostChargesFor(
  supabase: SupabaseClient,
  booking: MoneyBooking,
  transferId: string,
): Promise<{ open: HostCharge[]; busy: boolean }> {
  const open = await hostOpenCharges(supabase, booking);
  const { data: claims, error: claimsError } = await supabase
    .from("host_charges")
    .select(HOST_CHARGE_COLUMNS)
    .like("settled_by", `${CLAIM_PREFIX}%`);
  if (claimsError) throw new Error(`Reading host-charge settlements in progress failed: ${claimsError.message}`);
  const busy = ((claims ?? []) as HostCharge[]).some(
    (c) => (c.settled_by ?? "").includes(`from transfer ${transferId} `) || isOwnRefundRecovery(c, booking.id),
  );
  return { open, busy };
}

async function releaseBooking(
  stripe: Stripe,
  supabase: SupabaseClient,
  entry: HeldEntry,
  run: AccountRun,
  today: string,
): Promise<Outcome> {
  const booking = entry.booking;

  // 0. The host's charges, read before Stripe's figures: a settlement another
  // (overlapping) run finishes after this read is in those figures and makes
  // our claim fail; one in progress right now stops this booking until the
  // next run, so its money is never counted as both open and still here
  const charges = await hostChargesFor(supabase, booking, entry.transfer.id);
  if (charges.busy) return "blocked";

  // 1. In line with fresh Stripe figures before anything is paid: a refund
  // made anywhere (cancel-booking, the dashboard) is taken from the host first
  const reconciled = await reconcileBookingMoney(stripe, supabase, booking, { context: "payout job", lockHeld: true });
  if (reconciled.pendingReduction > 0) return "blocked"; // alerted; retried tomorrow, nothing paid meanwhile
  if (reconciled.payoutConflict) return "blocked"; // changed while this ran; tomorrow sees the new state
  if (reconciled.status !== "held") return "nothingLeft";
  const transfer = reconciled.money?.transfer;
  const state = reconciled.money?.state;
  if (!transfer || !state || transfer.id !== entry.transfer.id) return "blocked";
  // This booking's own refunds after payout, still open as host charges: they
  // are already out of its share (remainingShare), so they never lower what
  // is paid for it; other bookings' charges and card fees do
  let own: HostCharge[] = charges.open.filter((c) => isOwnRefundRecovery(c, booking.id));
  if (reconciled.chargedNow > 0) {
    // Recorded just now (part of the share was paid out before a refund)
    const fresh = await openRefundRecoveries(supabase, booking.id);
    if (fresh.busy) return "blocked";
    own = fresh.open;
  }
  const others = charges.open.filter((c) => !isOwnRefundRecovery(c, booking.id));

  let transferLeft = state.transferAmount - state.transferReversed - reconciled.reversedNow;
  let holds = reconciled.hostHolds ?? 0;
  // A reversal comes out of the host's balance; count it as gone (if Stripe
  // took it from pending instead, we merely pay a little less today)
  run.available -= reconciled.reversedNow;

  // What may still be paid for this booking (bookingPayoutTarget): its share
  // less refund reversals, its own open refunds after payout and every charge
  // settled from its transfer; never more than the host holds from it
  const payouts = ourPayouts(run.payouts, booking.id);
  const paidSoFar = sum(payouts.filter(livePayout));
  const refundReversed = shareTakenBack(state) + reconciled.reversedNow;
  let ownOpen = sum(own);
  let chargeSettled = state.chargeSettled;
  const target = () => bookingPayoutTarget(reconciled.hostAmount, refundReversed, ownOpen, chargeSettled);
  const left = () => payableNow(holds, target(), paidSoFar);
  const settled = (part: number) => {
    chargeSettled += part;
    holds -= part;
    transferLeft -= part;
    run.available -= part;
  };

  // 2. Its own open refunds after payout, if the share is back in the host's
  // balance (the payout failed): taken from this transfer as the refund's
  // reversal and the charge closed. What it pays the host stays the same.
  for (const charge of own) {
    const part = ownRecoveryFromTransfer(charge.amount, holds, paidSoFar, target(), transferLeft);
    if (part <= 0) break;
    // Another run claimed it first: it is being settled; pay nothing this run
    if (!(await settleHostCharge(stripe, supabase, charge, part, transfer, booking.id))) return "blocked";
    ownOpen -= part;
    settled(part);
  }

  // 3. What the host owes us otherwise (card fees, other bookings' refunds
  // after payout), oldest first, from this booking's transfer: whole charges
  // where they fit, the last one in part (the rest stays open for the next
  // payout), never more than what is left of this booking
  for (const charge of others) {
    const part = Math.min(charge.amount, left(), transferLeft);
    if (part <= 0) break;
    if (!(await settleHostCharge(stripe, supabase, charge, part, transfer, booking.id))) return "blocked";
    settled(part);
  }

  // 4. Pay out what is left, as far as the balance allows
  const owed = left();
  if (owed <= 0) {
    const last = payouts.filter(livePayout).sort((a, b) => b.created - a.created)[0] ?? null;
    if (!last && reconciled.remainingShare === 0) {
      // The refunds took the whole share (its own refunds after payout taken
      // back from the returned money above): nothing went to the host
      await markReversed(supabase, booking.id);
      return "nothingLeft";
    }
    await markPaidOut(supabase, booking.id, last?.id ?? null, last ? new Date(last.created * 1000).toISOString() : new Date().toISOString());
    // Paid on an earlier run (whose save failed), or charges used it all up
    return last ? "paidOut" : "settled";
  }
  const amount = Math.min(owed, run.available);
  if (amount <= 0) return waitForFunds(supabase, booking, today, owed, run.available);

  const failedBefore = payouts.filter((p) => !livePayout(p)).length;
  let payout: Stripe.Payout;
  try {
    payout = await stripe.payouts.create(
      {
        amount,
        currency: run.currency,
        description: `Nordic Getaways: ${booking.properties?.title ?? "booking"} ${booking.check_in_date}`.slice(0, 350),
        metadata: { booking_id: booking.id, source: "release-host-payouts" },
      },
      // From the booking and what was paid before, not the amount: an
      // overlapping run that saw another balance gets an idempotency error
      // instead of making a second payout
      { stripeAccount: run.accountId, idempotencyKey: `host-payout-${booking.id}-${paidSoFar}-${failedBefore}` },
    );
  } catch (payoutError) {
    // Pending funds (e.g. a last-minute booking) become available later
    if ((payoutError as { code?: string }).code === "balance_insufficient") {
      return waitForFunds(supabase, booking, today, owed, run.available);
    }
    throw payoutError;
  }
  if (!livePayout(payout)) throw new Error(`Payout ${payout.id} is ${payout.status}: ${payout.failure_message ?? "no reason given"}`);
  run.available -= payout.amount;
  run.payouts.push(payout);

  if (payout.amount < owed) {
    // Paid what the balance allowed; the rest follows when funds arrive
    await waitForFunds(supabase, booking, today, owed - payout.amount, run.available);
    return "partial";
  }
  await markPaidOut(supabase, booking.id, payout.id, new Date().toISOString());
  return "paidOut";
}

async function waitForFunds(supabase: SupabaseClient, booking: MoneyBooking, today: string, owed: number, available: number): Promise<Outcome> {
  const dueOn = effectiveDueOn(booking);
  if (daysPastDue(dueOn, today) >= WAIT_ALERT_DAYS) {
    await alertAdminOnce(supabase, `host-payout-waiting:${booking.id}`, "Host payout waiting for funds", [
      describeBooking(booking),
      `Due ${dueOn}: ${kr(owed)} still to pay, but the host's Stripe account has only ${kr(Math.max(0, available))} available.`,
      "The job tries again every day. Check the host's balance in the Stripe dashboard (pending funds, a negative balance or a dispute).",
    ]).catch(logAlertError);
  }
  return "waiting";
}

// ---------------------------------------------------------------------------
// Host charges: settled by reversing them from a transfer of the host's

/** The reversal that settled a host charge on a transfer, if any */
async function findChargeReversal(stripe: Stripe, transferId: string, chargeId: string): Promise<Stripe.TransferReversal | null> {
  const reversals = await stripe.transfers.listReversals(transferId, { limit: 100 }).autoPagingToArray({ limit: 1000 });
  return reversals.find((r) => r.metadata?.host_charge_id === chargeId) ?? null;
}

/**
 * Settles `part` of a host charge from a transfer. The charge is claimed
 * first (settled_at set, settled_by "reversing <part> from transfer <id>"), so
 * two runs can't both reverse it; a crash after the claim is finished or
 * released by recoverChargeClaims on a later run. Returns false if another
 * run had claimed it (the caller then pays nothing for its booking this run).
 * A booking's own refund after payout, taken from its own transfer, is that
 * refund's reversal: it says so in Stripe and in settled_by, and carries
 * host_charge_id like every settlement, so it is never counted as a refund
 * reversal on top of the charge.
 */
async function settleHostCharge(
  stripe: Stripe,
  supabase: SupabaseClient,
  charge: HostCharge,
  part: number,
  transfer: Stripe.Transfer,
  bookingId: string,
): Promise<boolean> {
  const claim = `${CLAIM_PREFIX}${part} from transfer ${transfer.id} (booking ${bookingId})`;
  const { data: claimed, error: claimError } = await supabase
    .from("host_charges")
    .update({ settled_at: new Date().toISOString(), settled_by: claim })
    .eq("id", charge.id)
    .is("settled_at", null)
    .select("id");
  if (claimError) throw new Error(`Claiming host charge ${charge.id} failed: ${claimError.message}`);
  if (!claimed?.length) return false;

  const own = isOwnRefundRecovery(charge, bookingId);
  let reversal: Stripe.TransferReversal;
  try {
    reversal = await stripe.transfers.createReversal(
      transfer.id,
      {
        amount: part,
        description: (own
          ? `Booking ${bookingId}: refund to the guest, taken back after the host's payout failed (host charge ${charge.id})`
          : `Settles: ${charge.reason}`).slice(0, 350),
        metadata: {
          host_charge_id: charge.id,
          booking_id: bookingId,
          source: "release-host-payouts",
          ...(own ? { refund_recovery: "own transfer" } : {}),
        },
      },
      { idempotencyKey: `host-charge-${charge.id}-${part}` },
    );
  } catch (reversalError) {
    // The reversal may have gone through although the call failed: then the
    // charge is settled. It is released for a retry only when Stripe confirms
    // no reversal was made; if that can't be checked either, the claim stays
    // and recoverChargeClaims checks Stripe again on a later run (released
    // too early, a later run could take the charge from the host twice)
    let made: Stripe.TransferReversal | null;
    try {
      made = await findChargeReversal(stripe, transfer.id, charge.id);
    } catch (lookupError) {
      throw new Error(
        `Settling host charge ${charge.id} (${kr(part)}) from transfer ${transfer.id} failed (${errorText(reversalError)}), and checking whether the reversal was made failed too (${errorText(lookupError)}). The charge stays claimed: the next run checks Stripe again and finishes or releases it. Nothing is paid for this booking meanwhile.`,
      );
    }
    if (!made) {
      await supabase.from("host_charges").update({ settled_at: null, settled_by: null }).eq("id", charge.id).eq("settled_by", claim);
      throw new Error(`Settling host charge ${charge.id} (${kr(part)}) failed: ${errorText(reversalError)}`);
    }
    reversal = made;
  }
  await finishChargeSettlement(supabase, charge, reversal, bookingId);
  return true;
}

/**
 * Records a reversal as the charge's settlement. A part settlement leaves the
 * rest open as its own row (fixed id from the charge, so a repeat can't
 * duplicate it) and the settled row keeps the settled amount.
 */
async function finishChargeSettlement(supabase: SupabaseClient, charge: HostCharge, reversal: Stripe.TransferReversal, bookingId: string) {
  const own = isOwnRefundRecovery(charge, bookingId);
  if (reversal.amount < charge.amount) {
    const { error: restError } = await supabase.from("host_charges").insert({
      id: await stableUuid(`rest:${charge.id}`),
      host_profile_id: charge.host_profile_id,
      booking_id: charge.booking_id,
      amount: charge.amount - reversal.amount,
      currency: charge.currency,
      reason: charge.reason,
    });
    // 23505: recorded by an earlier, interrupted attempt; the claim stays until both are written
    if (restError && restError.code !== "23505") {
      throw new Error(`Host charge ${charge.id}: ${kr(reversal.amount)} was reversed (${reversal.id}), but recording the rest failed: ${restError.message}. The next run finishes it.`);
    }
  }
  const { error } = await supabase
    .from("host_charges")
    .update({
      amount: reversal.amount,
      settled_by: own
        ? `transfer reversal ${reversal.id} (booking ${bookingId}: its own refund, taken back from its transfer after its payout failed)`
        : `transfer reversal ${reversal.id} (booking ${bookingId})`,
    })
    .eq("id", charge.id);
  if (error) throw new Error(`Host charge ${charge.id} was settled by reversal ${reversal.id}, but saving that failed: ${error.message}. The next run finishes it.`);
}

/** 0. Host-charge settlements claimed over an hour ago and never finished (the run was stopped midway) */
async function recoverChargeClaims(stripe: Stripe, supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from("host_charges")
    .select("id, host_profile_id, booking_id, amount, currency, reason, settled_by")
    .like("settled_by", `${CLAIM_PREFIX}%`)
    .lt("settled_at", new Date(Date.now() - STALE_CLAIM_MS).toISOString());
  if (error) throw new Error(`Reading unfinished host-charge settlements failed: ${error.message}`);
  let recovered = 0;
  for (const charge of (data ?? []) as HostCharge[]) {
    const transferId = charge.settled_by?.match(/from transfer (\S+)/)?.[1];
    const bookingId = charge.settled_by?.match(/\(booking ([^)]+)\)/)?.[1] ?? "unknown";
    if (!transferId) continue;
    // Under the host's money lock: a refund reconciled between the two writes
    // of a part settlement would count the charge twice
    const lock = await takeLock(supabase, hostMoneyLock(charge.host_profile_id, bookingId), HOST_LOCK_WAIT_MS);
    if (!lock) continue; // busy: the next run finishes it
    try {
      const made = await findChargeReversal(stripe, transferId, charge.id);
      if (made) {
        await finishChargeSettlement(supabase, charge, made, bookingId);
      } else {
        const { error: releaseError } = await supabase
          .from("host_charges")
          .update({ settled_at: null, settled_by: null })
          .eq("id", charge.id)
          .eq("settled_by", charge.settled_by ?? "");
        if (releaseError) throw new Error(`Releasing host charge ${charge.id} failed: ${releaseError.message}`);
      }
    } finally {
      await lock.release();
    }
    recovered++;
  }
  return recovered;
}

/**
 * Bookings marked paid_out in the last 30 days whose payout later failed or
 * was canceled (a closed account, a wrong IBAN): Stripe returned the money to
 * the host's balance, so the booking goes back to held and is paid again.
 * Partial payouts count too: a booking is reopened when our live payouts for
 * it no longer cover what the host holds from it.
 */
async function recheckRecentPayouts(stripe: Stripe, supabase: SupabaseClient): Promise<number> {
  const since = new Date(Date.now() - RECHECK_DAYS * 86_400_000);
  const { data, error } = await supabase
    .from("bookings")
    .select(MONEY_BOOKING_COLUMNS + ", host_paid_out_at")
    .eq("host_payout_status", "paid_out")
    .like("stripe_payout_id", "po_%")
    .gte("host_paid_out_at", since.toISOString());
  if (error) throw new Error(`Reading recent payouts failed: ${error.message}`);
  const bookings = (data ?? []) as unknown as (MoneyBooking & { host_paid_out_at: string })[];
  if (!bookings.length) return 0;

  // The account each payout was made from is the transfer's destination
  const byAccount = new Map<string, (MoneyBooking & { host_paid_out_at: string })[]>();
  for (const b of bookings) {
    if (!b.stripe_transfer_id) continue;
    const transfer = await stripe.transfers.retrieve(b.stripe_transfer_id);
    const accountId = idOf(transfer.destination);
    if (accountId) byAccount.set(accountId, [...(byAccount.get(accountId) ?? []), b]);
  }

  let reopened = 0;
  for (const [accountId, accountBookings] of byAccount) {
    const payouts = await stripe.payouts
      .list({ limit: 100, created: { gte: Math.floor(since.getTime() / 1000) - 86_400 } }, { stripeAccount: accountId })
      .autoPagingToArray({ limit: 1000 });
    for (const b of accountBookings) {
      const mine = ourPayouts(payouts, b.id);
      const failed = mine.filter((p) => !livePayout(p));
      if (!failed.length) continue;
      // Did a later payout make up for it?
      const money = await loadStripeMoney(stripe, b);
      const state = money?.state ?? null;
      const holds = state ? hostHoldsFromTransfer(state) : 0;
      const live = sum(mine.filter(livePayout));
      const short = holds - live;
      if (short <= 0) continue;
      // What the job will do with the returned money: first take back its own
      // refunds after payout still open as host charges, then pay what is left
      // of the share after refunds and charges settled from it
      const ownOpen = await openRefundRecoveries(supabase, b.id)
        .then(({ open }) => sum(open))
        .catch(() => null);
      // The host's other open charges (card fees, other bookings' refunds
      // after payout) are taken from it first, as from any payout
      const othersOpen = await hostOpenCharges(supabase, b)
        .then((open) => sum(open.filter((c) => !isOwnRefundRecovery(c, b.id))))
        .catch(() => null);
      let plan = "The job works out what is still owed after refunds and amounts the host owes us, and pays it";
      if (state && ownOpen !== null && othersOpen !== null) {
        const target = bookingPayoutTarget(hostShareAmount(b), shareTakenBack(state), ownOpen, state.chargeSettled);
        const takenBack = ownRecoveryFromTransfer(ownOpen, holds, live, target, state.transferAmount - state.transferReversed);
        const payable = Math.max(0, payableNow(holds - takenBack, target, live));
        const toPay = Math.max(0, payable - othersOpen);
        plan = [
          takenBack > 0
            ? `The job first takes ${kr(takenBack)} of it back for the refund after payout recorded as a host charge for this booking (which then no longer comes from the host's next payout)`
            : "",
          payable > 0 && othersOpen > 0
            ? `${takenBack > 0 ? ", then takes" : "The job takes"} ${kr(Math.min(othersOpen, payable))} for other amounts the host owes us (card fees, refunds after payout on other bookings; as they stand now)`
            : "",
          toPay > 0
            ? `${takenBack > 0 || (payable > 0 && othersOpen > 0) ? ", then pays" : "The job pays"} the host ${kr(toPay)}${toPay !== short ? " (what is left of the share after refunds and amounts settled from it)" : ""}`
            : `${takenBack > 0 || (payable > 0 && othersOpen > 0) ? "; it pays" : "The job pays"} the host nothing more for this booking (refunds and amounts settled from it took the rest)`,
        ].join("");
      }
      // Under the host's money lock, like every change to a host's payouts
      const lock = await takeLock(supabase, hostMoneyLock(b.properties?.host_id, b.id), HOST_LOCK_WAIT_MS);
      if (!lock) continue; // busy: the next run reopens it
      let reopenedRows: { id: string }[] | null;
      try {
        const { data, error: updateError } = await supabase
          .from("bookings")
          .update({ host_payout_status: "held", stripe_payout_id: null, host_paid_out_at: null })
          .eq("id", b.id)
          .eq("host_payout_status", "paid_out")
          .select("id");
        if (updateError) throw new Error(`Reopening booking ${b.id} failed: ${updateError.message}`);
        reopenedRows = data;
      } finally {
        await lock.release();
      }
      if (!reopenedRows?.length) continue;
      reopened++;
      const last = failed.sort((x, y) => y.created - x.created)[0];
      await alertAdminOnce(supabase, `host-payout-failed:${last.id}`, "Host payout failed at the bank", [
        describeBooking(b),
        `Payout ${last.id} (${kr(last.amount)}) to the host's bank is ${last.status}: ${last.failure_message ?? last.failure_code ?? "no reason given"}.`,
        `Stripe returned the money to the host's Stripe balance, and the booking is back to held. ${plan}. If a payout fails again, ask the host to check their bank account in Stripe.`,
      ]).catch(logAlertError);
    }
  }
  return reopened;
}
