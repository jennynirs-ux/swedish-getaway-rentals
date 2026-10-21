import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdminOnce } from "../_shared/alert.ts";
import { stockholmToday } from "../_shared/format.ts";
import { addDays, daysPastDue, hostNetAmount, payoutDueOn, pendingHostReduction } from "../_shared/payout.ts";

// Runs daily (cron job daily-health-check) and e-mails support@mojjo.se when
// something needs a person: failing calendar syncs, failing scheduled jobs,
// bookings stuck before payment (SQL function health_issues()), plus the
// booking checks below: confirmations never sent, host payouts to make by
// hand or overdue, and paid checkouts whose save never finished.
// Anyone may trigger it, but it only ever mails support, at most once a day.

// A booking's e-mails go out within seconds of payment; after an hour they failed
const CONFIRMATION_GRACE_MS = 60 * 60 * 1000;
// Older bookings predate e-mail tracking; don't report them every day forever
const CONFIRMATION_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
// The payout job runs daily; two missed days means it is not paying this one
const PAYOUT_OVERDUE_DAYS = 2;
// Manual payouts due within this many days are listed one by one; later ones as a count
const MANUAL_PAYOUT_SOON_DAYS = 7;
// A save takes seconds; a claim with no booking after this is stuck
const STUCK_CLAIM_MS = 15 * 60 * 1000;
// Stuck claims older than this were settled by hand or are beyond saving
const STUCK_CLAIM_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
// A host's card fee etc. normally waits for their next payout; flag it when it
// has waited this long (always, for hosts paid by hand)
const HOST_CHARGE_STALE_DAYS = 90;

