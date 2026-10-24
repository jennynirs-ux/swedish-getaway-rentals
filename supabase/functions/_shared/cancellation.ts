// Cancellation policies. Each listing has one of four fixed policies,
// chosen by its host (properties.cancellation_policy); the policy shown when
// the guest booked is saved on the booking (bookings.cancellation_policy) and
// decides the refund if the guest cancels. The refund is a share of the price
// of the stay; the guest service fee is not refunded when the guest cancels.
// If the host or we cancel, the guest gets everything back (planCancellation
// in payout.ts). The booking form, e-mails, cancel-booking and the terms all
// read these tiers.

import { stockholmToday } from "./format.ts";

export interface PolicyTier {
  label: string;
  min_days: number;
  max_days?: number;
  refund_percentage: number;
}

export interface CancellationPolicy {
  tiers: PolicyTier[];
  footer_note?: string;
}

export type PolicyKey = "flexible" | "moderate" | "standard" | "strict";

/** The guest site's languages (the same as ContentLang in listing-text.ts) */
type Lang = "en" | "sv" | "de";

export interface NamedPolicy extends CancellationPolicy {
  key: PolicyKey;
  name: string;
  /** One line for hosts and guests, e.g. "Full refund up to 5 days before arrival, then 50%." */
  summary: string;
  /** Swedish name for the host panel, e.g. "Måttlig" (guests see policyText in their language) */
  nameSv: string;
  /** Swedish one-line summary for the host panel (guests see policyText in their language) */
  summarySv: string;
}

export const POLICY_FOOTER =
  "Days are counted to the arrival date from the day the cancellation reaches us (Swedish time). The service fee is not refunded when you cancel. We recommend travel insurance for the unforeseen.";

export const CANCELLATION_POLICIES: Record<PolicyKey, NamedPolicy> = {
  flexible: {
    key: "flexible",
    name: "Flexible",
    summary: "Full refund up to 1 day before arrival.",
    nameSv: "Flexibel",
    summarySv: "Full återbetalning fram till dagen före ankomst.",
    tiers: [
      { label: "1 day or more before arrival", min_days: 1, refund_percentage: 100 },
      { label: "On the day of arrival", min_days: 0, max_days: 0, refund_percentage: 0 },
    ],
    footer_note: POLICY_FOOTER,
  },
  moderate: {
    key: "moderate",
    name: "Moderate",
    summary: "Full refund up to 5 days before arrival, then 50% until the day before.",
    nameSv: "Måttlig",
    summarySv: "Full återbetalning fram till 5 dagar före ankomst, sedan 50 % fram till dagen före.",
    tiers: [
      { label: "5 days or more before arrival", min_days: 5, refund_percentage: 100 },
      { label: "4–1 days before arrival", min_days: 1, max_days: 4, refund_percentage: 50 },
      { label: "On the day of arrival", min_days: 0, max_days: 0, refund_percentage: 0 },
    ],
    footer_note: POLICY_FOOTER,
  },
  standard: {
    key: "standard",
    name: "Standard",
    summary: "90% refund more than 21 days before arrival, 50% from 21 to 8 days, then none.",
    nameSv: "Standard",
    summarySv: "90 % tillbaka mer än 21 dagar före ankomst, 50 % 21–8 dagar före, sedan inget.",
    tiers: [
      { label: "More than 21 days before arrival", min_days: 22, refund_percentage: 90 },
      { label: "21–8 days before arrival", min_days: 8, max_days: 21, refund_percentage: 50 },
      { label: "7 days or less before arrival", min_days: 0, max_days: 7, refund_percentage: 0 },
    ],
    footer_note: POLICY_FOOTER,
  },
  strict: {
    key: "strict",
    name: "Strict",
    summary: "50% refund up to 14 days before arrival, then none.",
    nameSv: "Strikt",
    summarySv: "50 % tillbaka fram till 14 dagar före ankomst, sedan inget.",
    tiers: [
      { label: "14 days or more before arrival", min_days: 14, refund_percentage: 50 },
      { label: "13 days or less before arrival", min_days: 0, max_days: 13, refund_percentage: 0 },
    ],
    footer_note: POLICY_FOOTER,
  },
};

export const POLICY_KEYS = Object.keys(CANCELLATION_POLICIES) as PolicyKey[];

/** New listings, and bookings made before hosts chose (they were all booked on it) */
export const DEFAULT_POLICY: PolicyKey = "standard";

export const isPolicyKey = (value: unknown): value is PolicyKey =>
  typeof value === "string" && (POLICY_KEYS as string[]).includes(value);

/** The policy for a booking or listing; anything unknown or missing is Standard */
export const policyFor = (key: unknown): NamedPolicy => CANCELLATION_POLICIES[isPolicyKey(key) ? key : DEFAULT_POLICY];

