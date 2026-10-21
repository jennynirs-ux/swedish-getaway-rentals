import { describe, expect, it } from "vitest";
// The payout and refund rules the booking, payout and cancel edge functions share
import {
  addDays,
  bookingPayoutTarget,
  cancellationRefundTarget,
  dayAfterCheckIn,
  daysPastDue,
  expectedHostReduction,
  guestRefundAmount,
  heldBalanceShortfall,
  hostCancellationRefund,
  hostHoldsFromTransfer,
  hostNetAmount,
  hostShareAmount,
  initialHostPayout,
  isOwnRefundRecovery,
  MAX_HOLD_DAYS,
  ownRecoveryFromTransfer,
  payableNow,
  payoutDueOn,
  pendingHostReduction,
  planCancellation,
  planHostReconciliation,
  remainingHostShare,
  shareTakenBack,
  stableUuid,
  stockholmDate,
  type TransferState,
} from "../../supabase/functions/_shared/payout";

describe("dayAfterCheckIn", () => {
  it.each([
    ["2026-07-10", "2026-07-11"],
    ["2026-12-31", "2027-01-01"],
    ["2028-02-28", "2028-02-29"],
    // Daylight saving starts and ends: still exactly one calendar day
    ["2026-03-28", "2026-03-29"],
    ["2026-10-24", "2026-10-25"],
  ])("check-in %s is paid out %s", (checkIn, due) => {
    expect(dayAfterCheckIn(checkIn)).toBe(due);
  });

  it("accepts a timestamp and uses its date", () => {
    expect(dayAfterCheckIn("2026-07-10T00:00:00+00:00")).toBe("2026-07-11");
  });

  it("rejects a non-date", () => {
    expect(() => dayAfterCheckIn("next friday")).toThrow();
  });
});

describe("payoutDueOn: the day after check-in, at the latest 85 days after payment", () => {
  it("a stay soon after payment: the day after check-in", () => {
    expect(payoutDueOn("2026-07-10", "2026-06-01")).toBe("2026-07-11");
  });

  it("a stay far ahead: 85 days after payment, before Stripe's 90-day limit", () => {
    expect(MAX_HOLD_DAYS).toBe(85);
    expect(payoutDueOn("2026-07-10", "2026-01-01")).toBe("2026-03-27");
    expect(daysPastDue("2026-01-01", payoutDueOn("2026-07-10", "2026-01-01"))).toBe(85);
  });

  it("exactly 84 days ahead: the day after check-in is day 85", () => {
    expect(payoutDueOn("2026-03-26", "2026-01-01")).toBe("2026-03-27");
  });

  it("counts from the Swedish date of the payment", () => {
    // 23:30 UTC on 1 March is 00:30 on 2 March in Stockholm
    expect(stockholmDate("2026-03-01T23:30:00Z")).toBe("2026-03-02");
    expect(payoutDueOn("2026-12-01", "2026-03-01T23:30:00Z")).toBe(addDays("2026-03-02", 85));
    expect(payoutDueOn("2026-12-01", Date.parse("2026-03-01T23:30:00Z"))).toBe(addDays("2026-03-02", 85));
    expect(payoutDueOn("2026-12-01", new Date("2026-03-01T12:00:00Z"))).toBe(addDays("2026-03-01", 85));
  });

  it("rejects a payment time that is not a date", () => {
    expect(() => payoutDueOn("2026-07-10", "yesterday")).toThrow();
  });
});

describe("addDays and daysPastDue", () => {
  it("moves across months and back", () => {
    expect(addDays("2026-11-01", -2)).toBe("2026-10-30");
  });

  it("counts whole days from the due date", () => {
    expect(daysPastDue("2026-10-18", "2026-10-21")).toBe(3);
    expect(daysPastDue("2026-10-21", "2026-10-21")).toBe(0);
    expect(daysPastDue("2026-10-22", "2026-10-21")).toBe(-1);
  });
});

