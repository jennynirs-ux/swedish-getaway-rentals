import { describe, expect, it } from "vitest";
import {
  chargesTakenFrom,
  formatSek,
  hostPayoutText,
  nextPayoutId,
  payoutState,
  payoutStatusPollMs,
  publishBlocker,
  stripeRequirementLabels,
} from "./hostDashboard";

describe("payoutState: where the host is with Stripe", () => {
  it("has no account, or a ready one", () => {
    expect(payoutState(null)).toBe("none");
    expect(payoutState({ hasAccount: false, ready: false })).toBe("none");
    expect(payoutState({ hasAccount: true, ready: true, detailsSubmitted: true })).toBe("ready");
  });

  it("tells missing details apart from Stripe still checking", () => {
    expect(payoutState({ hasAccount: true, ready: false, detailsSubmitted: false })).toBe("details_missing");
    expect(payoutState({ hasAccount: true, ready: false, detailsSubmitted: true, requirementsDue: 2 })).toBe("details_missing");
    expect(payoutState({ hasAccount: true, ready: false, detailsSubmitted: true, requirementsDue: 0 })).toBe("verifying");
    expect(
      payoutState({ hasAccount: true, ready: false, detailsSubmitted: true, disabledReason: "requirements.past_due" }),
    ).toBe("details_missing");
    expect(
      payoutState({ hasAccount: true, ready: false, detailsSubmitted: true, disabledReason: "requirements.pending_verification" }),
    ).toBe("verifying");
  });

  it("sends a rejected or paused account to support instead of 'verifying' forever", () => {
    for (const reason of ["rejected.fraud", "rejected.other", "listed", "platform_paused", "other"]) {
      expect(payoutState({ hasAccount: true, ready: false, detailsSubmitted: true, disabledReason: reason })).toBe(
        "action_needed",
      );
    }
  });

  it("asks Stripe again only while Stripe is checking", () => {
    expect(payoutStatusPollMs({ hasAccount: true, ready: false, detailsSubmitted: true })).toBe(30_000);
    expect(payoutStatusPollMs({ hasAccount: true, ready: false, detailsSubmitted: false })).toBe(false);
    expect(payoutStatusPollMs({ hasAccount: true, ready: false, detailsSubmitted: true, disabledReason: "rejected.fraud" })).toBe(
      false,
    );
    expect(payoutStatusPollMs({ hasAccount: true, ready: true })).toBe(false);
    expect(payoutStatusPollMs(undefined)).toBe(false);
  });
});

describe("publishBlocker: the database's publish check messages", () => {
  it.each([
    ["Accept the host terms before publishing", "terms"],
    ["Connect your bank account before publishing, so you can be paid for bookings", "bank"],
    ["Pin your place on the map and choose its county before publishing", "location"],
    ["permission denied for table properties", null],
  ])("%s", (message, expected) => {
    expect(publishBlocker(message)).toBe(expected);
  });
});

describe("hostPayoutText: where the host's money is, in plain words", () => {
  const today = "2026-10-21";
  const booking = { status: "confirmed", host_payout_due_on: "2026-10-25" };

  it("held: paid out the day after check-in", () => {
    expect(hostPayoutText({ ...booking, host_payout_status: "held" }, 1_000_000, today)).toBe(
      "Your price is paid out to your bank on 25 Oct 2026",
    );
    expect(hostPayoutText({ ...booking, host_payout_status: "held", host_payout_due_on: "2026-10-20" }, 1_000_000, today)).toBe(
      "Your price is on its way to your bank (due 20 Oct 2026)",
    );
    expect(
      hostPayoutText({ ...booking, status: "cancelled", host_payout_status: "held" }, 500_000, today),
    ).toBe("What you keep is paid out to your bank on 25 Oct 2026");
    expect(hostPayoutText({ ...booking, host_payout_status: "held" }, 0, today)).toBe("Nothing to pay out for this booking");
  });

  it("paid_out: paid by the daily payout job, with the date when known", () => {
    expect(hostPayoutText({ ...booking, host_payout_status: "paid_out", paidOutOn: "2026-10-26" }, 1_000_000, today)).toBe(
      "Paid out to your bank on 26 Oct 2026",
    );
    expect(hostPayoutText({ ...booking, host_payout_status: "paid_out" }, 1_000_000, today)).toBe("Paid out to your bank");
  });

  it("reversed: everything went back to the guest", () => {
    expect(hostPayoutText({ ...booking, status: "cancelled", host_payout_status: "reversed" }, 0, today)).toBe(
      "Nothing to pay out: your share went back to the guest with the refund",
    );
  });

  it("manual and older bookings: our team", () => {
    expect(hostPayoutText({ ...booking, host_payout_status: "manual" }, 1_000_000, today)).toBe(
      "Our team pays this one to you directly by bank transfer",
    );
    expect(hostPayoutText({ ...booking, status: "cancelled", host_payout_status: "manual" }, 0, today)).toBe(
      "Our team will settle this payout with you directly",
    );
    expect(hostPayoutText({ ...booking, host_payout_status: "platform" }, 1_000_000, today)).toMatch(/^Settled by our team/);
    expect(hostPayoutText({ ...booking, host_payout_status: null }, 1_000_000, today)).toBeNull();
  });
});