const kr = (ore: number | null) => ((ore ?? 0) / 100).toLocaleString("sv-SE");
const ref = (id: string) => id.slice(0, 8).toUpperCase();
const titleOf = (row: { properties?: unknown }) =>
  (row.properties as { title?: string } | null)?.title ?? "a cabin";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const today = stockholmToday();

  const { data: issues, error } = await supabase.rpc("health_issues");
  const problems: string[] = error ? [`Health check itself failed: ${error.message}`] : (issues ?? []);
  problems.push(...(await bookingProblems(supabase, today)));

  if (problems.length > 0) {
    await alertAdminOnce(supabase, `health:${today}`, `${problems.length} thing(s) need attention`, [
      ...problems,
      "This check runs every morning; you get at most one e-mail a day.",
    ]);
  }

  console.log("[DAILY-HEALTH-CHECK]", { problems });
  return new Response(JSON.stringify({ ok: problems.length === 0, problems: problems.length }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Each check reports its own failure instead of hiding the others
async function bookingProblems(supabase: SupabaseClient, today: string): Promise<string[]> {
  const checks: [string, () => Promise<string[]>][] = [
    ["confirmation e-mails", () => missingConfirmations(supabase)],
    ["manual host payouts", () => manualPayouts(supabase, today)],
    ["overdue host payouts", () => overduePayouts(supabase, today)],
    ["refunds not taken back from hosts", () => unreconciledRefunds(supabase)],
    ["unsettled host charges", () => unsettledHostCharges(supabase)],
    ["unfinished payment saves", () => stuckClaims(supabase)],
  ];
  const results = await Promise.all(
    checks.map(([name, run]) =>
      run().catch((e) => [`Health check could not check ${name}: ${e instanceof Error ? e.message : e?.message ?? e}`]),
    ),
  );
  return results.flat();
}

// Confirmed online bookings with no recorded guest confirmation: the guest
// has no address or check-in details (the alert for it may have failed too,
// as alerts go through the same e-mail service)
async function missingConfirmations(supabase: SupabaseClient): Promise<string[]> {
  const now = Date.now();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, guest_name, check_in_date, properties(title)")
    .eq("status", "confirmed")
    .eq("source", "direct")
    .lt("created_at", new Date(now - CONFIRMATION_GRACE_MS).toISOString())
    .gt("created_at", new Date(now - CONFIRMATION_LOOKBACK_MS).toISOString());
  if (error) throw error;
  if (!bookings?.length) return [];

  const { data: sent, error: sentError } = await supabase
    .from("booking_email_tracking")
    .select("booking_id")
    .eq("email_type", "booking_confirmation")
    .in("booking_id", bookings.map((b) => b.id));
  if (sentError) throw sentError;
  const confirmed = new Set((sent ?? []).map((s) => s.booking_id));

  return bookings
    .filter((b) => !confirmed.has(b.id))
    .map((b) => `No confirmation e-mail sent: ${titleOf(b)}, check-in ${b.check_in_date}, guest ${b.guest_name} (booking ${ref(b.id)}). Send it by hand.`);
}

const MONEY_COLUMNS =
  "id, status, created_at, check_in_date, host_amount, total_amount, service_fee, refunded_amount, host_reversed_amount, stripe_payment_intent_id, stripe_transfer_id, host_payout_due_on, properties(title)";

// The money is on the platform account until someone pays the host by hand
// and sets host_payout_status to paid_out. Only bookings without a Stripe
// transfer: with one, the host's share is in their own Stripe balance and
// paying by hand would pay them twice (listed under the refund check instead).
async function manualPayouts(supabase: SupabaseClient, today: string): Promise<string[]> {
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(MONEY_COLUMNS)
    .eq("host_payout_status", "manual")
    .is("stripe_transfer_id", null)
    .order("host_payout_due_on", { ascending: true });
  if (error) throw error;
  if (!bookings?.length) return [];

  // What we still owe: the host's share less what refunds took from it
  const owing = bookings.map((b) => ({ ...b, owed: hostNetAmount(b) }));
  const nothingLeft = owing.filter((b) => b.owed === 0);
  const toPay = owing.filter((b) => b.owed > 0);
  const soon = addDays(today, MANUAL_PAYOUT_SOON_DAYS);
  const due = toPay.filter((b) => !b.host_payout_due_on || b.host_payout_due_on <= soon);
  const later = toPay.filter((b) => b.host_payout_due_on && b.host_payout_due_on > soon);

  const lines = due.map((b) => {
    const when = b.host_payout_due_on
      ? (() => {
          const days = daysPastDue(b.host_payout_due_on, today);
          return days > 0 ? `${days} day(s) overdue` : days === 0 ? "due today" : `due ${b.host_payout_due_on}`;
        })()
      : "no due date";
    const cancelled = b.status === "cancelled" ? " (cancelled: this is what the host keeps)" : "";
    return `Pay host by hand (${when}; due the day after check-in, since the money is in our own account and the 85-day rule is only for shares in a host's Stripe account): ${titleOf(b)}, check-in ${b.check_in_date}, ${kr(b.owed)} SEK${cancelled}, less what they owe in host_charges (card fees, refunds after payout) (booking ${ref(b.id)}). Then set its payout status to paid_out.`;
  });
  if (later.length) {
    lines.push(`${later.length} more host payout(s) to make by hand later; the next is due ${later[0].host_payout_due_on}.`);
  }
  if (nothingLeft.length) {
    lines.push(
      `${nothingLeft.length} booking(s) marked "pay by hand" have nothing left to pay (refunded or cancelled): set their payout status to reversed (${nothingLeft.map((b) => ref(b.id)).join(", ")}).`,
    );
  }
  return lines;
}

// Held in the host's Stripe balance past the payout date: the payout job
// failed, skipped them (e.g. its safety stop), or is waiting for funds. The
// due date is the stored one, or 85 days after payment if that comes first
// (bookings saved before that rule, until the job moves their date)
async function overduePayouts(supabase: SupabaseClient, today: string): Promise<string[]> {
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(MONEY_COLUMNS)
    .eq("host_payout_status", "held");
  if (error) throw error;
  const overdueBefore = addDays(today, -PAYOUT_OVERDUE_DAYS);
  return (bookings ?? [])
    .map((b) => {
      const byRule = payoutDueOn(b.check_in_date, b.created_at);
      return { ...b, dueOn: b.host_payout_due_on && b.host_payout_due_on < byRule ? b.host_payout_due_on : byRule };
    })
    .filter((b) => b.dueOn < overdueBefore)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .map((b) =>
      `Host payout overdue by ${daysPastDue(b.dueOn, today)} days: ${titleOf(b)}, check-in ${b.check_in_date}, ${kr(hostNetAmount(b))} SEK still in the host's Stripe balance (booking ${ref(b.id)}). The payout job's alerts say why. Stripe pays out money left for 90 days after payment on its own, so this must be solved before then.`,
    );
}

// Refunds whose share has not (yet) come out of the host's: the refund
// requires min(share, refunded) back, and less was taken (host_reversed_amount:
// Stripe's reversals plus refunds after payout recorded as host charges, synced
// by every reconciliation). The payout job retries all of these every day.
async function unreconciledRefunds(supabase: SupabaseClient): Promise<string[]> {
  const [refundedResult, manualResult] = await Promise.all([
    supabase
      .from("bookings")
      .select(`${MONEY_COLUMNS}, host_payout_status`)
      .in("host_payout_status", ["held", "paid_out"])
      .gt("refunded_amount", 0),
    // 'manual' means the money is in our account; with a transfer it isn't
    supabase
      .from("bookings")
      .select(`${MONEY_COLUMNS}, host_payout_status`)
      .eq("host_payout_status", "manual")
      .not("stripe_transfer_id", "is", null),
  ]);
  if (refundedResult.error) throw refundedResult.error;
  if (manualResult.error) throw manualResult.error;
  const lines: string[] = [];
  for (const b of [...(refundedResult.data ?? []), ...(manualResult.data ?? [])]) {
    const missing = pendingHostReduction(b);
    if (missing <= 0 && b.host_payout_status !== "manual") continue;
    const what = `${titleOf(b)}, check-in ${b.check_in_date} (booking ${ref(b.id)}, ${b.stripe_transfer_id ? `transfer ${b.stripe_transfer_id}` : "paid by hand"})`;
    if (b.host_payout_status === "held") {
      lines.push(`Refund not yet taken back from the host: ${kr(missing)} SEK, ${what}. The payout job retries the reversal every day and pays nothing for this booking meanwhile; if it keeps failing, reverse ${kr(missing)} SEK from the transfer in Stripe.`);
    } else if (b.host_payout_status === "paid_out") {
      lines.push(`Refund after payout not yet recorded as a host charge: ${kr(missing)} SEK, ${what}. The payout job retries every day; if it keeps failing, check the job's alerts.`);
    } else {
      lines.push(`Marked "pay by hand" but has a Stripe transfer: the host's share is in their own Stripe balance. Do NOT pay by hand; set the payout status to held so the payout job handles it, ${what}.`);
    }
  }
  return lines;
}

// What hosts owe us (card fees of bookings they cancelled, refunds made after
// their share was paid out) is taken from their next payouts by the payout
// job, in part if a payout is smaller; hosts paid by hand have no payout to
// take it from. A settlement the job was stopped in the middle of is finished
// (or released) by its next run; one still open a day later needs a look.
async function unsettledHostCharges(supabase: SupabaseClient): Promise<string[]> {
  const { data: stuck, error: stuckError } = await supabase
    .from("host_charges")
    .select("id, amount, settled_by, settled_at")
    .like("settled_by", "reversing %")
    .lt("settled_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (stuckError) throw stuckError;
  const lines = (stuck ?? []).map((c) =>
    `Host charge ${c.id} (${kr(c.amount)} SEK) has been "${c.settled_by}" since ${String(c.settled_at).slice(0, 10)}: the payout job should have finished or released it. Check the transfer's reversals in Stripe (metadata host_charge_id ${c.id}).`,
  );

  const { data: charges, error } = await supabase
    .from("host_charges")
    .select("id, amount, reason, created_at, host_profile_id, profiles(full_name, host_business_name, stripe_connect_ready)")
    .is("settled_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const staleBefore = new Date(Date.now() - HOST_CHARGE_STALE_DAYS * 86_400_000).toISOString();
  return lines.concat((charges ?? [])
    .map((c) => ({ ...c, host: c.profiles as { full_name?: string; host_business_name?: string; stripe_connect_ready?: boolean } | null }))
    .filter((c) => !c.host?.stripe_connect_ready || c.created_at < staleBefore)
    .map((c) => {
      const who = c.host?.host_business_name || c.host?.full_name || c.host_profile_id;
      return c.host?.stripe_connect_ready
        ? `Host charge waiting since ${c.created_at.slice(0, 10)}: ${who} owes ${kr(c.amount)} SEK (${c.reason}); the host has had no payout to take it from since. Collect it another way and set settled_at.`
        : `Host charge to deduct by hand: ${who} owes ${kr(c.amount)} SEK (${c.reason}). Take it off their next payment by hand, then set the host_charges row's settled_at.`;
    }));
}

// A paid checkout whose save started but never finished; reconcile-payments
// retries it, so this only lingers if that job is not running
async function stuckClaims(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from("processed_sessions")
    .select("session_id")
    .eq("session_type", "booking")
    .is("created_record_id", null)
    .lt("processed_at", new Date(Date.now() - STUCK_CLAIM_MS).toISOString())
    .gt("processed_at", new Date(Date.now() - STUCK_CLAIM_LOOKBACK_MS).toISOString());
  if (error) throw error;
  if (!data?.length) return [];
  return [
    `${data.length} paid checkout(s) started saving but no booking was created (${data.map((d) => d.session_id).join(", ")}). Check that reconcile-payments runs hourly, and compare these Stripe sessions with bookings. Once one is settled by hand (refunded in Stripe), set its processed_sessions.session_type to booking_refunded_unsaved so it is no longer listed.`,
  ];
}