describe("guestRefundAmount: policy % of the host's price, fee kept", () => {
  // Host price 10 000 kr; the guest paid 11 000 kr with the 10 % fee
  const hostAmount = 1_000_000;

  it.each([
    [90, 900_000],
    [50, 500_000],
    [0, 0],
    [100, 1_000_000],
  ])("%i%% refunds %i öre", (pct, refund) => {
    expect(guestRefundAmount(hostAmount, pct)).toBe(refund);
  });

  it("rounds to whole öre", () => {
    expect(guestRefundAmount(100_005, 50)).toBe(50_003);
  });

  it("never refunds more than the host's price or less than nothing", () => {
    expect(guestRefundAmount(hostAmount, 150)).toBe(hostAmount);
    expect(guestRefundAmount(hostAmount, -10)).toBe(0);
    expect(guestRefundAmount(-5, 90)).toBe(0);
  });
});

describe("remainingHostShare", () => {
  it("subtracts what was already taken back", () => {
    expect(remainingHostShare(1_000_000, 900_000)).toBe(100_000);
    expect(remainingHostShare(1_000_000, 0)).toBe(1_000_000);
  });

  it("never goes below zero", () => {
    expect(remainingHostShare(1_000_000, 1_200_000)).toBe(0);
  });
});

describe("hostCancellationRefund: everything back", () => {
  it("refunds the whole guest total, service fee included", () => {
    expect(hostCancellationRefund(1_100_000)).toBe(1_100_000);
  });

  it("less anything already refunded", () => {
    expect(hostCancellationRefund(1_100_000, 100_000)).toBe(1_000_000);
    expect(hostCancellationRefund(1_100_000, 2_000_000)).toBe(0);
  });
});

describe("initialHostPayout", () => {
  it("holds the host's share in their Stripe balance after a destination charge", () => {
    expect(initialHostPayout("2026-07-10", "2026-06-01", "tr_123", true)).toEqual({
      host_payout_status: "held",
      host_payout_due_on: "2026-07-11",
      stripe_transfer_id: "tr_123",
    });
  });

  it("a held share far ahead is due 85 days after payment", () => {
    expect(initialHostPayout("2026-07-10", "2026-01-01", "tr_123", true).host_payout_due_on).toBe("2026-03-27");
  });

  it("still counts as held when Stripe has not reported the transfer id yet", () => {
    expect(initialHostPayout("2026-07-10", "2026-06-01", null, true).host_payout_status).toBe("held");
  });

  it("needs a payout by hand when the money reached the platform account, the day after check-in", () => {
    // Our own balance has no 90-day limit: no reason to pay a host by hand before the stay
    expect(initialHostPayout("2026-07-10", "2026-01-01", null, false)).toEqual({
      host_payout_status: "manual",
      host_payout_due_on: "2026-07-11",
      stripe_transfer_id: null,
    });
  });
});

// The running example: host price 10 000 kr + 10 % fee, the guest paid 11 000 kr.
// Our destination charge transfers the whole 11 000 and takes the 1 000 fee
// back as an application fee, so the host nets 10 000.
const HOST = 1_000_000;
const TOTAL = 1_100_000;
const FEE = 100_000;
const fresh: TransferState = { transferAmount: TOTAL, transferReversed: 0, chargeSettled: 0, applicationFee: FEE, applicationFeeRefunded: 0 };

describe("hostShareAmount", () => {
  it("is host_amount, or total minus the service fee on older rows", () => {
    expect(hostShareAmount({ host_amount: HOST, total_amount: TOTAL, service_fee: FEE })).toBe(HOST);
    expect(hostShareAmount({ host_amount: null, total_amount: TOTAL, service_fee: FEE })).toBe(HOST);
    expect(hostShareAmount({ total_amount: TOTAL })).toBe(TOTAL);
  });
});

