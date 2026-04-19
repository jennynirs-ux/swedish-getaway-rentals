/**
 * Platform-wide constants.
 *
 * Keep this in sync with supabase/functions/generate-tax-report/index.ts
 * (Deno edge functions cannot import from src/).
 */

// Platform commission rate applied to host payouts (gross revenue * rate = platform fee)
export const PLATFORM_COMMISSION_RATE = 0.10;

// Host's share after commission
export const HOST_PAYOUT_RATE = 1 - PLATFORM_COMMISSION_RATE;

// Skatteverket privatuthyrning (private rental) constants
export const SKATTEVERKET_SCHABLONAVDRAG_SEK = 40000;
export const SKATTEVERKET_ADDITIONAL_DEDUCTION_RATE = 0.20;
export const SKATTEVERKET_CAPITAL_TAX_RATE = 0.30;
