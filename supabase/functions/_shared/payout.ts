// Host payout and refund arithmetic, shared by the booking save path
// (process-checkout-session), booking e-mails, the daily health check, the
// host payout job, cancel-booking, the Stripe webhook, the tax report and the
// client (admin, host dashboard, financial views), so they all agree on the
// owner's rules (21 Oct 2026, payout timing and refunds after payout amended
// later the same day):
// - The host's share lands in the host's own Stripe balance at payment
//   (destination charge) and is paid out to their bank the day after
//   check-in, but never later than 85 days after the guest paid: Stripe pays
//   out funds a manual-payout account leaves alone for 90 days on its own, and
//   our job must always pay first (payoutDueOn).
// - Guest cancels: the policy percentage (90/50/0) of the host's price is
//   refunded; the guest service fee is never refunded.
// - Host or platform cancels: the guest gets everything back.
// - Whatever the guest gets back comes out of the host's share, up to the
//   whole share: expected reduction = min(host share, refunded to the guest).
//   While the share is still in the host's Stripe balance it is reversed from
//   the booking's transfer; whatever had already been paid out to the host
//   becomes a host_charges row that the payout job takes from the host's next
//   payouts (planHostReconciliation). Stripe is the source of truth for the
//   refund and the reversals; the database copies are re-synced from Stripe.
//
// Pure functions only (no Deno, Stripe or Supabase imports) so vitest can test
// them (src/lib/payout.test.ts). Amounts are whole öre; dates are Swedish
// calendar dates "YYYY-MM-DD".
//
// Other functions and the client import these names; keep them stable:
//   export function payoutDueOn(checkInDate: string, paidAt: PaidAt): string
//   export function dayAfterCheckIn(checkInDate: string): string
//   export function stockholmDate(at: PaidAt): string
//   export function guestRefundAmount(hostAmount: number, refundPct: number): number
//   export function remainingHostShare(hostAmount: number, reversed: number): number
//   export function hostCancellationRefund(totalAmount: number, alreadyRefunded?: number): number
//   export function addDays(isoDate: string, days: number): string
//   export function daysPastDue(dueOn: string, today: string): number
//   export function initialHostPayout(checkInDate, paidAt, transferId, hasDestination): InitialHostPayout
//   export type HostPayoutStatus; export const HOST_PAYOUT_DELAY_DAYS, MAX_HOLD_DAYS
//   export function hostShareAmount(booking): number
//   export function hostNetAmount(booking): number
//   export function expectedHostReduction(hostAmount: number, amountRefunded: number): number
//   export function pendingHostReduction(booking): number
//   export function cancellationRefundTarget(cancelledBy, hostAmount, totalAmount, policyPct): number
//   export function planCancellation(input: CancellationPlanInput): CancellationPlan
//   export function hostHoldsFromTransfer(t: TransferState): number
//   export function shareTakenBack(t: TransferState): number
//   export function planHostReconciliation(hostAmount, amountRefunded, t: TransferState, options?): HostReconciliation
//   export function bookingPayoutTarget(hostAmount, refundReversed, ownChargesOpen, chargeSettled): number
//   export function payableNow(holds: number, target: number, paidSoFar: number): number
//   export function ownRecoveryFromTransfer(charge, holds, paidSoFar, target, transferLeft): number
//   export function isOwnRefundRecovery(charge, bookingId: string): boolean
//   export function heldBalanceShortfall(held: number[], available: number, pending: number): number
//   export function stableUuid(text: string): Promise<string>
//   export const REFUND_RECOVERY_REASON
//   export const STRIPE_AUTO_PAYOUT_DAYS; export function stripeAutoPayout(paidAt, today): StripeAutoPayout

/** bookings.host_payout_status (CHECK constraint in the database) */
export type HostPayoutStatus = "held" | "paid_out" | "manual" | "reversed" | "platform";

/** Who cancelled a booking (bookings.cancelled_by) */
export type CancelledBy = "guest" | "host" | "platform";

/** Hosts are paid out this many days after check-in */
export const HOST_PAYOUT_DELAY_DAYS = 1;

