// Weekly/monthly stay discount. It is taken off the nightly price only, not
// off cleaning or extra-guest fees (those cover laundry and cleaning per stay
// and per guest), the same way Airbnb does it. Used by the booking form, the
// admin price preview and create-booking-payment-connect, so the price a
// guest sees is the price they are charged.

export interface StayDiscount {
  type: "weekly" | "monthly";
  percentage: number;
}

export function applicableStayDiscount(nights: number, weeklyPct: number, monthlyPct: number): StayDiscount | null {
  if (nights >= 28 && monthlyPct > 0) return { type: "monthly", percentage: monthlyPct };
  if (nights >= 7 && weeklyPct > 0) return { type: "weekly", percentage: weeklyPct };
  return null;
}

/** Discount (in öre) on the accommodation total, i.e. the sum of the nightly prices */
export function stayDiscountAmount(accommodationTotal: number, discount: StayDiscount | null): number {
  return discount ? Math.round(accommodationTotal * (discount.percentage / 100)) : 0;
}
