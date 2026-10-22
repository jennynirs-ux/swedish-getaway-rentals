import { describe, expect, it } from "vitest";
// The rules the cancel-booking edge function applies
import {
  CANCELLATION_POLICIES,
  daysBeforeArrival,
  policyFor,
  policySummary,
  POLICY_KEYS,
  refundPercentage,
} from "../../supabase/functions/_shared/cancellation";

// The owners' cabins, and every booking made before hosts chose a policy
const policy = CANCELLATION_POLICIES.standard;

describe("cancellation policy Standard (90/50/0)", () => {
  it.each([
    [30, 90],
    [22, 90],
    [21, 50],
    [8, 50],
    [7, 0],
    [0, 0],
  ])("%i days before arrival refunds %i%%", (days, pct) => {
    expect(refundPercentage(policy, days)).toBe(pct);
  });

  it("counts whole days from the Swedish date", () => {
    expect(daysBeforeArrival("2026-10-30", "2026-10-08")).toBe(22);
    expect(daysBeforeArrival("2026-10-30", "2026-10-29")).toBe(1);
  });

  it("describes the policy for e-mails", () => {
    expect(policySummary(policy)).toBe(
      "90% refund more than 21 days before arrival; 50% refund 21–8 days before arrival; no refund 7 days or less before arrival",
    );
  });
});

describe("the other policies", () => {
  it.each([
    ["flexible", 30, 100],
    ["flexible", 1, 100],
    ["flexible", 0, 0],
    ["moderate", 5, 100],
    ["moderate", 4, 50],
    ["moderate", 1, 50],
    ["moderate", 0, 0],
    ["strict", 60, 50],
    ["strict", 14, 50],
    ["strict", 13, 0],
  ] as const)("%s, %i days before arrival: %i%%", (key, days, pct) => {
    expect(refundPercentage(CANCELLATION_POLICIES[key], days)).toBe(pct);
  });

  it("covers every day from arrival onwards, with no gaps or overlaps", () => {
    for (const key of POLICY_KEYS) {
      for (let days = 0; days <= 400; days++) {
        const matching = CANCELLATION_POLICIES[key].tiers.filter(
          (t) => days >= t.min_days && (t.max_days === undefined || days <= t.max_days),
        );
        expect(matching, `${key} ${days}`).toHaveLength(1);
      }
    }
  });

  it("falls back to Standard for a missing or unknown key", () => {
    expect(policyFor(null).key).toBe("standard");
    expect(policyFor("lenient").key).toBe("standard");
    expect(policyFor("strict").key).toBe("strict");
  });
});