describe("expectedHostReduction: min(share, refunded)", () => {
  it.each([
    [900_000, 900_000], // guest cancels 30 days out: 90 % of the price
    [500_000, 500_000],
    [0, 0],
    [TOTAL, HOST], // host or we cancel: everything back, the host loses the whole share
  ])("refunded %i takes %i from the host", (refunded, reduction) => {
    expect(expectedHostReduction(HOST, refunded)).toBe(reduction);
  });
});

describe("cancellationRefundTarget", () => {
  it("guest: policy % of the host's price; host or we: everything", () => {
    expect(cancellationRefundTarget("guest", HOST, TOTAL, 90)).toBe(900_000);
    expect(cancellationRefundTarget("guest", HOST, TOTAL, 0)).toBe(0);
    expect(cancellationRefundTarget("host", HOST, TOTAL, 0)).toBe(TOTAL);
    expect(cancellationRefundTarget("platform", HOST, TOTAL, 50)).toBe(TOTAL);
  });
});

describe("planCancellation: targets, never increments", () => {
  const base = { hostAmount: HOST, totalAmount: TOTAL, alreadyRefunded: 0, alreadyTakenBack: 0, hasPayment: true };

  it.each([
    [90, 900_000, 100_000],
    [50, 500_000, 500_000],
    [0, 0, HOST],
  ])("guest cancels at %i%%: refund %i, the host keeps %i, the fee stays with us", (pct, refund, keeps) => {
    const plan = planCancellation({ ...base, cancelledBy: "guest", policyPct: pct });
    expect(plan.refundNow).toBe(refund);
    expect(plan.hostTakenBackNow).toBe(refund);
    expect(plan.hostRemaining).toBe(keeps);
    expect(plan.serviceFeeKept).toBe(FEE);
  });

  it("host cancels: everything back, the whole share taken, no fee kept", () => {
    const plan = planCancellation({ ...base, cancelledBy: "host", policyPct: 90 });
    expect(plan).toMatchObject({ refundPercentage: 100, refundNow: TOTAL, hostTakenBack: HOST, hostRemaining: 0, serviceFeeKept: 0 });
  });

  it("a retry after the refund went through refunds nothing more but still reports the totals", () => {
    const plan = planCancellation({ ...base, cancelledBy: "guest", policyPct: 90, alreadyRefunded: 900_000, alreadyTakenBack: 0 });
    expect(plan.refundNow).toBe(0);
    expect(plan.totalRefunded).toBe(900_000);
    // the reversal that never happened is still due
    expect(plan.hostTakenBackNow).toBe(900_000);
    expect(plan.hostRemaining).toBe(100_000);
  });

  it("an earlier goodwill refund counts towards the guest's target and the host's share", () => {
    // 2 000 kr refunded in the dashboard, then the guest cancels at 90 %
    const plan = planCancellation({ ...base, cancelledBy: "guest", policyPct: 90, alreadyRefunded: 200_000, alreadyTakenBack: 200_000 });
    expect(plan.refundNow).toBe(700_000);
    expect(plan.totalRefunded).toBe(900_000);
    expect(plan.hostTakenBackNow).toBe(700_000);
    expect(plan.hostRemaining).toBe(100_000);
  });

  it("a host cancellation after a reversed dashboard refund only reverses the rest", () => {
    const plan = planCancellation({ ...base, cancelledBy: "host", policyPct: 0, alreadyRefunded: 300_000, alreadyTakenBack: 300_000 });
    expect(plan.refundNow).toBe(800_000);
    expect(plan.hostTakenBackNow).toBe(700_000);
    expect(plan.hostRemaining).toBe(0);
  });

  it("never refunds a guest who already got more than the target", () => {
    const plan = planCancellation({ ...base, cancelledBy: "guest", policyPct: 50, alreadyRefunded: 600_000, alreadyTakenBack: 600_000 });
    expect(plan.refundNow).toBe(0);
    expect(plan.hostTakenBackNow).toBe(0);
  });

  it("no card payment: nothing refunded or taken back", () => {
    const plan = planCancellation({ ...base, cancelledBy: "host", policyPct: 0, hasPayment: false });
    expect(plan).toMatchObject({ refundPercentage: 0, refundNow: 0, hostTakenBackNow: 0 });
  });
});

