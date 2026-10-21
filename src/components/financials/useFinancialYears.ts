import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveScope, type FinancialScope, type ResolvedScope } from "./scope";
import { INCOME_STATUSES, financialYears, stockholmYear } from "./reporting";

const EMPTY_SCOPE: ResolvedScope = { propertyIds: [], properties: [] };

/** First and last check-in year in a set of properties; shared by views that mount together */
const spanInFlight = new Map<string, Promise<{ first: number | null; last: number | null }>>();
function stayYearSpan(propertyIds: string[]) {
  const key = propertyIds.join(",");
  const pending = spanInFlight.get(key);
  if (pending) return pending;
  const edge = (ascending: boolean) =>
    supabase
      .from("bookings_secure")
      .select("check_in_date")
      .in("property_id", propertyIds)
      .in("status", INCOME_STATUSES)
      .not("check_in_date", "is", null)
      .order("check_in_date", { ascending })
      .limit(1);
  const yearOf = (rows: { check_in_date: string | null }[] | null) =>
    rows?.[0]?.check_in_date ? Number(rows[0].check_in_date.slice(0, 4)) : null;
  const span = Promise.all([edge(true), edge(false)])
    .then(([{ data: first }, { data: last }]) => ({ first: yearOf(first), last: yearOf(last) }))
    .finally(() => spanInFlight.delete(key));
  spanInFlight.set(key, span);
  return span;
}

export interface FinancialYearsOptions {
  /** The year selected at first (default: the current Swedish year) */
  initialYear?: number;
  /** Leave out later years, e.g. the tax report, which cannot report on future years */
  maxYear?: number;
}

/**
 * The year picker's state for a financial view, plus the view's resolved
 * scope so the view does not resolve it a second time.
 *
 * Years run from the latest check-in year (at least the current Swedish year,
 * at most maxYear) back to the first check-in year in the scope, so the list
 * grows by itself and the selected year is always one of the options.
 * `scope` is null until resolved; on failure it is an empty scope.
 */
export function useFinancialYears(scope: FinancialScope, options: FinancialYearsOptions = {}) {
  const currentYear = stockholmYear();
  const { maxYear } = options;
  const cap = (y: number) => (maxYear != null ? Math.min(y, maxYear) : y);
  const [year, setYear] = useState(() => cap(options.initialYear ?? currentYear));
  const [resolved, setResolved] = useState<ResolvedScope | null>(null);
  const [span, setSpan] = useState<{ first: number | null; last: number | null }>({ first: null, last: null });

  useEffect(() => {
    let stale = false;
    setResolved(null);
    (async () => {
      const result = await resolveScope(scope);
      if (stale) return;
      setResolved(result);
      if (result.propertyIds.length === 0) return;
      const found = await stayYearSpan(result.propertyIds);
      if (!stale) setSpan(found);
    })().catch(() => {
      // Keep the current year only; the view shows its empty state
      if (!stale) setResolved((current) => current ?? { ...EMPTY_SCOPE, error: "Could not load your listings" });
    });
    return () => {
      stale = true;
    };
  }, [scope]);

  const years = financialYears(
    currentYear,
    Math.min(span.first ?? currentYear, year),
    Math.max(span.last ?? currentYear, year)
  ).filter((y) => maxYear == null || y <= maxYear);
  return { year, setYear: (y: number) => setYear(cap(y)), years, scope: resolved };
}