/**
 * ...but never later than this many days after the guest paid. Stripe pays
 * out funds a manual-payout account leaves alone for 90 days on its own
 * (docs.stripe.com/connect/manual-payouts); paying by day 85 means our job
 * always pays first, so Stripe never sweeps a held share.
 */
export const MAX_HOLD_DAYS = 85;

/** A payment time: a Swedish date "YYYY-MM-DD", an ISO timestamp, a Date or Unix milliseconds */
export type PaidAt = string | number | Date;

/**
 * The reason on a host_charges row for a refund that should have come from
 * the host's share after that share was paid out ("Refund after payout for
 * booking <id>"); the payout job takes it from the host's next payouts.
 */
export const REFUND_RECOVERY_REASON = "Refund after payout for booking";

/** A host_charges row recording a refund after payout of this very booking (not a card fee, not another booking's) */
export function isOwnRefundRecovery(charge: { booking_id?: string | null; reason?: string | null }, bookingId: string): boolean {
  return charge.booking_id === bookingId && (charge.reason ?? "").startsWith(REFUND_RECOVERY_REASON);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Midnight UTC of a "YYYY-MM-DD" date; UTC so daylight-saving changes never shift a day */
function dateToUtcMs(isoDate: string): number {
  const day = String(isoDate ?? "").slice(0, 10);
  const ms = ISO_DATE.test(day) ? Date.parse(`${day}T00:00:00Z`) : NaN;
  if (Number.isNaN(ms)) throw new Error(`Invalid date: ${isoDate}`);
  return ms;
}

/** "2026-12-31" + 1 -> "2027-01-01" */
export function addDays(isoDate: string, days: number): string {
  return new Date(dateToUtcMs(isoDate) + days * 86_400_000).toISOString().slice(0, 10);
}

/** The Swedish calendar date of a moment; a "YYYY-MM-DD" date is taken as it is */
export function stockholmDate(at: PaidAt): string {
  if (typeof at === "string" && ISO_DATE.test(at)) return at;
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${String(at)}`);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(date);
}

/** The day after check-in: when a host paid by hand (money in our account) is paid */
export function dayAfterCheckIn(checkInDate: string): string {
  return addDays(checkInDate, HOST_PAYOUT_DELAY_DAYS);
}

/**
 * The date the payout job pays a held share out to the host's bank: the day
 * after check-in, or 85 days after the guest paid if that comes first
 * (MAX_HOLD_DAYS), both Swedish dates.
 */
export function payoutDueOn(checkInDate: string, paidAt: PaidAt): string {
  const afterStay = dayAfterCheckIn(checkInDate);
  const holdLimit = addDays(stockholmDate(paidAt), MAX_HOLD_DAYS);
  return holdLimit < afterStay ? holdLimit : afterStay;
}

/** Whole days since the due date: 0 on the day, negative before it */
export function daysPastDue(dueOn: string, today: string): number {
  return Math.round((dateToUtcMs(today) - dateToUtcMs(dueOn)) / 86_400_000);
}

/**
 * Stripe pays out funds a manual-payout account leaves alone this many days
 * on its own. MAX_HOLD_DAYS keeps the payout job ahead of it, except while a
 * host's payouts wait for their tax details (release-host-payouts).
 */
export const STRIPE_AUTO_PAYOUT_DAYS = 90;

export interface StripeAutoPayout {
  /** The Swedish date the guest paid */
  paidOn: string;
  /** Whole days since then */
  daysSincePaid: number;
  /** When Stripe pays the share out on its own (STRIPE_AUTO_PAYOUT_DAYS after paidOn) */
  on: string;
  /** Days until then; 0 or less: it may already have */
  daysLeft: number;
}

/** A share held in the host's Stripe account since the guest paid: how long it has waited, and when Stripe pays it out itself */
export function stripeAutoPayout(paidAt: PaidAt, today: string): StripeAutoPayout {
  const paidOn = stockholmDate(paidAt);
  const daysSincePaid = daysPastDue(paidOn, today);
  return { paidOn, daysSincePaid, on: addDays(paidOn, STRIPE_AUTO_PAYOUT_DAYS), daysLeft: STRIPE_AUTO_PAYOUT_DAYS - daysSincePaid };
}

const wholeOre = (amount: unknown) => Math.max(0, Math.round(Number(amount) || 0));
/** Like wholeOre, but keeps the sign (a balance or a net reduction can be negative) */
const signedOre = (amount: unknown) => Math.round(Number(amount) || 0);

/**
 * What a guest gets back when they cancel: the policy percentage of the
 * host's price only. The guest service fee stays with the platform, so the
 * host bears the refund (it is taken back from the host's transfer).
 */
export function guestRefundAmount(hostAmount: number, refundPct: number): number {
  const pct = Math.min(100, Math.max(0, Number(refundPct) || 0));
  return Math.round((wholeOre(hostAmount) * pct) / 100);
}

/** The host's share still to be paid out after what was taken back */
export function remainingHostShare(hostAmount: number, reversed: number): number {
  return Math.max(0, wholeOre(hostAmount) - wholeOre(reversed));
}

/**
 * What a guest gets back when the host (or the platform) cancels, or the
 * dates clash after payment: everything they paid, service fee included,
 * less anything already refunded.
 */
export function hostCancellationRefund(totalAmount: number, alreadyRefunded = 0): number {
  return Math.max(0, wholeOre(totalAmount) - wholeOre(alreadyRefunded));
}

export interface InitialHostPayout {
  host_payout_status: Extract<HostPayoutStatus, "held" | "manual">;
  host_payout_due_on: string;
  stripe_transfer_id: string | null;
}

/**
 * Payout columns for a booking as it is saved. A destination charge leaves
 * the host's share in the host's own Stripe balance ("held") until the payout
 * job sends it to their bank, on payoutDueOn. Without one the money reached
 * the platform account and a person pays the host by hand ("manual") the day
 * after check-in: Stripe's 90-day limit doesn't apply to our own balance, and
 * paying a host by hand months before the stay only adds refund risk.
 */
export function initialHostPayout(
  checkInDate: string,
  paidAt: PaidAt,
  transferId: string | null,
  hasDestination: boolean,
): InitialHostPayout {
  const held = !!transferId || hasDestination;
  return {
    host_payout_status: held ? "held" : "manual",
    host_payout_due_on: held ? payoutDueOn(checkInDate, paidAt) : dayAfterCheckIn(checkInDate),
    stripe_transfer_id: transferId || null,
  };
}

// ---------------------------------------------------------------------------
// One money model for bookings

/** The booking columns the money helpers read; all optional so any booking row fits */
export interface BookingMoneyRow {
  status?: string | null;
  total_amount?: number | null;
  host_amount?: number | null;
  service_fee?: number | null;
  refunded_amount?: number | null;
  host_reversed_amount?: number | null;
  stripe_payment_intent_id?: string | null;
}

/** The host's price for a booking: host_amount, or (older rows) what the guest paid minus the service fee */
export function hostShareAmount(b: Pick<BookingMoneyRow, "host_amount" | "total_amount" | "service_fee">): number {
  if (b.host_amount != null) return wholeOre(b.host_amount);
  return Math.max(0, wholeOre(b.total_amount) - wholeOre(b.service_fee));
}

/**
 * How much of the host's share refunds take back: everything the guest got
 * back, but never more than the share. Guest cancellations refund at most the
 * host's price, so the host bears all of it and the fee stays with us; host
 * and platform cancellations refund the total, so the host loses the whole
 * share and we refund our fee.
 */
export function expectedHostReduction(hostAmount: number, amountRefunded: number): number {
  return Math.min(wholeOre(hostAmount), wholeOre(amountRefunded));
}

/** Booking statuses that can carry income for the host (stays, and cancellations the host kept part of) */
const INCOME_STATUSES = new Set(["confirmed", "completed", "cancelled"]);

/**
 * What the host keeps from a booking, in öre: their share less what refunds
 * take back from it. One rule for the host dashboard, the financial views,
 * the tax report and the health check.
 * - Paid by card on the site (stripe_payment_intent_id): share minus the
 *   larger of what was taken back (host_reversed_amount: Stripe's reversals
 *   plus refunds after payout recorded as host charges) and what the refunds
 *   require (min(share, refunded_amount)), so a refund still being taken back
 *   already counts.
 * - Cancelled without a card payment, or not paid (pending statuses): 0.
 * - A confirmed stay entered by hand (paid outside the site): the share.
 */
export function hostNetAmount(b: BookingMoneyRow): number {
  if (b.status != null && !INCOME_STATUSES.has(b.status)) return 0;
  const paidByCard = !!b.stripe_payment_intent_id;
  if (b.status === "cancelled" && !paidByCard) return 0;
  const share = hostShareAmount(b);
  const owedReduction = paidByCard ? expectedHostReduction(share, wholeOre(b.refunded_amount)) : 0;
  return remainingHostShare(share, Math.max(wholeOre(b.host_reversed_amount), owedReduction));
}

/**
 * What refunds still require from the host's share by the database's figures:
 * min(share, refunded_amount) less host_reversed_amount (reversed in Stripe
 * plus refunds after payout recorded as host charges). Above 0 means a
 * reversal failed or never ran; the payout job retries those every day.
 */
export function pendingHostReduction(b: Pick<BookingMoneyRow, "host_amount" | "total_amount" | "service_fee" | "refunded_amount" | "host_reversed_amount">): number {
  return Math.max(0, expectedHostReduction(hostShareAmount(b), wholeOre(b.refunded_amount)) - wholeOre(b.host_reversed_amount));
}

/**
 * The total a guest should have got back once a cancellation is done: guest
 * cancels, the policy % of the host's price; host or we cancel, everything.
 */
export function cancellationRefundTarget(
  cancelledBy: CancelledBy,
  hostAmount: number,
  totalAmount: number,
  policyPct: number,
): number {
  const total = wholeOre(totalAmount);
  return cancelledBy === "guest" ? Math.min(total, guestRefundAmount(hostAmount, policyPct)) : total;
}

export interface CancellationPlanInput {
  cancelledBy: CancelledBy;
  hostAmount: number;
  totalAmount: number;
  /** The policy tier's refund % (used when the guest cancels) */
  policyPct: number;
  /** Refunded to the guest so far (Stripe's charge.amount_refunded) */
  alreadyRefunded: number;
  /** Taken back from the host's share so far (Stripe's reversals, net of application fee refunds) */
  alreadyTakenBack: number;
  /** Paid by card on the site; otherwise nothing is refunded or taken back */
  hasPayment: boolean;
}

export interface CancellationPlan {
  /** Guest cancels: the policy %. Host or we cancel: 100. No card payment: 0 */
  refundPercentage: number;
  /** The total the guest should have back */
  refundTarget: number;
  /** To refund now (target minus what was already refunded, never negative) */
  refundNow: number;
  /** Refunded to the guest in total once this is done */
  totalRefunded: number;
  /** Taken from the host's share in total once this is done */
  hostTakenBack: number;
  /** Still to take from the host's share now */
  hostTakenBackNow: number;
  /** The host's share left afterwards */
  hostRemaining: number;
  /** The service fee that stays with us */
  serviceFeeKept: number;
}

/**
 * A cancellation as cumulative targets, so a retry, an earlier refund in the
 * Stripe dashboard or a partial earlier attempt never refunds twice or takes
 * back the wrong amount: the guest's refund target minus what Stripe already
 * refunded, and the host's reduction min(share, total refunded) minus what
 * was already taken back.
 */
export function planCancellation(i: CancellationPlanInput): CancellationPlan {
  const hostAmount = wholeOre(i.hostAmount);
  const total = wholeOre(i.totalAmount);
  const alreadyRefunded = wholeOre(i.alreadyRefunded);
  const alreadyTakenBack = wholeOre(i.alreadyTakenBack);
  if (!i.hasPayment) {
    return {
      refundPercentage: 0,
      refundTarget: 0,
      refundNow: 0,
      totalRefunded: alreadyRefunded,
      hostTakenBack: alreadyTakenBack,
      hostTakenBackNow: 0,
      hostRemaining: remainingHostShare(hostAmount, alreadyTakenBack),
      serviceFeeKept: 0,
    };
  }
  const refundPercentage = i.cancelledBy === "guest" ? Math.min(100, Math.max(0, Number(i.policyPct) || 0)) : 100;
  const refundTarget = cancellationRefundTarget(i.cancelledBy, hostAmount, total, refundPercentage);
  const refundNow = Math.max(0, refundTarget - alreadyRefunded);
  const totalRefunded = alreadyRefunded + refundNow;
  const hostTakenBack = Math.max(alreadyTakenBack, expectedHostReduction(hostAmount, totalRefunded));
  const hostRemaining = remainingHostShare(hostAmount, hostTakenBack);
  return {
    refundPercentage,
    refundTarget,
    refundNow,
    totalRefunded,
    hostTakenBack,
    hostTakenBackNow: hostTakenBack - alreadyTakenBack,
    hostRemaining,
    serviceFeeKept: Math.max(0, total - totalRefunded - hostRemaining),
  };
}

/**
 * A destination charge's transfer to the host, as Stripe reports it. With
 * application_fee_amount (our setup) the transfer is the whole payment and
 * our service fee comes back to us as an application fee; with
 * transfer_data.amount the transfer is the host's price and there is no fee.
 */
export interface TransferState {
  /** transfer.amount */
  transferAmount: number;
  /** transfer.amount_reversed: every reversal, host-charge settlements included */
  transferReversed: number;
  /** Reversals that settled a host charge (metadata.host_charge_id), not refunds */
  chargeSettled: number;
  /** The charge's application fee (0 if none) */
  applicationFee: number;
  /** What was refunded of that fee (it goes back to the host's balance) */
  applicationFeeRefunded: number;
}

/** What the host still holds in Stripe from this booking: the transfer left minus the fee we keep */
export function hostHoldsFromTransfer(t: TransferState): number {
  return signedOre(t.transferAmount) - signedOre(t.transferReversed) -
    (signedOre(t.applicationFee) - signedOre(t.applicationFeeRefunded));
}

/**
 * Net amount taken back from the host's share by refunds and reversals:
 * reversals other than host-charge settlements, less application fee given
 * back to the host. A dashboard refund with "Reverse transfer" and "Refund
 * application fee" of 11 000 reverses 11 000 and gives back the 1 000 fee:
 * 10 000 taken back. Can be negative if a fee was refunded without a reversal.
 */
export function shareTakenBack(t: TransferState): number {
  return signedOre(t.transferReversed) - signedOre(t.chargeSettled) - signedOre(t.applicationFeeRefunded);
}

export interface HostReconciliationOptions {
  /** Refunds after payout already recorded as host charges for this booking */
  alreadyCharged?: number;
  /** The booking is paid_out: its share left the host's Stripe balance, nothing is reversed */
  sharePaidOut?: boolean;
  /** Still held, but our payouts already sent this much of it to the host's bank */
  paidOutSoFar?: number;
}

export interface HostReconciliation {
  /** min(host share, refunded to the guest) */
  expectedReduction: number;
  /** Taken back so far by reversals (Stripe), host-charge settlements not counted */
  takenBack: number;
  /** Refunds after payout recorded as host charges before this run */
  alreadyCharged: number;
  /** Still to reverse from the transfer (0 when nothing is missing) */
  reverseNow: number;
  /**
   * Still to record as a host charge, settled from the host's next payouts:
   * the part of the reduction whose money already left the host's Stripe
   * balance (paid out, or more than the transfer has left)
   */
  chargeNow: number;
  /** Taken back beyond what the refunds require (e.g. "Reverse transfer" without "Refund application fee") */
  overReduced: number;
  /** What the host holds from this booking once reverseNow is done */
  hostHoldsAfter: number;
  /** The host's share left once reverseNow and chargeNow are done (host-charge settlements not deducted) */
  remainingShare: number;
}

/**
 * Compares what the refunds require with what was taken from the host so far
 * (reversals in Stripe plus host charges), and splits what is missing:
 * reversed from the transfer while the money is still in the host's balance
 * and not yet paid out, otherwise a host charge (rule of 21 Oct 2026: a refund
 * after payout is taken from the host's next payout).
 */
export function planHostReconciliation(
  hostAmount: number,
  amountRefunded: number,
  t: TransferState,
  options: HostReconciliationOptions = {},
): HostReconciliation {
  const expectedReduction = expectedHostReduction(hostAmount, amountRefunded);
  const takenBack = shareTakenBack(t);
  const alreadyCharged = wholeOre(options.alreadyCharged);
  const missing = Math.max(0, expectedReduction - takenBack - alreadyCharged);
  // Never reverse money the host no longer has from this booking: what is
  // left of the transfer, less our payouts already made from it
  const reversible = options.sharePaidOut
    ? 0
    : Math.max(
      0,
      Math.min(
        signedOre(t.transferAmount) - signedOre(t.transferReversed),
        hostHoldsFromTransfer(t) - wholeOre(options.paidOutSoFar),
      ),
    );
  const reverseNow = Math.min(reversible, missing);
  const chargeNow = missing - reverseNow;
  return {
    expectedReduction,
    takenBack,
    alreadyCharged,
    reverseNow,
    chargeNow,
    overReduced: Math.max(0, takenBack + alreadyCharged - expectedReduction),
    hostHoldsAfter: hostHoldsFromTransfer(t) - reverseNow,
    remainingShare: remainingHostShare(hostAmount, Math.max(0, takenBack + alreadyCharged + reverseNow + chargeNow)),
  };
}

/**
 * What a held booking's transfer still has to give the host in total, our
 * payouts for it included (release-host-payouts):
 *   share - refund reversals - this booking's own refund-after-payout charges
 *   still open - every host-charge settlement reversed from this transfer.
 * The own open charges are the refund's part that was recorded as a host
 * charge because the share had been paid out; if that payout failed and the
 * money came back, the job takes them from this transfer (as the refund's
 * reversal), which moves them from "open" to "settled from this transfer"
 * and leaves the target unchanged. Own charges settled from other bookings'
 * transfers (or by hand) are not deducted: the host already paid them, so
 * the returned money is theirs. Other bookings' charges (card fees, their
 * refunds after payout) settled from this transfer are deducted: that part
 * of the booking went to what the host owed. Can be negative.
 */
export function bookingPayoutTarget(hostAmount: number, refundReversed: number, ownChargesOpen: number, chargeSettled: number): number {
  return wholeOre(hostAmount) - signedOre(refundReversed) - wholeOre(ownChargesOpen) - signedOre(chargeSettled);
}

/**
 * What the payout job may still pay out for a booking: never more than the
 * host holds from it nor than its target, less our payouts for it so far.
 * 0 or less means nothing is left to pay.
 */
export function payableNow(holds: number, target: number, paidSoFar: number): number {
  return Math.max(0, Math.min(signedOre(holds), signedOre(target))) - wholeOre(paidSoFar);
}

/**
 * How much of a booking's own open refund-after-payout charge the payout job
 * takes from the booking's own transfer: only money the host still holds from
 * it beyond our payouts and beyond what is still to be paid to them (so a
 * share whose payout failed and came back), and never more than the transfer
 * has left to reverse. 0 while the share is paid out.
 */
export function ownRecoveryFromTransfer(charge: number, holds: number, paidSoFar: number, target: number, transferLeft: number): number {
  return Math.max(
    0,
    Math.min(wholeOre(charge), signedOre(transferLeft), signedOre(holds) - Math.max(wholeOre(paidSoFar), signedOre(target))),
  );
}

/**
 * The payout job's safety stop. What a host account should hold is the sum
 * of its held bookings' shares not yet paid out; if available + pending is
 * lower, money left the account in a way we did not record (an automatic
 * Stripe payout, the host's own payout, a negative balance, a dispute), and
 * nothing is paid to that host until a person has looked. Returns the
 * shortfall (0 when covered).
 */
export function heldBalanceShortfall(held: number[], available: number, pending: number): number {
  const expected = held.reduce((total, amount) => total + Math.max(0, signedOre(amount)), 0);
  return Math.max(0, expected - (signedOre(available) + signedOre(pending)));
}

/**
 * The same uuid for the same text (SHA-256, version 5 layout), so a host
 * charge can only be recorded once: a second insert (retry, double click, a
 * webhook and an admin at once) hits the primary key instead of charging the
 * host twice.
 */
export async function stableUuid(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
