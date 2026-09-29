import { describe, expect, it } from "vitest";
// The rules the cancel-booking edge function applies
import {
  daysBeforeArrival,
  policySummary,
  refundPercentage,
  type CancellationPolicy,
} from "../../supabase/functions/_shared/cancellation";

// Same tiers as platform_settings.cancellation_policy
const policy: CancellationPolicy = {
  tiers: [
    { label: "More than 21 days before arrival", min_days: 22, refund_percentage: 90 },
    { label: "21–8 days before arrival", min_days: 8, max_days: 21, refund_percentage: 50 },
    { label: "7 days or less before arrival", min_days: 0, max_days: 7, refund_percentage: 0 },
  ],
};

describe("cancellation policy 90/50/0", () => {
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
