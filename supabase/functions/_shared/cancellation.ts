import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { stockholmToday } from "./format.ts";

// The cancellation policy lives in platform_settings.cancellation_policy (the
// booking form shows it from there). E-mails and refunds read the same tiers.

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

// Only if the setting can't be read
const FALLBACK: CancellationPolicy = {
  tiers: [
    { label: "More than 21 days before arrival", min_days: 22, refund_percentage: 90 },
    { label: "21–8 days before arrival", min_days: 8, max_days: 21, refund_percentage: 50 },
    { label: "7 days or less before arrival", min_days: 0, max_days: 7, refund_percentage: 0 },
  ],
};

export async function loadCancellationPolicy(supabase: SupabaseClient): Promise<CancellationPolicy> {
  const { data } = await supabase
    .from("platform_settings")
    .select("setting_value")
    .eq("setting_key", "cancellation_policy")
    .maybeSingle();
  const value = data?.setting_value as CancellationPolicy | undefined;
  return value?.tiers?.length ? value : FALLBACK;
}

/** Whole days from today (Swedish date) until the check-in date */
export function daysBeforeArrival(checkIn: string, today = stockholmToday()): number {
  const ms = Date.parse(`${checkIn.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function refundPercentage(policy: CancellationPolicy, days: number): number {
  const tier = policy.tiers.find((t) => days >= t.min_days && (t.max_days === undefined || days <= t.max_days));
  return tier?.refund_percentage ?? 0;
}

/** "90% refund more than 21 days before arrival, 50% refund 21–8 days …" */
export function policySummary(policy: CancellationPolicy): string {
  return policy.tiers
    .map((t) => `${t.refund_percentage > 0 ? `${t.refund_percentage}% refund` : "no refund"} ${t.label.charAt(0).toLowerCase()}${t.label.slice(1)}`)
    .join("; ");
}
