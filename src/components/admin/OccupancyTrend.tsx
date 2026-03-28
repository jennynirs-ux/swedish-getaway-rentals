import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarDays, format, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

interface OccupancyPoint {
  month: string;
  occupancy: number;
  bookedNights: number;
  totalNights: number;
}

const OccupancyTrend = () => {
  const [period, setPeriod] = useState<"6m" | "12m">("12m");
  const [propertyId, setPropertyId] = useState<string>("all");
  const [properties, setProperties] = useState<{ id: string; title: string }[]>([]);
  const [data, setData] = useState<OccupancyPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    loadData();
  }, [period, propertyId]);

  const loadProperties = async () => {
    const { data } = await supabase.from("properties").select("id, title").eq("active", true);
    setProperties(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const monthsBack = period === "6m" ? 6 : 12;
      const now = new Date();
      const startDate = startOfMonth(new Date(now.getFullYear(), now.getMonth() - monthsBack, 1));
      const endDate = endOfMonth(now);

      const months = eachMonthOfInterval({ start: startDate, end: endDate });

      let bookingsQuery = supabase
        .from("bookings")
        .select("property_id, check_in_date, check_out_date")
        .in("status", ["confirmed", "completed"])
        .gte("check_out_date", format(startDate, "yyyy-MM-dd"))
        .lte("check_in_date", format(endDate, "yyyy-MM-dd"));

      if (propertyId !== "all") {
        bookingsQuery = bookingsQuery.eq("property_id", propertyId);
      }

      const [{ data: bookings }, { data: activeProperties }] = await Promise.all([
        bookingsQuery,
        propertyId !== "all"
          ? supabase.from("properties").select("id").eq("id", propertyId)
          : supabase.from("properties").select("id").eq("active", true),
      ]);

      const propertyCount = activeProperties?.length || 1;

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold">Occupancy Trend</h3>
          <p className="text-sm text-muted-foreground">Average: {avgOccupancy}%</p>
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
        <CardContent className="pt-4">
          {loading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "occupancy" ? `${value}%` : value,
                    name === "occupancy" ? "Occupancy" : name,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OccupancyTrend;
