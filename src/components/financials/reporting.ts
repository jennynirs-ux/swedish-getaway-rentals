import { stockholmDate } from "@/lib/constants";
import { hostNetAmount } from "../../../supabase/functions/_shared/payout";

/**
 * Pure helpers shared by the financial views (Profitability, Revenue by
 * Channel, Key Metrics and the Tax Report). Kept free of Supabase so they can
 * be unit tested.
 *
 * One basis everywhere: a booking belongs to the year and month of its
 * check-in date (the stay), which is also what generate-tax-report uses, and
 * the host's income per booking is hostNetAmount from
 * supabase/functions/_shared/payout.ts. The host dashboard and
 * generate-tax-report must use the same helper (and select refunded_amount
 * for it), so the tabs and the tax report add up to the same totals.
 */

/** What the host keeps from a booking (öre); re-exported so the views have one import */
export { hostNetAmount };

export const STAY_BASIS_LABEL = "Efter incheckningsdatum";
/** Airbnb, Booking.com etc. only block dates through iCal; their income never reaches our bookings table. */
export const NORDIC_GETAWAYS_ONLY_LABEL = "Endast bokningar via Nordic Getaways";

/** Bookings that are (or were) stays: they count for nights and occupancy. */
export const STAY_STATUSES = ["confirmed", "completed"];
/** Bookings that can carry income for the host: stays, plus cancellations where the host kept part of the payment. */
export const INCOME_STATUSES = [...STAY_STATUSES, "cancelled"];

/** The current (or given) year in Sweden, which the year pickers default to */
export const stockholmYear = (at: Date = new Date()): number => Number(stockholmDate(at).slice(0, 4));

/**
 * Years to offer in the year picker, newest first: from the latest stay year
 * (at least the current year, so the default is always listed) back to the
 * first one (at most the current year). Built from the data, so it never runs
 * out on 1 January.
 */
export function financialYears(currentYear: number, firstYear?: number | null, lastYear?: number | null): number[] {
  const newest = Math.max(currentYear, Number.isFinite(lastYear) ? (lastYear as number) : currentYear);
  const oldest = Math.min(currentYear, Number.isFinite(firstYear) ? (firstYear as number) : currentYear);
  return Array.from({ length: newest - oldest + 1 }, (_, i) => newest - i);
}

/** Inclusive bounds for a year on a date column such as check_in_date (not a timestamp, so 31 December is included). */
export const yearBounds = (year: number) => ({ from: `${year}-01-01`, to: `${year}-12-31` });

const utcDay = (isoDate: string) =>
  Date.UTC(Number(isoDate.slice(0, 4)), Number(isoDate.slice(5, 7)) - 1, Number(isoDate.slice(8, 10)));
const DAY_MS = 24 * 60 * 60 * 1000;

/** Nights between two "YYYY-MM-DD" dates (at least 1), independent of the browser's time zone and DST. */
export const nightsBetween = (checkIn: string, checkOut: string): number =>
  Math.max(1, Math.round((utcDay(checkOut) - utcDay(checkIn)) / DAY_MS));

/** Days from booking (Swedish date of created_at) to check-in, never negative. */
export const leadDays = (createdAt: string, checkIn: string): number =>
  Math.max(0, Math.round((utcDay(checkIn) - utcDay(stockholmDate(createdAt))) / DAY_MS));

/** The booking columns the income helpers read (as selected from bookings_secure, where every column is nullable) */
export type BookingMoney = Parameters<typeof hostNetAmount>[0];

export const isStay = (b: Pick<BookingMoney, "status">): boolean => !!b.status && STAY_STATUSES.includes(b.status);

export interface IncomeSummary {
  /** Confirmed and completed bookings */
  stays: number;
  nights: number;
  /** Host net from stays, öre */
  stayIncomeOre: number;
  /** Cancelled bookings where the host kept something */
  cancellations: number;
  /** Host net kept from cancelled bookings, öre */
  cancellationIncomeOre: number;
  /** stayIncomeOre + cancellationIncomeOre */
  incomeOre: number;
}

/** Totals for a set of bookings: income includes what the host kept from cancellations, nights only real stays. */
export function summarizeIncome(
  bookings: (BookingMoney & { check_in_date?: string | null; check_out_date?: string | null })[]
): IncomeSummary {
  const s: IncomeSummary = { stays: 0, nights: 0, stayIncomeOre: 0, cancellations: 0, cancellationIncomeOre: 0, incomeOre: 0 };
  for (const b of bookings) {
    const net = hostNetAmount(b);
    if (isStay(b)) {
      s.stays += 1;
      s.stayIncomeOre += net;
      if (b.check_in_date && b.check_out_date) s.nights += nightsBetween(b.check_in_date, b.check_out_date);
    } else if (b.status === "cancelled" && net > 0) {
      s.cancellations += 1;
      s.cancellationIncomeOre += net;
    }
  }
  s.incomeOre = s.stayIncomeOre + s.cancellationIncomeOre;
  return s;
}

/**
 * The message to show when an edge function call fails. supabase-js reports
 * every non-2xx response as "Edge Function returned a non-2xx status code";
 * the function's own reason is in the response body ({ error: "..." }).
 */
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      const message = body?.error ?? body?.message;
      if (typeof message === "string" && message.trim()) return message.trim();
    } catch {
      // Not JSON (e.g. a gateway page): the status code is all we can add
    }
    return `${fallback} (HTTP ${context.status})`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
