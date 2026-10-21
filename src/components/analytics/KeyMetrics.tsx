import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Home, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { FinancialScope, ResolvedScope } from "@/components/financials/scope";
import { oreToSek } from "@/lib/swedishTax";
import {
  INCOME_STATUSES,
  NORDIC_GETAWAYS_ONLY_LABEL,
  STAY_BASIS_LABEL,
  isStay,
  leadDays,
  summarizeIncome,
  yearBounds,
} from "@/components/financials/reporting";
import { YearSelect } from "@/components/financials/YearSelect";
import { useFinancialYears } from "@/components/financials/useFinancialYears";

interface Metrics {
  totalBookings: number;
  totalNights: number;
  avgNightlyRateOre: number;
  avgLeadTimeDays: number;
  avgStayLength: number;
  /** Cancelled bookings the host kept money from, and how much (öre) */
  cancellations: number;
  cancellationIncomeOre: number;
}

const EMPTY_METRICS: Metrics = {
  totalBookings: 0,
  totalNights: 0,
  avgNightlyRateOre: 0,
  avgLeadTimeDays: 0,
  avgStayLength: 0,
  cancellations: 0,
  cancellationIncomeOre: 0,
};

async function loadMetrics({ propertyIds }: ResolvedScope, year: number): Promise<Metrics> {
  if (propertyIds.length === 0) return EMPTY_METRICS;

  const { from, to } = yearBounds(year);
  const { data: bookings, error } = await supabase
    .from("bookings_secure")
    .select(
      "status, total_amount, host_amount, service_fee, refunded_amount, host_reversed_amount, stripe_payment_intent_id, check_in_date, check_out_date, created_at"
    )
    .in("property_id", propertyIds)
    .in("status", INCOME_STATUSES)
    .gte("check_in_date", from)
    .lte("check_in_date", to);
  if (error) throw error;

  const list = bookings || [];
  const income = summarizeIncome(list);
  const stays = list.filter(isStay);
  const totalLeadDays = stays.reduce(
    (sum, b) => sum + (b.created_at && b.check_in_date ? leadDays(b.created_at, b.check_in_date) : 0),
    0
  );

  return {
    totalBookings: income.stays,
    totalNights: income.nights,
    avgNightlyRateOre: income.nights > 0 ? Math.round(income.stayIncomeOre / income.nights) : 0,
    avgLeadTimeDays: income.stays > 0 ? Math.round(totalLeadDays / income.stays) : 0,
    avgStayLength: income.stays > 0 ? Math.round((income.nights / income.stays) * 10) / 10 : 0,
    cancellations: income.cancellations,
    cancellationIncomeOre: income.cancellationIncomeOre,
  };
}

interface Props {
  scope: FinancialScope;
}

/**
 * Headline operational metrics: total bookings, nights, ADR (average daily rate),
 * average lead time (days between booking and check-in), average stay length.
 *
 * Stays (confirmed/completed) drive bookings, nights and ADR. What the host
 * kept from cancelled bookings is income but not occupancy, so it is shown
 * beside the stays instead of inflating the nightly rate.
 */
const KeyMetrics = ({ scope }: Props) => {
  const { year, setYear, years, scope: resolved } = useFinancialYears(scope);
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolved) return;
    // Drop the answer if the year or scope changed while it was loading
    let stale = false;
    setLoading(true);
    loadMetrics(resolved, year)
      .then((result) => {
        if (!stale) setMetrics(result);
      })
      .catch(() => {
        if (!stale) setMetrics(EMPTY_METRICS);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [year, resolved]);

  const fmtSek = (ore: number) =>
    oreToSek(ore).toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Key Metrics</h3>
          <p className="text-xs text-muted-foreground">
            {NORDIC_GETAWAYS_ONLY_LABEL}. {STAY_BASIS_LABEL}.
          </p>
        </div>
        <YearSelect years={years} value={year} onChange={setYear} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total Bookings</p>
              <Home className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{loading ? "--" : metrics.totalBookings}</p>
            <p className="text-xs text-muted-foreground mt-1">stays checking in {year}</p>
            {!loading && metrics.cancellations > 0 && (
              <p className="text-xs text-muted-foreground">
                + {metrics.cancellations} cancelled ({fmtSek(metrics.cancellationIncomeOre)} kr kept)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Nights Booked</p>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{loading ? "--" : metrics.totalNights}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg stay: {loading ? "--" : metrics.avgStayLength} nights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Avg Nightly Rate</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              {loading ? "--" : `${fmtSek(metrics.avgNightlyRateOre)} kr`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">host income per night stayed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Avg Lead Time</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">
              {loading ? "--" : `${metrics.avgLeadTimeDays} days`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">booking to check-in</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KeyMetrics;
