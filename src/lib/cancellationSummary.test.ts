import { describe, expect, it } from "vitest";
import { summarizeCancellation } from "@/lib/cancellationSummary";

// Same tiers as platform_settings.cancellation_policy
const tiers = [
  { label: "More than 21 days before arrival", min_days: 22, refund_percentage: 90 },
  { label: "21–8 days before arrival", min_days: 8, max_days: 21, refund_percentage: 50 },
  { label: "7 days or less before arrival", min_days: 0, max_days: 7, refund_percentage: 0 },
];

describe("summarizeCancellation", () => {
  it("reads the two refund steps from the tiers", () => {
    expect(summarizeCancellation(tiers)).toEqual({ fullPct: 90, fullDays: 21, partPct: 50, partDays: 8 });
  });

  it("does not depend on the order the tiers are stored in", () => {
    expect(summarizeCancellation([...tiers].reverse())).toEqual({ fullPct: 90, fullDays: 21, partPct: 50, partDays: 8 });
  });

  it("falls back to 90/21/50/8 until the setting has loaded", () => {
    const fallback = { fullPct: 90, fullDays: 21, partPct: 50, partDays: 8 };
    expect(summarizeCancellation(undefined)).toEqual(fallback);
    expect(summarizeCancellation([])).toEqual(fallback);
  });

  it("has no second step when only one tier refunds", () => {
    const oneStep = [
      { label: "More than 14 days before arrival", min_days: 15, refund_percentage: 100 },
      { label: "14 days or less before arrival", min_days: 0, max_days: 14, refund_percentage: 0 },
    ];
    expect(summarizeCancellation(oneStep)).toEqual({ fullPct: 100, fullDays: 14, partPct: null, partDays: null });
  });
});
