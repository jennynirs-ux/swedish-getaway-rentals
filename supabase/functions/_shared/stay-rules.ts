// House rules enforced when a stay is booked on the site (Airbnb, Booking etc.
// have their own settings). Each listing's host sets them (properties:
// min_nights, holiday_min_nights, pets_allowed, smoking_allowed,
// events_allowed, min_guest_age). The site imports this file through
// src/lib/stayRules.ts, so the booking form and the payment function agree.

export interface StayRules {
  min_nights?: number | null;
  /** Longer minimum for stays over Valborg, Midsummer Eve and New Year's Eve */
  holiday_min_nights?: number | null;
  pets_allowed?: boolean | null;
  smoking_allowed?: boolean | null;
  events_allowed?: boolean | null;
  /** Of the person booking, who must also stay at the place */
  min_guest_age?: number | null;
}

/** New listings start with these (the database defaults) */
export const DEFAULT_STAY_RULES = {
  min_nights: 1,
  holiday_min_nights: null,
  pets_allowed: false,
  smoking_allowed: false,
  events_allowed: false,
  min_guest_age: 18,
} as const;

/** Whatever a host sets, the person booking is an adult */
export const ADULT_AGE = 18;

export const minNights = (rules: StayRules) => Math.max(1, rules.min_nights ?? 1);
export const minGuestAge = (rules: StayRules) => Math.max(ADULT_AGE, rules.min_guest_age ?? ADULT_AGE);
const holidayMinNights = (rules: StayRules) =>
  rules.holiday_min_nights && rules.holiday_min_nights > minNights(rules) ? rules.holiday_min_nights : null;

// Nights most often wanted for parties: Valborg (30 April), Midsummer Eve
// (the Friday between 19 and 25 June) and New Year's Eve
export function isPartyNight(date: string): boolean {
  const [year, month, day] = date.split("-").map(Number);
  if (month === 4 && day === 30) return true;
  if (month === 12 && day === 31) return true;
  if (month === 6 && day >= 19 && day <= 25) {
    return new Date(Date.UTC(year, 5, day)).getUTCDay() === 5;
  }
  return false;
}

// Dates are "YYYY-MM-DD"; a night is named by the date it starts
export function stayNights(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const d = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (d < end) {
    nights.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return nights;
}

export function stayRuleError(checkIn: string, checkOut: string, rules: StayRules): string | null {
  const nights = stayNights(checkIn, checkOut);
  const min = minNights(rules);
  if (nights.length < min) {
    return `The minimum stay is ${min} night${min !== 1 ? "s" : ""}.`;
  }
  const holidayMin = holidayMinNights(rules);
  if (holidayMin && nights.length < holidayMin && nights.some(isPartyNight)) {
    return `Stays over Valborg, Midsummer and New Year's Eve are at least ${holidayMin} nights.`;
  }
  return null;
}

/** The listing's rules as short lines for guests: "Minimum stay 2 nights (3 over Valborg, …)", "No pets", … */
export function houseRuleLines(rules: StayRules): string[] {
  const min = minNights(rules);
  const holidayMin = holidayMinNights(rules);
  return [
    `Minimum stay ${min} night${min !== 1 ? "s" : ""}${holidayMin ? ` (${holidayMin} over Valborg, Midsummer and New Year's Eve)` : ""}`,
    rules.pets_allowed ? "Pets allowed" : "No pets",
    rules.smoking_allowed ? "Smoking allowed" : "No smoking",
    rules.events_allowed ? "Parties and events allowed" : "No parties or events",
    `The person booking is at least ${minGuestAge(rules)} and stays at the place`,
  ];
}
