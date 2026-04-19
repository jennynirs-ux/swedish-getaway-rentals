// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, format, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { resolveScope, type FinancialScope } from "@/components/financials/scope";

interface OccupancyPoint {
  month: string;
  occupancy: number;
  bookedNights: number;
  totalNights: number;
}

interface Props {
  scope: FinancialScope;
}

/**
 * Occupancy trend for host or admin.
 *
 * Calculates nights booked vs nights available per month across the selected
 * period. Supports per-property drill-down and switching between 6-month and
 * 12-month views.
 */
const OccupancyTrend = ({ scope }: Props) => {
  const [period, setPeriod] = useState<"6m" | "12m">("12m");
  const [propertyId, setPropertyId] = useState<string>("all");
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [data, setData] = useState<OccupancyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, propertyId, scope]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { propertyIds, properties: scopedProperties } = await resolveScope(scope);
      setProperties(scopedProperties);

      if (propertyIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const monthsBack = period === "6m" ? 6 : 12;
      const now = new Date();
      const startDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - monthsBack, 1));
      const endDate = endOfMonth(now);

      const months = eachMonthOfInterval({ start: startDate, end: endDate });

      // Determine the property set for the chart
      const chartPropertyIds = propertyId === "all" ? propertyIds : [propertyId];
      const propertyCount = chartPropertyIds.length;

      const { data: bookings } = await supabase
        .from("bookings")
        .select("property_id, check_in_date, check_out_date")
        .in("property_id", chartPropertyIds)
        .in("status", ["confirmed", "completed"])
        .gte("check_out_date", format(startDate, "yyyy-MM-dd"))
        .lte("check_in_date", format(endDate, "yyyy-MM-dd"));

      const occupancyData: OccupancyPoint[] = months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
        const totalNights = daysInMonth * propertyCount;

        let bookedNights = 0;
        for (const b of bookings || []) {
          const checkIn = new Date(b.check_in_date);
          const checkOut = new Date(b.check_out_date);
          const overlapStart = checkIn > monthStart ? checkIn : monthStart;
          const overlapEnd = checkOut < monthEnd ? checkOut : monthEnd;
          const overlap = differenceInCalendarDays(overlapEnd, overlapStart);
          if (overlap > 0) bookedNights += overlap;
        }

        const occupancy = totalNights > 0 ? Math.round((bookedNights / totalNights) * 100) : 0;

        return {
          month: format(monthStart, "MMM yy"),
          occupancy: Math.min(occupancy, 100),
          bookedNights,
          totalNights,
        };
      });

      setData(occupancyData);
    } catch {
      // Empty chart shown
    } finally {
      setLoading(false);
    }
  };

  const avgOccupancy = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.occupancy, 0) / data.length)
    : 0;

  const recentAvg = data.length >= 3
    ? Math.round(data.slice(-3).reduce((s, d) => s + d.occupancy, 0) / 3)
    : avgOccupancy;

  const trend = recentAvg - avgOccupancy;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : BarChart3;
  const trendColor = trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Occupancy Trend</h3>
          <p className="text-sm text-muted-foreground">
            Average: {avgOccupancy}%
            {data.length >= 3 && (
              <span className={`ml-2 inline-flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                Last 3 months: {recentAvg}%
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All properties" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as "6m" | "12m")}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6 months</SelectItem>
              <SelectItem value="12m">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Occupancy %</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : data.length === 0 || data.every((d) => d.totalNights === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No occupancy data yet. Confirmed bookings will appear here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}% (${props.payload.bookedNights} / ${props.payload.totalNights} nights)`,
                    "Occupancy",
                  ]}
                />
                <ReferenceLine y={60} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Target 60%", fontSize: 10, fill: "#10b981" }} />
                <Line type="monotone" dataKey="occupancy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OccupancyTrend;
