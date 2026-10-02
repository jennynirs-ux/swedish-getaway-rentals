import { describe, expect, it } from "vitest";
import { applicableStayDiscount, serviceFeeAmount, stayDiscountAmount } from "../../supabase/functions/_shared/booking-price";

describe("applicableStayDiscount", () => {
  it.each([
    [6, 28, 0, null],
    [7, 28, 0, { type: "weekly", percentage: 28 }],
    [27, 28, 40, { type: "weekly", percentage: 28 }],
    [28, 28, 40, { type: "monthly", percentage: 40 }],
    // No monthly discount set: the weekly one still applies to long stays
    [30, 28, 0, { type: "weekly", percentage: 28 }],
    [10, 0, 0, null],
  ])("%i nights, weekly %i %%, monthly %i %%", (nights, weekly, monthly, expected) => {
    expect(applicableStayDiscount(nights, weekly, monthly)).toEqual(expected);
  });
});

describe("stayDiscountAmount", () => {
  it("takes the discount off the nightly price only", () => {
    // Villa Häcken, 7 nights × 8 000 SEK (in öre); guest and cleaning fees are not passed in
    expect(stayDiscountAmount(7 * 800000, { type: "weekly", percentage: 28 })).toBe(1568000);
  });

  it("is zero without a discount", () => {
    expect(stayDiscountAmount(500000, null)).toBe(0);
  });
});

describe("serviceFeeAmount", () => {
  it("rounds to whole kronor", () => {
    // Lakehouse Getaway, a week for 2: 13 149 SEK host price -> 1 315 SEK fee, total 14 464 SEK
    expect(serviceFeeAmount(1314900, 10)).toBe(131500);
  });
});
