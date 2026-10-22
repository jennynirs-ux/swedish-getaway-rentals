/**
 * Pure helpers for the host dashboard (Bank Account tab, onboarding checklist
 * and the bookings list), kept free of React and Supabase so vitest can test
 * them (src/lib/hostDashboard.test.ts).
 */
import { type HostPayoutStatus, isOwnRefundRecovery } from "../../supabase/functions/_shared/payout";

// ---------------------------------------------------------------------------
// Stripe account state (Bank Account tab and checklist)

/** What create-connect-account's { action: "status" } returns */
export interface PayoutStatus {
  hasAccount: boolean;
  /** Stripe can send this host transfers: publishing needs it (profiles.stripe_connect_ready) */
  ready: boolean;
  detailsSubmitted?: boolean;
  /** Stripe has verified the bank account, so payouts to it can go out */
  payoutsEnabled?: boolean;
  requirementsDue?: number;
  /**
   * Stripe's requirements.disabled_reason (e.g. "rejected.fraud",
   * "requirements.past_due"), once create-connect-account sends it. Without
   * it a rejected account looks like one Stripe is still checking.
   */
  disabledReason?: string | null;
}

export type PayoutState = "none" | "details_missing" | "verifying" | "action_needed" | "ready";

/** Disabled for a reason the host can't fix in Stripe's form: support has to step in */
const NEEDS_SUPPORT = /^(rejected\.|listed$|platform_paused$|other$)/;

/**
 * Where the host is with Stripe. Once the host has submitted everything,
 * Stripe checks it for a while; that is not "details missing", and telling
 * the host so sent them back to Stripe for nothing. A rejected or paused
 * account is neither: only support can help.
 */
export const payoutState = (status?: PayoutStatus | null): PayoutState => {
  if (!status?.hasAccount) return "none";
  if (status.ready) return "ready";
  const reason = status.disabledReason ?? "";
  if (NEEDS_SUPPORT.test(reason)) return "action_needed";
  if (
    !status.detailsSubmitted ||
    (status.requirementsDue ?? 0) > 0 ||
    reason === "requirements.past_due" ||
    reason.startsWith("action_required.")
  ) {
    return "details_missing";
  }
  return "verifying";
};

/**
 * How often to ask Stripe again, in ms, or false: only while Stripe is
 * checking, since nothing changes on its own while the host has to act.
 */
export const payoutStatusPollMs = (status?: PayoutStatus | null): number | false =>
  payoutState(status) === "verifying" ? 30_000 : false;

// ---------------------------------------------------------------------------
// Publishing

/** Which rule of the database's publish check (prevent_self_publish) stopped a publish */
export type PublishBlocker = "terms" | "bank" | "location" | "tax" | null;
export const publishBlocker = (message: string): PublishBlocker => {
  if (/host terms/i.test(message)) return "terms";
  if (/bank account/i.test(message)) return "bank";
  if (/county|on the map/i.test(message)) return "location";
  if (/tax details/i.test(message)) return "tax";
  return null;
};

// ---------------------------------------------------------------------------
// Bookings list

/** "2026-10-23" (or a timestamp's first 10 characters) as "23 Oct 2026" */
export const formatDay = (isoDate: string) =>
  new Date(`${isoDate.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Öre as "10 000 SEK" */
export const formatSek = (ore: number) => `${Math.round(ore / 100).toLocaleString("sv-SE")} SEK`;

export interface BookingPayout {
  status: string;
  host_payout_status?: HostPayoutStatus | string | null;
  /** Swedish date "YYYY-MM-DD" */
  host_payout_due_on?: string | null;
  /** The Swedish date of host_paid_out_at, "YYYY-MM-DD" */
  paidOutOn?: string | null;
}

/**
 * Where the host's money for a booking is, in plain words.
 * netOre: what the host keeps of this booking; today: Swedish date "YYYY-MM-DD".
 */
export const hostPayoutText = (b: BookingPayout, netOre: number, today: string): string | null => {
  const cancelled = b.status === "cancelled";
  switch (b.host_payout_status) {
    case "held": {
      if (netOre <= 0) return "Nothing to pay out for this booking";
      const what = cancelled ? "What you keep is" : "Your price is";
      if (!b.host_payout_due_on) return `${what} paid out to your bank the day after check-in`;
      if (b.host_payout_due_on < today) return `${what} on its way to your bank (due ${formatDay(b.host_payout_due_on)})`;
      return `${what} paid out to your bank on ${formatDay(b.host_payout_due_on)}`;
    }
    case "paid_out":
      // Set by the daily payout job (or by our team after paying by hand)
      return b.paidOutOn ? `Paid out to your bank on ${formatDay(b.paidOutOn)}` : "Paid out to your bank";
    case "reversed":
      return "Nothing to pay out: your share went back to the guest with the refund";
    case "manual":
      return cancelled
        ? "Our team will settle this payout with you directly"
        : "Our team pays this one to you directly by bank transfer";
    case "platform":
      return "Settled by our team (booked before payouts moved to your Stripe account)";
    default:
      return null;
  }
};

export interface OpenHostCharge {
  id: string;
  /** öre */
  amount: number;
  created_at: string;
  booking_id?: string | null;
  reason?: string | null;
}

/**
 * The open charges (card fees of bookings the host cancelled, refunds made
 * after a payout) that the payout job takes from the payout of payableOre for
 * booking bookingId, as release-host-payouts does: oldest first, from each
 * min(charge, what is left of the payout) until the payout is used up. A
 * charge taken only in part (taken < amount) keeps the rest open for later
 * payouts. The booking's own refund-after-payout charges are not taken from
 * its payout: its share already excludes them.
 */
export const chargesTakenFrom = <C extends OpenHostCharge>(
  charges: C[],
  payableOre: number,
  bookingId?: string,
): (C & { taken: number })[] => {
  let left = Math.max(0, payableOre);
  const taken: (C & { taken: number })[] = [];
  for (const charge of [...charges].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (left <= 0) break;
    if (charge.amount <= 0 || (bookingId && isOwnRefundRecovery(charge, bookingId))) continue;
    const part = Math.min(charge.amount, left);
    taken.push({ ...charge, taken: part });
    left -= part;
  }
  return taken;
};

/** The held booking paid out next (earliest due date with something to pay), which open charges come off */
export const nextPayoutId = <B extends BookingPayout & { id: string }>(
  bookings: B[],
  netOre: (b: B) => number,
): string | null => {
  let next: B | null = null;
  for (const b of bookings) {
    if (b.host_payout_status !== "held" || !b.host_payout_due_on || netOre(b) <= 0) continue;
    if (!next || b.host_payout_due_on < (next.host_payout_due_on as string)) next = b;
  }
  return next?.id ?? null;
};