describe("what the host holds and what was taken back (Stripe)", () => {
  it("a fresh destination charge: the host holds their price", () => {
    expect(hostHoldsFromTransfer(fresh)).toBe(HOST);
    expect(shareTakenBack(fresh)).toBe(0);
  });

  it("a full dashboard refund with Reverse transfer and Refund application fee takes exactly the share", () => {
    const t = { ...fresh, transferReversed: TOTAL, applicationFeeRefunded: FEE };
    expect(shareTakenBack(t)).toBe(HOST);
    expect(hostHoldsFromTransfer(t)).toBe(0);
  });

  it("host-charge settlements reduce what the host holds but are not refunds", () => {
    const t = { ...fresh, transferReversed: 16_680, chargeSettled: 16_680 };
    expect(shareTakenBack(t)).toBe(0);
    expect(hostHoldsFromTransfer(t)).toBe(HOST - 16_680);
  });

  it("works with transfer_data.amount too (no application fee)", () => {
    expect(hostHoldsFromTransfer({ transferAmount: HOST, transferReversed: 0, chargeSettled: 0, applicationFee: 0, applicationFeeRefunded: 0 })).toBe(HOST);
  });
});

describe("planHostReconciliation", () => {
  it("guest refund made by cancel-booking: reverse the same amount", () => {
    const plan = planHostReconciliation(HOST, 900_000, fresh);
    expect(plan).toMatchObject({ expectedReduction: 900_000, reverseNow: 900_000, remainingShare: 100_000, hostHoldsAfter: 100_000, overReduced: 0 });
  });

  it("dashboard refund without Reverse transfer: the host bears it", () => {
    const plan = planHostReconciliation(HOST, TOTAL, fresh);
    expect(plan.reverseNow).toBe(HOST);
    expect(plan.remainingShare).toBe(0);
    expect(plan.hostHoldsAfter).toBe(0);
  });

  it("dashboard refund with Reverse transfer and the fee: nothing more to do", () => {
    const plan = planHostReconciliation(HOST, TOTAL, { ...fresh, transferReversed: TOTAL, applicationFeeRefunded: FEE });
    expect(plan.reverseNow).toBe(0);
    expect(plan.overReduced).toBe(0);
  });

  it("Reverse transfer without the fee: the host lost 1 000 too many", () => {
    const plan = planHostReconciliation(HOST, TOTAL, { ...fresh, transferReversed: TOTAL });
    expect(plan.reverseNow).toBe(0);
    expect(plan.overReduced).toBe(FEE);
  });

  it("a partial dashboard refund reversed in proportion, then more refunded: only the difference", () => {
    const plan = planHostReconciliation(HOST, 900_000, { ...fresh, transferReversed: 200_000 });
    expect(plan.reverseNow).toBe(700_000);
  });

  it("is idempotent: once reversed, nothing is left to do", () => {
    const plan = planHostReconciliation(HOST, 900_000, { ...fresh, transferReversed: 900_000 });
    expect(plan.reverseNow).toBe(0);
    expect(plan.remainingShare).toBe(100_000);
  });

  it("never reverses more than the host still holds from the booking; the rest is charged", () => {
    // Host charges of 7 000 were settled from this transfer: the host holds 3 000 of it
    const plan = planHostReconciliation(HOST, 500_000, { ...fresh, transferReversed: 700_000, chargeSettled: 700_000 });
    expect(plan.reverseNow).toBe(300_000);
    expect(plan.chargeNow).toBe(200_000);
    expect(plan.hostHoldsAfter).toBe(0);
  });

  it("nothing to reverse when charges already took more than the booking gave the host", () => {
    const plan = planHostReconciliation(HOST, TOTAL, { ...fresh, transferReversed: TOTAL - 50_000, chargeSettled: TOTAL - 50_000 });
    expect(plan.reverseNow).toBe(0);
    expect(plan.chargeNow).toBe(HOST);
  });
});

