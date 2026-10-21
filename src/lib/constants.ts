/**
 * Platform-wide constants.
 *
 * Keep PLATFORM_SERVICE_FEE_RATE in sync with profiles.commission_rate (default 10)
 * and the Skatteverket values with supabase/functions/generate-tax-report/index.ts
 * (Deno edge functions cannot import from src/).
 */

// Host money rules shared with the edge functions (pure, no Deno imports)
import { hostShareAmount } from "../../supabase/functions/_shared/payout";

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
 * The same rule as the edge functions (hostShareAmount).
 */
export const hostShareOre = hostShareAmount;

/**
 * When hosts are paid (owner decisions 21 Oct 2026): the host's price waits in
 * their own Stripe balance and our payout job sends it to their bank the day
 * after check-in, or 85 days after the guest paid if that comes first (Stripe
 * pays out money left in an account for 90 days on its own, so we always pay
 * first). A refund after the payout is taken from the host's next payout.
 * Same rule as payoutDueOn in supabase/functions/_shared/payout.ts.
 */
export const HOST_PAYOUT_TIMING_TEXT = "the day after check-in, or 85 days after the guest paid if that comes first";

// What the host keeps of a booking (refunds, cancellations) is hostNetAmount in
// supabase/functions/_shared/payout.ts, shared by the host dashboard, the
// financial views and generate-tax-report so they always agree.

/**
 * A moment as YYYY-MM-DD in Swedish time, which payout dates, months and
 * financial years follow (the one copy; src/components/financials uses it too)
 */
export const stockholmDate = (d: Date | string = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(typeof d === "string" ? new Date(d) : d);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

// Skatteverket privatuthyrning (private rental) constants
export const SKATTEVERKET_SCHABLONAVDRAG_SEK = 40000;
export const SKATTEVERKET_ADDITIONAL_DEDUCTION_RATE = 0.20;
export const SKATTEVERKET_CAPITAL_TAX_RATE = 0.30;
