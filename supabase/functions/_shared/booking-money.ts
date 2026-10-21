import Stripe from "https://esm.sh/stripe@18.5.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alertAdminOnce } from "./alert.ts";
import { stockholmToday } from "./format.ts";
import { HOST_LOCK_BUSY_TEXT, HOST_LOCK_WAIT_MS, hostMoneyLock, lockBusyError, takeLock } from "./lock.ts";
import {
  expectedHostReduction,
  hostHoldsFromTransfer,
  hostShareAmount,
  MAX_HOLD_DAYS,
  payoutDueOn,
  planHostReconciliation,
  REFUND_RECOVERY_REASON,
  remainingHostShare,
  stableUuid,
  type TransferState,
} from "./payout.ts";

// The one place that brings a booking's money in line with Stripe. Used by
// cancel-booking, the charge.refunded webhook (refunds made in the Stripe
// dashboard) and release-host-payouts, so every path agrees:
//   - Stripe is the source of truth: charge.amount_refunded is what the guest
//     got back; the transfer (minus our application fee) is what the host
//     holds from the booking.
//   - Expected host reduction = min(host share, refunded). What Stripe and
//     earlier host charges have not yet taken is taken now:
//       * reversed from the booking's transfer, as far as the money is still
//         in the host's Stripe balance and not paid out by our payouts;
//       * the rest (the share was already paid out) is recorded as a
//         host_charges row with a fixed id from the booking and the target
//         ("Refund after payout for booking ..."), which release-host-payouts
//         takes from the host's next payouts by transfer reversal.
//   - refunded_amount, host_reversed_amount (reversed plus charged) and
//     host_payout_status are then written; the amounts never go down.
//   - If such a booking's payout later fails and Stripe returns the money,
//     the booking is held again and the payout job takes its own open charges
//     from that returned money (as the refund's reversal), without lowering
//     what it pays the host a second time (bookingPayoutTarget).
// Safe to run any number of times: a second run finds nothing missing.

/** Booking columns reconcileBookingMoney reads; select these */
export const MONEY_BOOKING_COLUMNS =
  "id, status, created_at, check_in_date, check_out_date, guest_name, currency, total_amount, host_amount, service_fee, refunded_amount, host_reversed_amount, host_payout_status, host_payout_due_on, stripe_transfer_id, stripe_payout_id, stripe_payment_intent_id, properties(title, host_id)";

export interface MoneyBooking {
  id: string;
  status: string;
  created_at: string;
  check_in_date: string;
  check_out_date: string;
  guest_name: string;
  currency: string | null;
  total_amount: number;
  host_amount: number | null;
  service_fee: number | null;
  refunded_amount: number | null;
  host_reversed_amount: number | null;
  host_payout_status: string | null;
  host_payout_due_on: string | null;
  stripe_transfer_id: string | null;
  stripe_payout_id: string | null;
  stripe_payment_intent_id: string | null;
  properties: { title?: string; host_id?: string } | null;
}

/** A booking's payment as Stripe has it */
export interface StripeMoney {
  paymentIntentId: string;
  charge: Stripe.Charge | null;
  /** charge.amount_refunded: what the guest got back */
  amountRefunded: number;
  /** The destination charge's transfer to the host (null: the money reached the platform account) */
  transfer: Stripe.Transfer | null;
  reversals: Stripe.TransferReversal[];
  /** null without a transfer */
  state: TransferState | null;
  applicationFeeId: string | null;
  /** Stripe's card fee for the payment (öre), from its balance transaction */
  cardFee: number | null;
}

/** Marks our own Stripe objects (refunds, reversals); the webhook recognises admin refunds by it */
export const ADMIN_SOURCE = "nordic-getaways-admin";

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  !value ? null : typeof value === "string" ? value : value.id;

const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);
const kr = (ore: number) => `${(ore / 100).toLocaleString("sv-SE", { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 })} SEK`;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error));
const ref = (id: string) => id.slice(0, 8).toUpperCase();
/** Our payouts that still count: a failed or canceled payout returned its money to the host's balance */
export const livePayout = (p: Stripe.Payout) => p.status !== "failed" && p.status !== "canceled";

export const describeBooking = (b: Pick<MoneyBooking, "id" | "check_in_date" | "check_out_date" | "guest_name" | "status" | "properties">) =>
  `${b.properties?.title ?? "Listing"}, ${b.check_in_date} to ${b.check_out_date}, guest ${b.guest_name} (booking ${b.id}, ${b.status})`;

