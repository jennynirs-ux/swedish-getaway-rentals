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

/** A listing's extra-guest fee (properties_pricing_rules, rule_type extra_guest) */
export interface ExtraGuestRule {
  /** Öre per extra guest, per night or per stay */
  price: number;
  is_per_night: boolean;
  /** Guests the nightly price covers; rules saved before this setting existed covered 1 */
  guests_included?: number | null;
}

/** Guests beyond those the nightly price covers */
export const extraGuestCount = (guests: number, guestsIncluded?: number | null) =>
  Math.max(0, guests - Math.max(1, guestsIncluded ?? 1));

/** What one extra-guest rule adds to a stay, in öre */
export const extraGuestFee = (rule: ExtraGuestRule, guests: number, nights: number) =>
  extraGuestCount(guests, rule.guests_included) * rule.price * (rule.is_per_night ? nights : 1);

/** A listing's extra (properties_pricing_rules, rule_type extra_service) */
export interface ExtraServiceRule {
  /** Öre per unit */
  price: number;
  is_per_night: boolean;
  /** Charged for every guest */
  per_guest?: boolean | null;
  /** Part of the price: shown to guests, never charged */
  included?: boolean | null;
}

/** At most this many extras per booking (their ids travel in Stripe metadata, 500 characters) */
export const MAX_EXTRAS_PER_BOOKING = 8;

/** What an extra the guest added costs for the stay, in öre (0 for an included one) */
export const extraServiceFee = (rule: ExtraServiceRule, guests: number, nights: number) =>
  rule.included ? 0 : rule.price * (rule.per_guest ? guests : 1) * (rule.is_per_night ? nights : 1);

/** "per stay", "per night", "per guest" or "per guest per night" */
export const extraServiceUnit = (rule: Pick<ExtraServiceRule, "is_per_night" | "per_guest">) =>
  rule.per_guest ? (rule.is_per_night ? "per guest per night" : "per guest") : rule.is_per_night ? "per night" : "per stay";