/** Whole days from today (Swedish date) until the check-in date */
export function daysBeforeArrival(checkIn: string, today = stockholmToday()): number {
  const ms = Date.parse(`${checkIn.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function refundPercentage(policy: CancellationPolicy, days: number): number {
  const tier = policy.tiers.find((t) => days >= t.min_days && (t.max_days === undefined || days <= t.max_days));
  return tier?.refund_percentage ?? 0;
}

// Guests read the policies in the page's language. English is the policies
// above (e-mails, the terms and the payment functions use those); Swedish and
// German follow, tier by tier in the same order.

const FOOTERS: Record<Lang, string> = {
  en: POLICY_FOOTER,
  sv: "Dagarna räknas fram till ankomstdagen från den dag avbokningen når oss (svensk tid). Serviceavgiften betalas inte tillbaka när du avbokar. Vi rekommenderar en reseförsäkring för det oförutsedda.",
  de: "Die Tage bis zur Anreise zählen ab dem Tag, an dem uns deine Stornierung erreicht (schwedische Zeit). Die Servicegebühr wird nicht erstattet, wenn du stornierst. Für Unvorhergesehenes empfehlen wir eine Reiserücktrittsversicherung.",
};

const TRANSLATED: Record<Exclude<Lang, "en">, Record<PolicyKey, { name: string; summary: string; tiers: string[] }>> = {
  sv: {
    flexible: {
      name: CANCELLATION_POLICIES.flexible.nameSv,
      summary: CANCELLATION_POLICIES.flexible.summarySv,
      tiers: ["1 dag eller mer före ankomst", "På ankomstdagen"],
    },
    moderate: {
      name: CANCELLATION_POLICIES.moderate.nameSv,
      summary: CANCELLATION_POLICIES.moderate.summarySv,
      tiers: ["5 dagar eller mer före ankomst", "4–1 dagar före ankomst", "På ankomstdagen"],
    },
    standard: {
      name: CANCELLATION_POLICIES.standard.nameSv,
      summary: "90 % återbetalning mer än 21 dagar före ankomst, 50 % 21–8 dagar före, sedan ingen.",
      tiers: ["Mer än 21 dagar före ankomst", "21–8 dagar före ankomst", "7 dagar eller mindre före ankomst"],
    },
    strict: {
      name: CANCELLATION_POLICIES.strict.nameSv,
      summary: "50 % återbetalning fram till 14 dagar före ankomst, sedan ingen.",
      tiers: ["14 dagar eller mer före ankomst", "13 dagar eller mindre före ankomst"],
    },
  },
  de: {
    flexible: {
      name: "Flexibel",
      summary: "Volle Rückerstattung bis 1 Tag vor Anreise.",
      tiers: ["1 Tag oder mehr vor Anreise", "Am Anreisetag"],
    },
    moderate: {
      name: "Moderat",
      summary: "Volle Rückerstattung bis 5 Tage vor Anreise, danach 50 % bis zum Vortag.",
      tiers: ["5 Tage oder mehr vor Anreise", "4–1 Tage vor Anreise", "Am Anreisetag"],
    },
    standard: {
      name: "Standard",
      summary: "90 % Rückerstattung bis 22 Tage vor Anreise, 50 % bis 8 Tage vorher, danach keine.",
      tiers: ["Mehr als 21 Tage vor Anreise", "21–8 Tage vor Anreise", "7 Tage oder weniger vor Anreise"],
    },
    strict: {
      name: "Streng",
      summary: "50 % Rückerstattung bis 14 Tage vor Anreise, danach keine.",
      tiers: ["14 Tage oder mehr vor Anreise", "13 Tage oder weniger vor Anreise"],
    },
  },
};

// Tier labels by their English wording, for a policy passed without its key
const TIER_LABELS: Record<string, Record<Exclude<Lang, "en">, string>> = {};
for (const key of POLICY_KEYS) {
  CANCELLATION_POLICIES[key].tiers.forEach((tier, i) => {
    TIER_LABELS[tier.label] = { sv: TRANSLATED.sv[key].tiers[i], de: TRANSLATED.de[key].tiers[i] };
  });
}

export interface PolicyText {
  name: string;
  summary: string;
  /** The tiers' labels, in the order of the policy's tiers */
  tiers: string[];
  footer: string;
}

/** A policy's name, summary, tier labels and footer for guests, in their language */
export function policyText(key: PolicyKey, lang: Lang = "en"): PolicyText {
  const policy = CANCELLATION_POLICIES[key];
  if (lang === "en") {
    return { name: policy.name, summary: policy.summary, tiers: policy.tiers.map((t) => t.label), footer: POLICY_FOOTER };
  }
  const text = TRANSLATED[lang][key];
  return { name: text.name, summary: text.summary, tiers: [...text.tiers], footer: FOOTERS[lang] };
}

/** The footer of every policy (POLICY_FOOTER in English) */
export const policyFooter = (lang: Lang = "en"): string => FOOTERS[lang];

/** One tier's label in a language: "21–8 dagar före ankomst" */
export const tierLabel = (tier: PolicyTier, lang: Lang = "en"): string =>
  lang === "en" ? tier.label : TIER_LABELS[tier.label]?.[lang] ?? tier.label;

/** A tier's refund: "90% refund" / "No refund", "90 % återbetalning" / "Ingen återbetalning" */
export function tierRefund(tier: PolicyTier, lang: Lang = "en"): string {
  const pct = tier.refund_percentage;
  switch (lang) {
    case "sv":
      return pct > 0 ? `${pct} % återbetalning` : "Ingen återbetalning";
    case "de":
      return pct > 0 ? `${pct} % Rückerstattung` : "Keine Rückerstattung";
    default:
      return pct > 0 ? `${pct}% refund` : "No refund";
  }
}

const lowerFirst = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

/** "90% refund more than 21 days before arrival; 50% refund 21–8 days …" */
export function policySummary(policy: CancellationPolicy, lang: Lang = "en"): string {
  if (lang === "en") {
    return policy.tiers
      .map((t) => `${t.refund_percentage > 0 ? `${t.refund_percentage}% refund` : "no refund"} ${lowerFirst(t.label)}`)
      .join("; ");
  }
  // "Mer än 21 dagar före ankomst: 90 % återbetalning; 21–8 dagar före ankomst: 50 % återbetalning; …"
  return policy.tiers
    .map((t, i) => {
      const label = tierLabel(t, lang);
      return `${i === 0 ? label : lowerFirst(label)}: ${lowerFirst(tierRefund(t, lang))}`;
    })
    .join("; ");
}
