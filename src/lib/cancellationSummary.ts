import type { PolicyTier } from "@/hooks/useCancellationPolicy";

export interface CancellationSummary {
  /** Refund (percent) when cancelling more than fullDays days before arrival */
  fullPct: number;
  fullDays: number;
  /** Refund (percent) when cancelling up to partDays days before; null when the policy has no second refund step */
  partPct: number | null;
  partDays: number | null;
}

// The tiers in platform_settings today. Used until the setting has loaded, so
// the prerendered home page always has real numbers.
const FALLBACK: CancellationSummary = { fullPct: 90, fullDays: 21, partPct: 50, partDays: 8 };

/** The two refund steps of the policy, for "90% back … more than 21 days before arrival, 50% up to 8 days before" */
export function summarizeCancellation(tiers: PolicyTier[] | null | undefined): CancellationSummary {
  const refunding = (tiers ?? [])
    .filter((t) => t.refund_percentage > 0)
    .sort((a, b) => b.min_days - a.min_days);
  if (refunding.length === 0) return FALLBACK;

  const [full, part] = refunding;
  return {
    fullPct: full.refund_percentage,
    fullDays: full.min_days - 1,
    partPct: part?.refund_percentage ?? null,
    partDays: part?.min_days ?? null,
  };
}
