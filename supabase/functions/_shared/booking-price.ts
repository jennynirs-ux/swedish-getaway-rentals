// Price helpers shared by the booking form, the admin price preview and
// create-booking-payment-connect, so the price a guest sees is the price
// they are charged. Amounts are in öre.

/** Round to whole kronor, so guests never see öre in a price */
export const roundToKronor = (ore: number) => Math.round(ore / 100) * 100;

export interface StayDiscount {
  type: "weekly" | "monthly";
  percentage: number;
}

export function applicableStayDiscount(nights: number, weeklyPct: number, monthlyPct: number): StayDiscount | null {
  if (nights >= 28 && monthlyPct > 0) return { type: "monthly", percentage: monthlyPct };
  if (nights >= 7 && weeklyPct > 0) return { type: "weekly", percentage: weeklyPct };
  return null;
}

/**
 * Weekly/monthly discount on the accommodation total (the sum of the nightly
 * prices) only, not on cleaning or extra-guest fees: those cover laundry and
 * cleaning per stay and per guest. Airbnb does it the same way.
 */
export function stayDiscountAmount(accommodationTotal: number, discount: StayDiscount | null): number {
  return discount ? roundToKronor(accommodationTotal * (discount.percentage / 100)) : 0;
}

/** Fee model A: the guest pays the platform service fee on top of the host's price */
export const serviceFeeAmount = (hostTotal: number, ratePct: number) => roundToKronor(hostTotal * (ratePct / 100));
