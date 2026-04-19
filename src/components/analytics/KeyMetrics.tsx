// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Home, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, differenceInDays } from "date-fns";
import { resolveScope, type FinancialScope } from "@/components/financials/scope";
import { oreToSek } from "@/lib/swedishTax";

interface Metrics {
  totalBookings: number;
  totalNights: number;
  avgNightlyRateOre: number;
  avgLeadTimeDays: number;
  avgStayLength: number;
}

interface Props {
  scope: FinancialScope;
}

/**
 * Headline operational metrics: total bookings, nights, ADR (average daily rate),
 * average lead time (days between booking and check-in), average stay length.
 */
const KeyMetrics = ({ scope }: Props) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [metrics, setMetrics] = useState<Metrics>({
    totalBookings: 0,
    totalNights: 0,
    avgNightlyRateOre: 0,
    avgLeadTimeDays: 0,
    avgStayLength: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, scope]);

  const load = async () => {
    setLoading(true);
    try {
      const { propertyIds } = await resolveScope(scope);
      if (propertyIds.length === 0) {
        setMetrics({ totalBookings: 0, totalNights: 0, avgNightlyRateOre: 0, avgLeadTimeDays: 0, avgStayLength: 0 });
        setLoading(false);
        return;
      }

      const { data: bookings } = await supabase
        .from("bookings")
        .select("total_amount, check_in_date, check_out_date, created_at")
        .in("property_id", propertyIds)
        .in("status", ["confirmed", "completed"])
        .gte("check_in_date", `${year}-01-01`)
        .lte("check_in_date", `${year}-12-31`);

      const list = bookings || [];
      const totalBookings = list.length;

      if (totalBookings === 0) {
        setMetrics({ totalBookings: 0, totalNights: 0, avgNightlyRateOre: 0, avgLeadTimeDays: 0, avgStayLength: 0 });
        setLoading(false);
        return;
      }

      let totalNights = 0;
      let totalRevenue = 0;
      let totalLeadDays = 0;

      for (const b of list) {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        const nights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));
        totalNights += nights;
        totalRevenue += b.total_amount || 0;

        const created = new Date(b.created_at);
        const lead = Math.max(0, differenceInDays(checkIn, created));
        totalLeadDays += lead;
      }

      setMetrics({
        totalBookings,
        totalNights,
        avgNightlyRateOre: totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0,
        avgLeadTimeDays: Math.round(totalLeadDays / totalBookings),
        avgStayLength: Math.round((totalNights / totalBookings) * 10) / 10,
      });
    } catch {
      // Keep zeros
    } finally {
      setLoading(false);
    }
  };

  const fmtSek = (ore: number) =>
    oreToSek(ore).toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Key Metrics</h3>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total Bookings</p>
              <Home className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{loading ? "--" : metrics.totalBookings}</p>
            <p className="text-xs text-muted-foreground mt-1">in {year}</p>
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
            <p className="text-xs text-muted-foreground mt-1">ADR across year</p>
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
