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

/** The guest site's languages (the same as ContentLang in listing-text.ts) */
type Lang = "en" | "sv" | "de";

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

// What guests read, in the page's language. English is also what the payment
// function answers and the e-mails say.
const RULE_TEXT = {
  en: {
    minStayError: (min: number) => `The minimum stay is ${min} night${min !== 1 ? "s" : ""}.`,
    holidayError: (min: number) => `Stays over Valborg, Midsummer and New Year's Eve are at least ${min} nights.`,
    minStay: (min: number, holidayMin: number | null) =>
      `Minimum stay ${min} night${min !== 1 ? "s" : ""}${holidayMin ? ` (${holidayMin} over Valborg, Midsummer and New Year's Eve)` : ""}`,
    pets: (allowed: boolean) => (allowed ? "Pets allowed" : "No pets"),
    smoking: (allowed: boolean) => (allowed ? "Smoking allowed" : "No smoking"),
    events: (allowed: boolean) => (allowed ? "Parties and events allowed" : "No parties or events"),
    age: (age: number) => `The person booking is at least ${age} and stays at the place`,
  },
  sv: {
    minStayError: (min: number) => `Minsta vistelse är ${min} ${min !== 1 ? "nätter" : "natt"}.`,
    holidayError: (min: number) => `Över valborg, midsommar och nyårsafton är minsta vistelse ${min} nätter.`,
    minStay: (min: number, holidayMin: number | null) =>
      `Minsta vistelse ${min} ${min !== 1 ? "nätter" : "natt"}${holidayMin ? ` (${holidayMin} över valborg, midsommar och nyårsafton)` : ""}`,
    pets: (allowed: boolean) => (allowed ? "Husdjur tillåtna" : "Inga husdjur"),
    smoking: (allowed: boolean) => (allowed ? "Rökning tillåten" : "Ingen rökning"),
    events: (allowed: boolean) => (allowed ? "Fester och evenemang tillåtna" : "Inga fester eller evenemang"),
    age: (age: number) => `Den som bokar är minst ${age} år och bor själv på boendet`,
  },
  de: {
    minStayError: (min: number) => `Der Mindestaufenthalt beträgt ${min} ${min !== 1 ? "Nächte" : "Nacht"}.`,
    holidayError: (min: number) => `Über Walpurgisnacht, Mittsommer und Silvester beträgt der Mindestaufenthalt ${min} Nächte.`,
    minStay: (min: number, holidayMin: number | null) =>
      `Mindestaufenthalt ${min} ${min !== 1 ? "Nächte" : "Nacht"}${holidayMin ? ` (${holidayMin} über Walpurgisnacht, Mittsommer und Silvester)` : ""}`,
    pets: (allowed: boolean) => (allowed ? "Haustiere erlaubt" : "Keine Haustiere"),
    smoking: (allowed: boolean) => (allowed ? "Rauchen erlaubt" : "Rauchen nicht erlaubt"),
    events: (allowed: boolean) => (allowed ? "Partys und Veranstaltungen erlaubt" : "Keine Partys oder Veranstaltungen"),
    age: (age: number) => `Die buchende Person ist mindestens ${age} Jahre alt und übernachtet selbst in der Unterkunft`,
  },
};

export function stayRuleError(checkIn: string, checkOut: string, rules: StayRules, lang: Lang = "en"): string | null {
  const text = RULE_TEXT[lang];
  const nights = stayNights(checkIn, checkOut);
  const min = minNights(rules);
  if (nights.length < min) {
    return text.minStayError(min);
  }
  const holidayMin = holidayMinNights(rules);
  if (holidayMin && nights.length < holidayMin && nights.some(isPartyNight)) {
    return text.holidayError(holidayMin);
  }
  return null;
}

/** The listing's rules as short lines for guests: "Minimum stay 2 nights (3 over Valborg, …)", "No pets", … */
export function houseRuleLines(rules: StayRules, lang: Lang = "en"): string[] {
  const text = RULE_TEXT[lang];
  return [
    text.minStay(minNights(rules), holidayMinNights(rules)),
    text.pets(!!rules.pets_allowed),
    text.smoking(!!rules.smoking_allowed),
    text.events(!!rules.events_allowed),
    text.age(minGuestAge(rules)),
  ];
}