describe("open host charges (e.g. the card fee when the host cancelled)", () => {
  const charges = [
    { id: "b", amount: 40_000, created_at: "2026-10-02T10:00:00Z" },
    { id: "a", amount: 31_200, created_at: "2026-10-01T10:00:00Z" },
  ];

  it("come off a payout oldest first, the last one in part, like the payout job", () => {
    expect(chargesTakenFrom(charges, 1_000_000).map((c) => [c.id, c.taken])).toEqual([
      ["a", 31_200],
      ["b", 40_000],
    ]);
    // The oldest is larger than the payout: the whole payout goes to it, the rest of it waits
    expect(chargesTakenFrom([{ id: "x", amount: 50_000, created_at: "2026-10-01" }, ...charges], 45_000).map((c) => [c.id, c.taken])).toEqual([
      ["x", 45_000],
    ]);
    // A 9 000 refund after payout and a 5 000 payout: all 5 000 is taken
    expect(chargesTakenFrom([{ id: "r", amount: 900_000, created_at: "2026-10-01" }], 500_000).map((c) => [c.id, c.taken])).toEqual([
      ["r", 500_000],
    ]);
    expect(chargesTakenFrom(charges, 40_000).map((c) => [c.id, c.taken])).toEqual([
      ["a", 31_200],
      ["b", 8_800],
    ]);
    expect(chargesTakenFrom(charges, 0)).toEqual([]);
  });

  it("leave the booking's own refund after payout out of its payout (its share already excludes it)", () => {
    const own = { id: "own", amount: 900_000, created_at: "2026-09-01", booking_id: "A", reason: "Refund after payout for booking A1B2C3D4 (Cabin)" };
    const fee = { id: "fee", amount: 16_680, created_at: "2026-09-02", booking_id: "A", reason: "Card fee: booking cancelled by the host" };
    expect(chargesTakenFrom([own, fee], 100_000, "A").map((c) => [c.id, c.taken])).toEqual([["fee", 16_680]]);
    // Another booking's payout takes it like any other charge
    expect(chargesTakenFrom([own, fee], 100_000, "B").map((c) => [c.id, c.taken])).toEqual([["own", 100_000]]);
  });

  it("are shown on the held booking paid out next", () => {
    const bookings = [
      { id: "later", status: "confirmed", host_payout_status: "held", host_payout_due_on: "2026-11-02" },
      { id: "paid", status: "confirmed", host_payout_status: "paid_out", host_payout_due_on: "2026-10-01" },
      { id: "empty", status: "cancelled", host_payout_status: "held", host_payout_due_on: "2026-10-20" },
      { id: "next", status: "confirmed", host_payout_status: "held", host_payout_due_on: "2026-10-25" },
    ];
    const net = (b: { id: string }) => (b.id === "empty" ? 0 : 1_000_000);
    expect(nextPayoutId(bookings, net)).toBe("next");
    expect(nextPayoutId([], net)).toBeNull();
  });
});

describe("formatSek", () => {
  it("shows öre as whole kronor", () => {
    expect(formatSek(1_000_000).replace(/\s/g, " ")).toBe("10 000 SEK");
    expect(formatSek(31_249)).toBe("312 SEK");
  });
});

describe("stripeRequirementLabels", () => {
  it("turns Stripe's field names into a short list, once each", () => {
    expect(
      stripeRequirementLabels([
        "individual.dob.day",
        "individual.dob.month",
        "individual.dob.year",
        "external_account",
        "individual.verification.document",
        "tos_acceptance.date",
        "tos_acceptance.ip",
      ]),
    ).toEqual([
      "Your date of birth",
      "Your bank account",
      "A photo of your ID (passport, ID card or driving licence)",
      "Accepting Stripe's terms",
    ]);
  });

  it("groups unknown fields into one line at the end", () => {
    expect(stripeRequirementLabels(["something.new", "external_account", "another.new"])).toEqual([
      "Your bank account",
      "A few more details Stripe asks for",
    ]);
    expect(stripeRequirementLabels([])).toEqual([]);
    expect(stripeRequirementLabels()).toEqual([]);
  });
});