/** The transfer, its reversals and our application fee for a destination charge */
export async function loadTransferState(
  stripe: Stripe,
  charge: Stripe.Charge | null,
  fallbackTransferId: string | null = null,
): Promise<{ transfer: Stripe.Transfer | null; reversals: Stripe.TransferReversal[]; state: TransferState | null; applicationFeeId: string | null }> {
  let transfer = charge?.transfer && typeof charge.transfer === "object" ? charge.transfer : null;
  const transferId = idOf(charge?.transfer) ?? fallbackTransferId;
  if (!transfer && transferId) transfer = await stripe.transfers.retrieve(transferId);
  if (!transfer) return { transfer: null, reversals: [], state: null, applicationFeeId: null };

  // The transfer carries its first reversals; page through the rest
  let reversals = transfer.reversals?.data ?? [];
  if (!transfer.reversals || transfer.reversals.has_more) {
    reversals = await stripe.transfers.listReversals(transfer.id, { limit: 100 }).autoPagingToArray({ limit: 1000 });
  }

  let fee: Stripe.ApplicationFee | null = charge?.application_fee && typeof charge.application_fee === "object"
    ? charge.application_fee
    : null;
  const feeId = idOf(charge?.application_fee);
  if (!fee && feeId) fee = await stripe.applicationFees.retrieve(feeId);

  return {
    transfer,
    reversals,
    applicationFeeId: feeId,
    state: {
      transferAmount: transfer.amount,
      transferReversed: transfer.amount_reversed,
      chargeSettled: sum(reversals.filter((r) => r.metadata?.host_charge_id)),
      applicationFee: fee?.amount ?? charge?.application_fee_amount ?? 0,
      applicationFeeRefunded: fee?.amount_refunded ?? 0,
    },
  };
}

/** Reads a booking's payment from Stripe; null when it was not paid by card on the site */
export async function loadStripeMoney(
  stripe: Stripe,
  booking: Pick<MoneyBooking, "stripe_payment_intent_id" | "stripe_transfer_id">,
): Promise<StripeMoney | null> {
  if (!booking.stripe_payment_intent_id) return null;
  const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id, {
    expand: ["latest_charge.balance_transaction", "latest_charge.application_fee", "latest_charge.transfer"],
  });
  const charge = paymentIntent.latest_charge && typeof paymentIntent.latest_charge === "object"
    ? paymentIntent.latest_charge
    : null;
  const { transfer, reversals, state, applicationFeeId } = await loadTransferState(stripe, charge, booking.stripe_transfer_id);

  let balanceTransaction = charge?.balance_transaction ?? null;
  if (typeof balanceTransaction === "string") {
    balanceTransaction = await stripe.balanceTransactions.retrieve(balanceTransaction);
  }
  return {
    paymentIntentId: paymentIntent.id,
    charge,
    amountRefunded: charge?.amount_refunded ?? 0,
    transfer,
    reversals,
    state,
    applicationFeeId,
    cardFee: balanceTransaction?.fee ?? null,
  };
}

/**
 * When the payout job pays this booking: the stored due date, or 85 days after
 * the guest paid if that comes first (bookings saved before that rule carry
 * the day after check-in). The payment time is Stripe's when known.
 */
export function effectiveDueOn(booking: Pick<MoneyBooking, "check_in_date" | "created_at" | "host_payout_due_on">, paidAtMs?: number | null): string {
  const byRule = payoutDueOn(booking.check_in_date, paidAtMs ?? booking.created_at);
  return booking.host_payout_due_on && booking.host_payout_due_on < byRule ? booking.host_payout_due_on : byRule;
}

/** Our payouts for a booking from the host's account (metadata.booking_id), since its transfer */
export async function payoutsForBooking(stripe: Stripe, transfer: Stripe.Transfer, bookingId: string): Promise<Stripe.Payout[]> {
  const accountId = idOf(transfer.destination);
  if (!accountId) return [];
  const payouts = await stripe.payouts
    .list({ limit: 100, created: { gte: transfer.created } }, { stripeAccount: accountId })
    .autoPagingToArray({ limit: 1000 });
  return payouts.filter((p) => p.metadata?.booking_id === bookingId);
}

/** host_charges.settled_by while release-host-payouts is settling a charge ("reversing <part> from transfer <id> (booking <id>)") */
export const CHARGE_CLAIM_PREFIX = "reversing ";

export interface RefundRecoveryCharge {
  id: string;
  host_profile_id: string;
  booking_id: string | null;
  amount: number;
  currency: string;
  reason: string;
  settled_at: string | null;
  settled_by: string | null;
  created_at: string;
}

