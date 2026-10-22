import { describe, expect, it } from "vitest";
import {
  applicableStayDiscount,
  extraGuestCount,
  extraGuestFee,
  extraServiceFee,
  extraServiceUnit,
  serviceFeeAmount,
  stayDiscountAmount,
} from "../../supabase/functions/_shared/booking-price";

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

describe("extra guests", () => {
  it("counts the guests beyond those the price covers", () => {
    expect(extraGuestCount(4, 2)).toBe(2);
    expect(extraGuestCount(2, 4)).toBe(0);
    // Rules saved before guests_included existed: the price covered 1 guest
    expect(extraGuestCount(3, null)).toBe(2);
    expect(extraGuestCount(3, undefined)).toBe(2);
    expect(extraGuestCount(3, 0)).toBe(2);
  });

  it("charges per extra guest per night, or once per stay", () => {
    expect(extraGuestFee({ price: 40_000, is_per_night: true, guests_included: 2 }, 4, 3)).toBe(240_000);
    expect(extraGuestFee({ price: 40_000, is_per_night: false, guests_included: 2 }, 4, 3)).toBe(80_000);
    expect(extraGuestFee({ price: 75_000, is_per_night: true }, 1, 3)).toBe(0);
    expect(extraGuestFee({ price: 75_000, is_per_night: true }, 8, 2)).toBe(1_050_000);
  });
});

describe("extras", () => {
  it("charges per stay, night, guest or guest and night; nothing when included", () => {
    expect(extraServiceFee({ price: 40_000, is_per_night: false }, 4, 3)).toBe(40_000);
    expect(extraServiceFee({ price: 40_000, is_per_night: true }, 4, 3)).toBe(120_000);
    expect(extraServiceFee({ price: 20_000, is_per_night: false, per_guest: true }, 4, 3)).toBe(80_000);
    expect(extraServiceFee({ price: 5_000, is_per_night: true, per_guest: true }, 4, 3)).toBe(60_000);
    expect(extraServiceFee({ price: 20_000, is_per_night: false, included: true }, 4, 3)).toBe(0);
  });

  it("names the unit", () => {
    expect(extraServiceUnit({ is_per_night: false })).toBe("per stay");
    expect(extraServiceUnit({ is_per_night: true })).toBe("per night");
    expect(extraServiceUnit({ is_per_night: false, per_guest: true })).toBe("per guest");
    expect(extraServiceUnit({ is_per_night: true, per_guest: true })).toBe("per guest per night");
  });
});