describe("hostNetAmount: one rule for dashboard, reports, tax report and health check", () => {
  const paid = { status: "confirmed", host_amount: HOST, total_amount: TOTAL, service_fee: FEE, stripe_payment_intent_id: "pi_1" };

  it("a stay paid by card: the host's price", () => {
    expect(hostNetAmount(paid)).toBe(HOST);
  });

  it("less what was taken back", () => {
    expect(hostNetAmount({ ...paid, status: "cancelled", refunded_amount: 900_000, host_reversed_amount: 900_000 })).toBe(100_000);
  });

  it("a refund not yet taken back already counts", () => {
    expect(hostNetAmount({ ...paid, status: "cancelled", refunded_amount: TOTAL, host_reversed_amount: 0 })).toBe(0);
    expect(hostNetAmount({ ...paid, refunded_amount: 200_000, host_reversed_amount: 0 })).toBe(800_000);
  });

  it("older rows without host_amount: total minus fee", () => {
    expect(hostNetAmount({ ...paid, host_amount: null })).toBe(HOST);
  });

  it("cancelled without a card payment, or not paid: 0", () => {
    expect(hostNetAmount({ ...paid, status: "cancelled", stripe_payment_intent_id: null })).toBe(0);
    expect(hostNetAmount({ ...paid, status: "payment_pending" })).toBe(0);
  });

  it("a confirmed stay entered by hand counts in full", () => {
    expect(hostNetAmount({ ...paid, stripe_payment_intent_id: null })).toBe(HOST);
  });
});

describe("planHostReconciliation: a refund after payout becomes a host charge", () => {
  it("paid out: nothing is reversed, the whole reduction is charged to the host's next payout", () => {
    const plan = planHostReconciliation(HOST, 900_000, fresh, { sharePaidOut: true });
    expect(plan).toMatchObject({ reverseNow: 0, chargeNow: 900_000, remainingShare: 100_000, hostHoldsAfter: HOST });
  });

  it("a host charge already recorded for it is not charged again", () => {
    const plan = planHostReconciliation(HOST, 900_000, fresh, { sharePaidOut: true, alreadyCharged: 900_000 });
    expect(plan).toMatchObject({ reverseNow: 0, chargeNow: 0, overReduced: 0, remainingShare: 100_000 });
  });

  it("a second refund after payout charges only the difference", () => {
    const plan = planHostReconciliation(HOST, TOTAL, fresh, { sharePaidOut: true, alreadyCharged: 500_000 });
    expect(plan.chargeNow).toBe(500_000);
    expect(plan.remainingShare).toBe(0);
  });

  it("held but partly paid out by our job: reverse what is still there, charge the rest", () => {
    // 6 000 of the 10 000 was paid out (the balance was short on the due date)
    const plan = planHostReconciliation(HOST, 500_000, fresh, { paidOutSoFar: 600_000 });
    expect(plan.reverseNow).toBe(400_000);
    expect(plan.chargeNow).toBe(100_000);
    expect(plan.remainingShare).toBe(500_000);
  });

  it("a transfer already used to settle a host charge: the part it can't cover is charged", () => {
    // 166,80 of this booking's transfer settled a card fee, then everything is refunded
    const t = { ...fresh, transferReversed: 16_680, chargeSettled: 16_680 };
    const plan = planHostReconciliation(HOST, TOTAL, t);
    expect(plan.reverseNow).toBe(HOST - 16_680);
    expect(plan.chargeNow).toBe(16_680);
    expect(plan.hostHoldsAfter).toBe(0);
  });

  it("a reversal made by hand after a host charge counts as over-reduced", () => {
    const plan = planHostReconciliation(HOST, 900_000, { ...fresh, transferReversed: 900_000 }, { sharePaidOut: true, alreadyCharged: 900_000 });
    expect(plan.chargeNow).toBe(0);
    expect(plan.overReduced).toBe(900_000);
  });
});

