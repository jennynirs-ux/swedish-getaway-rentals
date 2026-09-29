// House rules enforced when a stay is booked on the site (Airbnb, Booking etc.
// have their own settings). Mirrored in src/lib/stayRules.ts - keep in sync.

export const MIN_NIGHTS = 2;
export const PARTY_NIGHT_MIN_NIGHTS = 3;
export const MIN_LEAD_GUEST_AGE = 25;

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

export function stayRuleError(checkIn: string, checkOut: string): string | null {
  const nights = stayNights(checkIn, checkOut);
  if (nights.length < MIN_NIGHTS) {
    return `The minimum stay is ${MIN_NIGHTS} nights.`;
  }
  if (nights.length < PARTY_NIGHT_MIN_NIGHTS && nights.some(isPartyNight)) {
    return `Stays over Valborg, Midsummer and New Year's Eve are at least ${PARTY_NIGHT_MIN_NIGHTS} nights.`;
  }
  return null;
}
