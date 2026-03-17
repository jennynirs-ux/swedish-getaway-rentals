/**
 * BL-006: Refund calculator based on cancellation policy and timing.
 *
 * Policy tiers:
 *   flexible  → 100% refund ≥1 day before check-in, 0% within 24h
 *   moderate  → 100% refund ≥5 days, 50% within 5 days, 0% within 24h
 *   strict    → 50% refund ≥7 days, 0% within 7 days
 */

export type CancellationPolicy = "flexible" | "moderate" | "strict";

export interface RefundResult {
  refundPercentage: number;
  refundAmount: number;
  reason: string;
  eligible: boolean;
}

const POLICY_RULES: Record<CancellationPolicy, Array<{ minDays: number; refund: number; label: string }>> = {
  flexible: [
    { minDays: 1, refund: 100, label: "Full refund (cancelled 1+ day before check-in)" },
    { minDays: 0, refund: 0, label: "No refund (cancelled within 24 hours of check-in)" },
  ],
  moderate: [
    { minDays: 5, refund: 100, label: "Full refund (cancelled 5+ days before check-in)" },
    { minDays: 1, refund: 50, label: "50% refund (cancelled 1–5 days before check-in)" },
    { minDays: 0, refund: 0, label: "No refund (cancelled within 24 hours of check-in)" },
  ],
  strict: [
    { minDays: 7, refund: 50, label: "50% refund (cancelled 7+ days before check-in)" },
    { minDays: 0, refund: 0, label: "No refund (cancelled within 7 days of check-in)" },
  ],
};

/**
 * Calculate refund amount for a cancellation.
 *
 * @param policy - The property's cancellation policy tier
 * @param checkInDate - The booked check-in date (ISO string or Date)
 * @param totalAmountCents - Total booking amount in smallest currency unit (öre/cents)
 * @param cancellationDate - When the cancellation is requested (defaults to now)
 */
export function calculateRefund(
  policy: CancellationPolicy,
  checkInDate: string | Date,
  totalAmountCents: number,
  cancellationDate: Date = new Date()
): RefundResult {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(15, 0, 0, 0); // Check-in is typically 15:00

  const diffMs = checkIn.getTime() - cancellationDate.getTime();
  const daysBeforeCheckIn = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Already checked in or past check-in
  if (daysBeforeCheckIn < 0) {
    return {
      refundPercentage: 0,
      refundAmount: 0,
      reason: "No refund available — check-in date has passed",
      eligible: false,
    };
  }

  const rules = POLICY_RULES[policy] || POLICY_RULES.moderate;

  for (const rule of rules) {
    if (daysBeforeCheckIn >= rule.minDays) {
      const refundAmount = Math.round(totalAmountCents * (rule.refund / 100));
      return {
        refundPercentage: rule.refund,
        refundAmount,
        reason: rule.label,
        eligible: rule.refund > 0,
      };
    }
  }

  return {
    refundPercentage: 0,
    refundAmount: 0,
    reason: "No refund available under this cancellation policy",
    eligible: false,
  };
}

/**
 * Get human-readable policy description for display.
 */
export function getPolicyDescription(policy: CancellationPolicy): string {
  switch (policy) {
    case "flexible":
      return "Full refund if cancelled at least 1 day before check-in.";
    case "moderate":
      return "Full refund if cancelled 5+ days before check-in. 50% refund within 5 days.";
    case "strict":
      return "50% refund if cancelled 7+ days before check-in. No refund within 7 days.";
    default:
      return "Contact us for cancellation details.";
  }
}