describe("pendingHostReduction: what the database says is still to take from the host", () => {
  const row = { host_amount: HOST, total_amount: TOTAL, service_fee: FEE };

  it("refunded but not (fully) taken back", () => {
    expect(pendingHostReduction({ ...row, refunded_amount: 900_000, host_reversed_amount: 0 })).toBe(900_000);
    expect(pendingHostReduction({ ...row, refunded_amount: TOTAL, host_reversed_amount: 400_000 })).toBe(600_000);
  });

  it("nothing once reversed or charged (host_reversed_amount counts both)", () => {
    expect(pendingHostReduction({ ...row, refunded_amount: 900_000, host_reversed_amount: 900_000 })).toBe(0);
    expect(pendingHostReduction({ ...row, refunded_amount: 0, host_reversed_amount: 0 })).toBe(0);
  });
});

describe("heldBalanceShortfall: the payout job's safety stop", () => {
  it("a balance that covers every held booking: no stop", () => {
    expect(heldBalanceShortfall([1_000_000, 500_000], 1_200_000, 300_000)).toBe(0);
    expect(heldBalanceShortfall([1_000_000], 2_000_000, 0)).toBe(0);
  });

  it("less than the held bookings hold: the shortfall", () => {
    // e.g. Stripe paid 1 000 000 out on its own
    expect(heldBalanceShortfall([1_000_000, 500_000], 500_000, 0)).toBe(1_000_000);
  });

  it("a negative balance counts", () => {
    expect(heldBalanceShortfall([500_000], -100_000, 200_000)).toBe(400_000);
  });

  it("a booking our payouts already covered holds nothing more", () => {
    expect(heldBalanceShortfall([-200_000, 300_000], 300_000, 0)).toBe(0);
  });
});

// The payout job's arithmetic for one held booking (release-host-payouts):
// what its transfer still owes the host, what may be paid now, and how much of
// its own refund-after-payout charge comes back out of it
function releasePlan(o: {
  refunded: number;
  /** Refund reversals on the transfer */
  reversed?: number;
  /** This booking's own refund-after-payout charges still open */
  ownOpen?: number;
  /** Host-charge settlements already reversed from this transfer (own and other) */
  chargeSettled?: number;
  /** Our live payouts for it */
  paid?: number;
}) {
  const reversed = o.reversed ?? 0;
  let chargeSettled = o.chargeSettled ?? 0;
  let ownOpen = o.ownOpen ?? 0;
  const t = { ...fresh, transferReversed: reversed + chargeSettled, chargeSettled };
  let holds = hostHoldsFromTransfer(t);
  const transferLeft = t.transferAmount - t.transferReversed;
  const paid = o.paid ?? 0;
  const target = () => bookingPayoutTarget(HOST, shareTakenBack(t), ownOpen, chargeSettled);
  const ownTaken = ownRecoveryFromTransfer(ownOpen, holds, paid, target(), transferLeft);
  ownOpen -= ownTaken;
  chargeSettled += ownTaken;
  holds -= ownTaken;
  return { ownTaken, pay: Math.max(0, payableNow(holds, target(), paid)), holdsLeft: holds - paid - Math.max(0, payableNow(holds, target(), paid)) };
}

