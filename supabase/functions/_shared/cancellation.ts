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

export interface NamedPolicy extends CancellationPolicy {
  key: PolicyKey;
  name: string;
  /** One line for hosts and guests, e.g. "Full refund up to 5 days before arrival, then 50%." */
  summary: string;
  /** Swedish name for the host panel, e.g. "Måttlig" (guests see `name`) */
  nameSv: string;
  /** Swedish one-line summary for the host panel (guests see `summary`) */
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

/** "90% refund more than 21 days before arrival; 50% refund 21–8 days …" */
export function policySummary(policy: CancellationPolicy): string {
  return policy.tiers
    .map((t) => `${t.refund_percentage > 0 ? `${t.refund_percentage}% refund` : "no refund"} ${t.label.charAt(0).toLowerCase()}${t.label.slice(1)}`)
    .join("; ");
}
