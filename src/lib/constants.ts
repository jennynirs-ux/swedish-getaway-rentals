/**
 * Platform-wide constants.
 *
 * Keep PLATFORM_SERVICE_FEE_RATE in sync with profiles.commission_rate (default 10)
 * and the Skatteverket values with supabase/functions/generate-tax-report/index.ts
 * (Deno edge functions cannot import from src/).
 */

// Fee model A: the guest pays the host's price plus this service fee; the host
// keeps their whole price. Must match profiles.commission_rate (default 10) used
// by supabase/functions/create-booking-payment-connect.
export const PLATFORM_SERVICE_FEE_RATE = 0.10;

/** Founding-host offer: guests of hosts who join by the deadline pay this fee (percent) for the host's first 12 months */
export const FOUNDING_HOST_FEE_PCT = 5;
export const FOUNDING_HOST_DEADLINE = "31 December 2026";
/** Whether new hosts can still get the offer (become_host gives it until the end of 31 Dec, Swedish time) */
export const foundingHostOfferOpen = (now = new Date()) => now < new Date("2027-01-01T00:00:00+01:00");

/** What the guest pays for a host price (both in the same unit). ratePct is
 * the property's service_fee_rate (5 during the founding-host offer). */
export const withServiceFee = (hostPrice: number, ratePct: number | null = null) =>
  hostPrice * (1 + (ratePct ?? PLATFORM_SERVICE_FEE_RATE * 100) / 100);

/**
 * The host's share of a booking, in öre. Bookings since fee model A store it in
 * host_amount; older ones carried no service fee, so their total is the host's.
 */
export const hostShareOre = (b: { total_amount?: number | null; host_amount?: number | null; service_fee?: number | null }) =>
  b.host_amount ?? (b.total_amount ?? 0) - (b.service_fee ?? 0);

// Skatteverket privatuthyrning (private rental) constants
export const SKATTEVERKET_SCHABLONAVDRAG_SEK = 40000;
export const SKATTEVERKET_ADDITIONAL_DEDUCTION_RATE = 0.20;
export const SKATTEVERKET_CAPITAL_TAX_RATE = 0.30;