describe("payout job: a booking's own refund after payout is never deducted twice", () => {
  it("a normal booking: the whole share, then nothing once paid", () => {
    expect(releasePlan({ refunded: 0 })).toEqual({ ownTaken: 0, pay: HOST, holdsLeft: 0 });
    expect(releasePlan({ refunded: 0, paid: HOST })).toEqual({ ownTaken: 0, pay: 0, holdsLeft: 0 });
  });

  it("paid out, refunded 9 000 (a 9 000 host charge), then the payout failed: 9 000 back from its transfer, 1 000 paid", () => {
    expect(releasePlan({ refunded: 900_000, ownOpen: 900_000 })).toEqual({ ownTaken: 900_000, pay: 100_000, holdsLeft: 0 });
  });

  it("the same while the share is still at the bank: nothing taken from the transfer, nothing paid", () => {
    expect(releasePlan({ refunded: 900_000, ownOpen: 900_000, paid: HOST })).toEqual({ ownTaken: 0, pay: 0, holdsLeft: 0 });
  });

  it("3 000 of the charge already settled from another booking: the other 6 000 back, 4 000 paid", () => {
    expect(releasePlan({ refunded: 900_000, ownOpen: 600_000 })).toEqual({ ownTaken: 600_000, pay: 400_000, holdsLeft: 0 });
  });

  it("the whole charge settled from other bookings: the returned 10 000 is the host's", () => {
    expect(releasePlan({ refunded: 900_000, ownOpen: 0 })).toEqual({ ownTaken: 0, pay: HOST, holdsLeft: 0 });
  });

  it("host cancelled after payout (10 000 charged), then the payout failed: all 10 000 back, nothing paid", () => {
    expect(releasePlan({ refunded: TOTAL, ownOpen: HOST })).toEqual({ ownTaken: HOST, pay: 0, holdsLeft: 0 });
  });

  it("6 000 paid, a 5 000 refund (4 000 reversed, 1 000 charged), then the 6 000 payout failed: 1 000 back, 5 000 paid", () => {
    expect(releasePlan({ refunded: 500_000, reversed: 400_000, ownOpen: 100_000 })).toEqual({ ownTaken: 100_000, pay: 500_000, holdsLeft: 0 });
    // while the 6 000 is still at the bank: nothing to take or pay
    expect(releasePlan({ refunded: 500_000, reversed: 400_000, ownOpen: 100_000, paid: 600_000 })).toEqual({ ownTaken: 0, pay: 0, holdsLeft: 0 });
  });

  it("another booking's 9 000 charge settled from this transfer lowers what is paid", () => {
    expect(bookingPayoutTarget(HOST, 0, 0, 900_000)).toBe(100_000);
    expect(payableNow(100_000, 100_000, 0)).toBe(100_000);
    // and an own charge settled from this transfer does not lower it again
    expect(bookingPayoutTarget(HOST, 0, 0, 900_000)).toBe(bookingPayoutTarget(HOST, 0, 900_000, 0));
  });

  it("never pays more than the host holds, and an over-reduction pays nothing", () => {
    expect(payableNow(300_000, HOST, 0)).toBe(300_000);
    expect(payableNow(-100_000, bookingPayoutTarget(HOST, TOTAL, 0, 0), 0)).toBe(0);
  });

  it("tells a booking's own refund-after-payout charge from card fees and other bookings' charges", () => {
    expect(isOwnRefundRecovery({ booking_id: "b1", reason: "Refund after payout for booking B1 (Cabin)" }, "b1")).toBe(true);
    expect(isOwnRefundRecovery({ booking_id: "b2", reason: "Refund after payout for booking B2 (Cabin)" }, "b1")).toBe(false);
    expect(isOwnRefundRecovery({ booking_id: "b1", reason: "Card fee: booking cancelled by the host" }, "b1")).toBe(false);
    expect(isOwnRefundRecovery({ booking_id: null, reason: "Refund after payout for booking X" }, "b1")).toBe(false);
  });
});

describe("stableUuid: one id per text, so a host charge is recorded once", () => {
  it("is a uuid and the same for the same text", async () => {
    const a = await stableUuid("refund-recovery:b1:900000");
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await stableUuid("refund-recovery:b1:900000")).toBe(a);
  });

  it("differs for another target", async () => {
    expect(await stableUuid("refund-recovery:b1:1000000")).not.toBe(await stableUuid("refund-recovery:b1:900000"));
  });
});