/**
 * A booking's refund-after-payout host charges not settled yet, oldest first.
 * busy: one of them is being settled right now (claimed by a payout run),
 * so its money is neither open nor in Stripe's figures yet.
 */
export async function openRefundRecoveries(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<{ open: RefundRecoveryCharge[]; busy: boolean }> {
  const { data, error } = await supabase
    .from("host_charges")
    .select("id, host_profile_id, booking_id, amount, currency, reason, settled_at, settled_by, created_at")
    .eq("booking_id", bookingId)
    .like("reason", `${REFUND_RECOVERY_REASON}%`)
    .order("created_at");
  if (error) throw new Error(`Reading host charges for booking ${bookingId} failed: ${error.message}`);
  const rows = (data ?? []) as RefundRecoveryCharge[];
  return {
    open: rows.filter((row) => !row.settled_at),
    busy: rows.some((row) => (row.settled_by ?? "").startsWith(CHARGE_CLAIM_PREFIX)),
  };
}

/**
 * A held booking whose whole share the refunds take, but that has refunds
 * after payout recorded as host charges while the host again holds money from
 * it that was not paid out (its payout failed at the bank and Stripe returned
 * it): it must stay held, so the payout job takes the open charges from this
 * transfer, or pays the host back what they already settled from other
 * payouts. Marked reversed, that money would sit in the host's Stripe balance
 * with no booking holding it. Unknown (a read failed): stays held too; the
 * payout job looks again.
 */
async function sharePaidBackToHost(
  stripe: Stripe,
  supabase: SupabaseClient,
  booking: MoneyBooking,
  transfer: Stripe.Transfer,
  hostHolds: number,
  charged: number,
): Promise<boolean> {
  if (charged <= 0 || hostHolds <= 0) return false;
  try {
    const paidOut = sum((await payoutsForBooking(stripe, transfer, booking.id)).filter(livePayout));
    return hostHolds - paidOut > 0;
  } catch {
    return true;
  }
}

/** Refunds after payout already recorded as host charges for a booking (settled or not, split parts included) */
export async function recoveryChargedFor(supabase: SupabaseClient, bookingId: string): Promise<number> {
  const { data, error } = await supabase
    .from("host_charges")
    .select("amount")
    .eq("booking_id", bookingId)
    .like("reason", `${REFUND_RECOVERY_REASON}%`);
  if (error) throw new Error(`Reading host charges for booking ${bookingId} failed: ${error.message}`);
  return (data ?? []).reduce((total: number, row: { amount: number }) => total + (row.amount ?? 0), 0);
}

/**
 * Records a refund after payout as a host charge, taken from the host's next
 * payouts by release-host-payouts. The id comes from the booking and the
 * target (the reduction the refunds require), so a retry or a concurrent run
 * for the same target can't record it twice. Returns the amount recorded (or
 * already there), or 0 if it could not be recorded (noted for the alert).
 */
async function recordRefundRecovery(
  supabase: SupabaseClient,
  booking: MoneyBooking,
  target: number,
  amount: number,
  notes: string[],
): Promise<number> {
  const hostProfileId = booking.properties?.host_id;
  if (!hostProfileId) {
    notes.push(`${kr(amount)} of the refund should come from the host's share, which was already paid out, but the listing has no host profile to charge. Recover it from the host by hand.`);
    return 0;
  }
  const id = await stableUuid(`refund-recovery:${booking.id}:${target}`);
  const { error } = await supabase.from("host_charges").insert({
    id,
    host_profile_id: hostProfileId,
    booking_id: booking.id,
    amount,
    currency: (booking.currency || "SEK").toLowerCase(),
    reason: `${REFUND_RECOVERY_REASON} ${ref(booking.id)} (${booking.properties?.title ?? "listing"}, check-in ${booking.check_in_date})`,
  });
  if (error?.code === "23505") {
    // The same target was recorded by a concurrent run: count what it recorded
    const { data: existing } = await supabase.from("host_charges").select("amount").eq("id", id).maybeSingle();
    return existing?.amount ?? amount;
  }
  if (error) {
    notes.push(
      `${kr(amount)} of the refund should come from the host's share, which was already paid out, but recording it as a host charge FAILED: ${error.message}. The payout job retries every day; nothing is paid for this booking meanwhile.`,
    );
    return 0;
  }
  notes.push(
    `${kr(amount)} of the refund should come from the host's share, which was already paid out: recorded as host charge ${id}, which the payout job takes from the host's next payout(s).`,
  );
  return amount;
}

export interface ReconcileOptions {
  /** Already loaded; loaded fresh otherwise (the payout job always reloads before paying) */
  money?: StripeMoney | null;
  /** What triggered this, for alerts (never sent to Stripe: the reversal body must not vary) */
  context: string;
  /** Alert support about problems here (default). cancel-booking puts the notes in its own alert instead. */
  alert?: boolean;
  /** Written in the same update (e.g. the cancellation itself) */
  extraUpdate?: Record<string, unknown>;
  /** Only write extraUpdate if the booking still has this status (e.g. "confirmed") */
  requireBookingStatus?: string;
  /**
   * The caller holds the host's money lock (the payout job) and passes
   * figures read under it. Otherwise the lock is taken here and the booking
   * and Stripe's figures are read again under it.
   */
  lockHeld?: boolean;
}

export interface ReconcileResult {
  hasPayment: boolean;
  /** Refunded to the guest in total (Stripe) */
  amountRefunded: number;
  hostAmount: number;
  /** min(host share, refunded) */
  expectedReduction: number;
  /** Taken from the host's share in total after this run: reversals plus host charges */
  takenBack: number;
  /** Reversed from the transfer by this run */
  reversedNow: number;
  /** Refunds after payout recorded as host charges for this booking, in total */
  charged: number;
  /** Of which recorded by this run */
  chargedNow: number;
  /** The host's share left (host-charge settlements not deducted) */
  remainingShare: number;
  /** What the host holds in Stripe from this booking after this run; null without a transfer */
  hostHolds: number | null;
  /** Reversals that settled host charges */
  chargeSettled: number;
  /** Should have been taken back but wasn't (the reversal or the host charge failed): retried daily */
  pendingReduction: number;
  /** Taken back beyond what the refunds require */
  overReduced: number;
  /** host_payout_status after this run */
  status: string | null;
  transferId: string | null;
  /** false if the booking's status had changed, so extraUpdate was not written */
  extraSaved: boolean;
  /** Someone else changed the payout state or the amounts while this ran: act on nothing */
  payoutConflict: boolean;
  notes: string[];
  money: StripeMoney | null;
}

/**
 * See the top of this file. Runs under the host's money lock, so the payout
 * job never pays a booking out with figures a refund reversal made here has
 * already changed. If someone else holds the lock for longer than
 * HOST_LOCK_WAIT_MS, this throws and nothing is done: the callers' retries
 * (the webhook's, cancelling again, the next payout run) are safe.
 */
export async function reconcileBookingMoney(
  stripe: Stripe,
  supabase: SupabaseClient,
  booking: MoneyBooking,
  options: ReconcileOptions,
): Promise<ReconcileResult> {
  if (options.lockHeld) return reconcileLocked(stripe, supabase, booking, options);
  const lock = await takeLock(supabase, hostMoneyLock(booking.properties?.host_id, booking.id), HOST_LOCK_WAIT_MS);
  if (!lock) {
    throw lockBusyError(
      `${HOST_LOCK_BUSY_TEXT}, so nothing was taken from the host's share of booking ${booking.id} yet. Try again in a few minutes: nothing is done twice.`,
    );
  }
  try {
    // The payout job may have paid it out while this waited
    const { data, error } = await supabase.from("bookings").select(MONEY_BOOKING_COLUMNS).eq("id", booking.id).maybeSingle();
    if (error) throw new Error(`Reading booking ${booking.id} failed: ${error.message}`);
    const current = data ? { ...booking, ...(data as unknown as MoneyBooking) } : booking;
    return await reconcileLocked(stripe, supabase, current, { ...options, money: undefined });
  } finally {
    await lock.release();
  }
}

async function reconcileLocked(
  stripe: Stripe,
  supabase: SupabaseClient,
  booking: MoneyBooking,
  options: ReconcileOptions,
): Promise<ReconcileResult> {
  let money = options.money !== undefined ? options.money : await loadStripeMoney(stripe, booking);
  const hostAmount = hostShareAmount(booking);
  const notes: string[] = [];
  const before = booking.host_payout_status;

  if (!money) {
    // Not paid by card on the site: nothing in Stripe to bring in line
    const takenBack = booking.host_reversed_amount ?? 0;
    const saved = await saveBooking(supabase, booking, {}, options, notes);
    return {
      hasPayment: false, amountRefunded: booking.refunded_amount ?? 0, hostAmount, expectedReduction: 0,
      takenBack, reversedNow: 0, charged: 0, chargedNow: 0, remainingShare: remainingHostShare(hostAmount, takenBack),
      hostHolds: null, chargeSettled: 0, pendingReduction: 0, overReduced: 0, status: saved.status ?? before,
      transferId: booking.stripe_transfer_id, extraSaved: saved.extraSaved, payoutConflict: saved.conflict, notes, money: null,
    };
  }

  const refunded = money.amountRefunded;
  const expected = expectedHostReduction(hostAmount, refunded);
  const sharePaidOut = before === "paid_out";
  let status = before;
  let takenBack: number;
  let reversedNow = 0;
  let charged = 0;
  let chargedNow = 0;
  let pendingReduction = 0;
  let overReduced = 0;
  let hostHolds: number | null = null;
  let chargeSettled = 0;

  if (money.transfer && money.state) {
    const transfer = money.transfer;
    let state = money.state;
    // Earlier refunds after payout, recorded as host charges, count as taken
    const alreadyCharged = refunded > 0 ? await recoveryChargedFor(supabase, booking.id) : 0;
    let paidOutSoFar = 0;
    let plan = planHostReconciliation(hostAmount, refunded, state, { alreadyCharged, sharePaidOut });

    // Still held, but the job may already have paid part of it (a payout
    // limited by the balance): that part can't be reversed, it is charged
    let payoutsUnknown = false;
    const mayHavePayout = effectiveDueOn(booking, transfer.created * 1000) <= stockholmToday();
    if (plan.reverseNow > 0 && mayHavePayout) {
      try {
        paidOutSoFar = sum((await payoutsForBooking(stripe, transfer, booking.id)).filter(livePayout));
        plan = planHostReconciliation(hostAmount, refunded, state, { alreadyCharged, sharePaidOut, paidOutSoFar });
      } catch (listError) {
        payoutsUnknown = true;
        pendingReduction = plan.reverseNow;
        notes.push(
          `Could not read the host's payouts for this booking (${errorText(listError)}), so ${kr(plan.reverseNow)} was not taken back yet. The payout job retries every day and pays nothing for this booking meanwhile.`,
        );
      }
    }

    if (plan.reverseNow > 0 && !payoutsUnknown) {
      try {
        // The same target gives the same key and the same body, whichever
        // caller (cancel-booking, the webhook, the payout job) gets there first
        await stripe.transfers.createReversal(
          transfer.id,
          {
            amount: plan.reverseNow,
            description: `Booking ${booking.id}: refund to the guest`,
            metadata: { source: ADMIN_SOURCE, booking_id: booking.id },
          },
          { idempotencyKey: `booking-reversal-${booking.id}-to-${plan.expectedReduction}-from-${plan.takenBack}` },
        );
        reversedNow = plan.reverseNow;
        const ageDays = Math.floor((Date.now() - transfer.created * 1000) / 86_400_000);
        if (ageDays > MAX_HOLD_DAYS) {
          notes.push(
            `Transfer ${transfer.id} is ${ageDays} days old, but the payout job pays held shares within ${MAX_HOLD_DAYS} days of payment. If Stripe paid this booking out on its own, reversing ${kr(plan.reverseNow)} left the host's Stripe balance short: check the account in the Stripe dashboard.`,
          );
        }
      } catch (reversalError) {
        // Another caller may be making the same reversal right now (same key):
        // look again shortly before calling it a failure
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const fresh = await loadStripeMoney(stripe, booking).catch(() => null);
        if (fresh?.transfer?.id === transfer.id && fresh.state) {
          money = fresh;
          state = fresh.state;
          plan = planHostReconciliation(hostAmount, refunded, state, { alreadyCharged, sharePaidOut, paidOutSoFar });
        }
        if (plan.reverseNow > 0) {
          pendingReduction = plan.reverseNow;
          notes.push(
            `Taking ${kr(plan.reverseNow)} back from the host's transfer ${transfer.id} FAILED: ${errorText(reversalError)}. The guest's refund stands. The booking stays held: the payout job retries the reversal every day and pays nothing for it meanwhile. Or reverse ${kr(plan.reverseNow)} from ${transfer.id} in the Stripe dashboard.`,
          );
        }
      }
    }

    // What had already left the host's Stripe balance is taken from their next payouts
    if (plan.chargeNow > 0 && !payoutsUnknown) {
      chargedNow = await recordRefundRecovery(supabase, booking, plan.expectedReduction, plan.chargeNow, notes);
      if (chargedNow === 0) pendingReduction += plan.chargeNow;
    }

    charged = plan.alreadyCharged + chargedNow;
    takenBack = plan.takenBack + reversedNow + charged;
    overReduced = plan.overReduced;
    if (overReduced > 0) {
      notes.push(
        `${kr(overReduced)} more has been taken from the host than the refunds require, e.g. a refund in the Stripe dashboard with "Reverse transfer" but without "Refund application fee". Refunding ${kr(overReduced)} of application fee ${money.applicationFeeId ?? "(none)"} in Stripe is required, not optional (if instead a reversal was made by hand after a host charge was recorded, transfer ${kr(overReduced)} back to the host's Stripe account). Until then the host's Stripe balance is lower than what their held bookings hold, so the payout job's safety stop pays this host nothing.`,
      );
    }
    chargeSettled = state.chargeSettled;
    hostHolds = hostHoldsFromTransfer(state) - reversedNow;
    const remaining = remainingHostShare(hostAmount, Math.max(0, takenBack));
    // A transfer exists, so the share is in the host's Stripe balance: never
    // 'manual' (that means the money is in our account and paid by hand)
    if (status === "manual" || status === null) status = "held";
    if (
      status === "held" && remaining === 0 && pendingReduction === 0 &&
      !(await sharePaidBackToHost(stripe, supabase, booking, transfer, hostHolds, plan.alreadyCharged + chargedNow))
    ) {
      status = "reversed";
    }
  } else {
    // No transfer: the payment reached the platform account. Before the host
    // is paid by hand, a refund only lowers what we owe them; after, it is a
    // host charge (deducted from what we pay them next)
    const recorded = booking.host_reversed_amount ?? 0;
    if (sharePaidOut) {
      // host_reversed_amount already includes earlier host charges here
      takenBack = recorded;
      if (expected > recorded) {
        chargedNow = await recordRefundRecovery(supabase, booking, expected, expected - recorded, notes);
        if (chargedNow === 0) pendingReduction = expected - recorded;
        takenBack += chargedNow;
      }
      charged = refunded > 0 ? await recoveryChargedFor(supabase, booking.id).catch(() => chargedNow) : 0;
    } else {
      takenBack = Math.max(recorded, expected);
    }
    if (status === "manual" && remainingHostShare(hostAmount, takenBack) === 0) status = "reversed";
  }

  const update: Record<string, unknown> = {
    refunded_amount: refunded,
    host_reversed_amount: Math.max(0, takenBack),
  };
  if (status !== before) update.host_payout_status = status;
  if (money.transfer && booking.stripe_transfer_id !== money.transfer.id) update.stripe_transfer_id = money.transfer.id;
  const saved = await saveBooking(supabase, booking, update, options, notes);

  const result: ReconcileResult = {
    hasPayment: true,
    amountRefunded: refunded,
    hostAmount,
    expectedReduction: expected,
    takenBack: Math.max(0, takenBack),
    reversedNow,
    charged,
    chargedNow,
    remainingShare: remainingHostShare(hostAmount, Math.max(0, takenBack)),
    hostHolds,
    chargeSettled,
    pendingReduction,
    overReduced,
    status: saved.status ?? status,
    transferId: money.transfer?.id ?? booking.stripe_transfer_id,
    extraSaved: saved.extraSaved,
    payoutConflict: saved.conflict,
    notes,
    money,
  };

  if (notes.length && options.alert !== false) {
    await alertAdminOnce(
      supabase,
      `money:${booking.id}:${refunded}:${result.takenBack}:${pendingReduction}:${overReduced}:${chargedNow}`,
      "Booking money needs a look",
      [
        describeBooking(booking),
        `Why: ${options.context}. Refunded to the guest: ${kr(refunded)}. Taken from the host's share: ${kr(result.takenBack)} of ${kr(hostAmount)}${charged > 0 ? ` (${kr(charged)} of it as host charges)` : ""}; the refunds require ${kr(expected)}.`,
        ...notes,
      ],
    ).catch((alertError) => console.error("[BOOKING-MONEY] Alert failed:", errorText(alertError)));
  }
  return result;
}

export interface HostSplit {
  /** Reversed from the booking's transfer now (the share is still in the host's Stripe balance, not paid out) */
  reverseNow: number;
  /** Recorded as a host charge and taken from the host's next payouts (that part was paid out, or used for host charges) */
  chargeNow: number;
  /** Part of this booking's transfer already went to settle host charges (card fees, refunds after payout) */
  usedForCharges: boolean;
}

/**
 * How reconcileBookingMoney would take a total refund of `refunded` from the
 * host right now, with the same inputs (cancel-booking's preview, so the
 * dialog shows the server's split): reversed from the transfer as far as the
 * money is still in the host's Stripe balance and not paid out, the rest
 * recorded as a host charge. Without a transfer (paid by hand from our
 * account), a refund after the host was paid is a host charge.
 */
export async function planHostSplit(
  stripe: Stripe,
  supabase: SupabaseClient,
  booking: MoneyBooking,
  money: StripeMoney,
  refunded: number,
): Promise<HostSplit> {
  const hostAmount = hostShareAmount(booking);
  const sharePaidOut = booking.host_payout_status === "paid_out";
  if (!money.transfer || !money.state) {
    const missing = Math.max(0, expectedHostReduction(hostAmount, refunded) - (booking.host_reversed_amount ?? 0));
    return { reverseNow: 0, chargeNow: sharePaidOut ? missing : 0, usedForCharges: false };
  }
  const alreadyCharged = refunded > 0 ? await recoveryChargedFor(supabase, booking.id) : 0;
  let plan = planHostReconciliation(hostAmount, refunded, money.state, { alreadyCharged, sharePaidOut });
  if (plan.reverseNow > 0 && effectiveDueOn(booking, money.transfer.created * 1000) <= stockholmToday()) {
    const paidOutSoFar = sum((await payoutsForBooking(stripe, money.transfer, booking.id)).filter(livePayout));
    plan = planHostReconciliation(hostAmount, refunded, money.state, { alreadyCharged, sharePaidOut, paidOutSoFar });
  }
  return { reverseNow: plan.reverseNow, chargeNow: plan.chargeNow, usedForCharges: money.state.chargeSettled > 0 };
}

/**
 * Writes the synced figures. Only if nobody changed the payout state meanwhile
 * (e.g. the payout job paying it out) and the stored amounts are not newer
 * than ours: Stripe's totals only grow, so amounts never go down. Otherwise
 * only the larger amounts are kept (and extraUpdate, if the booking status
 * still allows it), the payout state is left alone and conflict is set, so
 * callers act on nothing; status is then the stored one.
 */
async function saveBooking(
  supabase: SupabaseClient,
  booking: MoneyBooking,
  update: Record<string, unknown>,
  options: ReconcileOptions,
  notes: string[],
): Promise<{ extraSaved: boolean; conflict: boolean; status?: string | null }> {
  const extra = options.extraUpdate ?? {};
  if (!Object.keys(update).length && !Object.keys(extra).length) return { extraSaved: true, conflict: false };

  let query = supabase.from("bookings").update({ ...update, ...extra }).eq("id", booking.id);
  query = booking.host_payout_status === null
    ? query.is("host_payout_status", null)
    : query.eq("host_payout_status", booking.host_payout_status);
  for (const key of ["refunded_amount", "host_reversed_amount"] as const) {
    if (key in update) query = query.lte(key, Number(update[key]) || 0);
  }
  if (options.requireBookingStatus) query = query.eq("status", options.requireBookingStatus);
  const { data, error } = await query.select("id");
  if (error) throw new Error(`Stripe is up to date, but saving booking ${booking.id} failed: ${error.message}. Running it again is safe.`);
  if (data?.length) return { extraSaved: true, conflict: false };

  // Something changed meanwhile: keep the larger amounts, leave the rest alone
  const { data: current, error: readError } = await supabase
    .from("bookings")
    .select("status, host_payout_status, refunded_amount, host_reversed_amount")
    .eq("id", booking.id)
    .maybeSingle();
  if (readError) throw new Error(`Reading booking ${booking.id} failed: ${readError.message}`);
  const amounts: Record<string, unknown> = {};
  for (const key of ["refunded_amount", "host_reversed_amount"] as const) {
    if (key in update) amounts[key] = Math.max(Number(update[key]) || 0, Number(current?.[key]) || 0);
  }
  if ("stripe_transfer_id" in update) amounts.stripe_transfer_id = update.stripe_transfer_id;
  const statusStillOk = !options.requireBookingStatus || current?.status === options.requireBookingStatus;
  if (statusStillOk && Object.keys(extra).length) Object.assign(amounts, extra);
  if (Object.keys(amounts).length) {
    const { error: amountsError } = await supabase.from("bookings").update(amounts).eq("id", booking.id);
    if (amountsError) throw new Error(`Saving booking ${booking.id} failed: ${amountsError.message}`);
  }
  const payoutWanted = update.host_payout_status ?? booking.host_payout_status;
  if (current && current.host_payout_status !== payoutWanted) {
    notes.push(
      `The payout state changed from ${booking.host_payout_status ?? "none"} to ${current.host_payout_status ?? "none"} while this ran (wanted ${payoutWanted ?? "none"}). Check the booking.`,
    );
  }
  const newerAmounts = (["refunded_amount", "host_reversed_amount"] as const).filter(
    (key) => key in update && Number(current?.[key]) > (Number(update[key]) || 0),
  );
  if (newerAmounts.length) {
    // Another run wrote larger figures meanwhile (normal), or the stored ones
    // were set by hand above Stripe's: then this repeats, and the payout job
    // pays nothing for the booking until a person has looked
    notes.push(
      `The stored ${newerAmounts.map((key) => `${key} (${kr(Number(current?.[key]))})`).join(" and ")} is higher than this run's figures from Stripe (${newerAmounts.map((key) => kr(Number(update[key]) || 0)).join(", ")}); the higher figures were kept. If this repeats, check the booking against Stripe.`,
    );
  }
  const conflict = !current || current.host_payout_status !== booking.host_payout_status || newerAmounts.length > 0;
  return { extraSaved: statusStillOk, conflict, status: current?.host_payout_status ?? null };
}

/**
 * A paid booking checkout refunded in full before any booking was saved (e.g.
 * by hand in Stripe after a failed save). No booking exists, so the host must
 * not keep the transfer: whatever they still hold from it is reversed, and
 * support is told either way. Returns the amount reversed now. Safe to repeat:
 * once reversed, nothing is left to reverse.
 */
export async function reverseUnsavedPayment(
  stripe: Stripe,
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  sessionId: string,
  details: string[],
): Promise<number> {
  const { transfer, state, applicationFeeId } = await loadTransferState(stripe, charge);
  if (!transfer || !state) return 0;
  const holds = hostHoldsFromTransfer(state);
  if (holds < 0) {
    // E.g. refunded with "Reverse transfer" but without "Refund application
    // fee": Stripe took our fee from the host for a stay that never existed
    await alertAdminOnce(supabase, `unsaved-refund-overreversed:${sessionId}`, "Refunded checkout: the host lost our fee", [
      ...details,
      `The payment was refunded before a booking was saved, so no booking exists, but Stripe took ${kr(-holds)} more from the host than they received (transfer ${transfer.id}).`,
      `Refund ${kr(-holds)} of application fee ${applicationFeeId ?? "(none)"} in Stripe so the host is not charged for it. This is required: until then the host's Stripe balance is lower than what their held bookings hold, so the payout job's safety stop pays this host nothing.`,
    ]).catch((alertError) => console.error("[BOOKING-MONEY] Alert failed:", errorText(alertError)));
    return 0;
  }
  const reversible = Math.max(0, state.transferAmount - state.transferReversed);
  const amount = Math.min(reversible, holds);
  if (amount <= 0) return 0;
  try {
    await stripe.transfers.createReversal(
      transfer.id,
      {
        amount,
        description: `Checkout ${sessionId} refunded before a booking was saved`.slice(0, 350),
        metadata: { source: ADMIN_SOURCE, session_id: sessionId, reason: "refunded before the booking was saved" },
      },
      { idempotencyKey: `unsaved-reversal-${sessionId}-from-${state.transferReversed}` },
    );
  } catch (reversalError) {
    await alertAdminOnce(supabase, `unsaved-refund-reversal-failed:${sessionId}`, "Refunded checkout: the host still holds the money", [
      ...details,
      `The payment was refunded before a booking was saved, so no booking exists, but the host still holds ${kr(amount)} of it in Stripe (transfer ${transfer.id}).`,
      `Reversing it FAILED: ${errorText(reversalError)}. Reverse ${kr(amount)} from ${transfer.id} in the Stripe dashboard, or the host's next payout includes it for a stay that never happened.`,
    ]).catch((alertError) => console.error("[BOOKING-MONEY] Alert failed:", errorText(alertError)));
    return 0;
  }
  await alertAdminOnce(supabase, `unsaved-refund-reversed:${sessionId}`, "Refunded checkout: host transfer taken back", [
    ...details,
    `The payment was refunded before a booking was saved, so no booking exists. ${kr(amount)} was taken back from the host's transfer ${transfer.id}, so the host keeps nothing from it.`,
  ]).catch((alertError) => console.error("[BOOKING-MONEY] Alert failed:", errorText(alertError)));
  return amount;
}
