// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const SOURCE_COLORS: Record<string, string> = {
  airbnb: "#f43f5e",
  booking_com: "#3b82f6",
  direct: "#22c55e",
  blocked: "#9ca3af",
};

const SOURCE_LABELS: Record<string, string> = {
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  direct: "Direct",
  blocked: "Blocked",
};

const HostRevenueByChannel = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get host's profile to scope to their properties
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (!profile) return;

      // Get host's properties
      const { data: hostProperties } = await supabase
        .from("properties")
        .select("id")
        .eq("host_id", profile.id);

      const propertyIds = (hostProperties || []).map((p) => p.id);
      if (propertyIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch bookings for host's properties only
      const { data: bookings } = await supabase
        .from("bookings")
        .select("source, total_amount, created_at, property_id")
        .in("property_id", propertyIds)
        .in("status", ["confirmed", "completed"])
        .gte("created_at", `${year}-01-01`)
        .lte("created_at", `${year}-12-31`);

      if (!bookings) return;

      // Pie chart: total by source
      const bySource: Record<string, number> = {};
      for (const b of bookings) {
        const src = b.source || "direct";
        bySource[src] = (bySource[src] || 0) + (b.total_amount || 0);
      }

      setPieData(
        Object.entries(bySource)
          .filter(([_, v]) => v > 0)
          .map(([source, value]) => ({
            name: SOURCE_LABELS[source] || source,
            value: Math.round(value / 100),
            color: SOURCE_COLORS[source] || "#9ca3af",
          }))
      );

      // Bar chart: monthly by source
      const monthly: Record<string, Record<string, number>> = {};
      for (let m = 0; m < 12; m++) {
        const key = `${year}-${String(m + 1).padStart(2, "0")}`;
        monthly[key] = { airbnb: 0, booking_com: 0, direct: 0 };
      }

      for (const b of bookings) {
        const month = (b.created_at || "").substring(0, 7);
        const src = b.source || "direct";
        if (monthly[month] && src !== "blocked") {
          monthly[month][src] = (monthly[month][src] || 0) + Math.round((b.total_amount || 0) / 100);
        }
      }

      setMonthlyData(
        Object.entries(monthly).map(([month, sources]) => ({
          month: month.substring(5),
          ...sources,
        }))
      );
    } catch {
      // Empty charts shown
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Revenue by Channel</h3>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Channel Split ({totalRevenue.toLocaleString("sv-SE")} SEK total)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No revenue data yet. Bookings will appear here once confirmed.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("sv-SE")} SEK`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Stacked Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Revenue by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("sv-SE")} SEK`} />
                  <Legend />
                  <Bar dataKey="airbnb" name="Airbnb" fill={SOURCE_COLORS.airbnb} stackId="a" />
                  <Bar dataKey="booking_com" name="Booking.com" fill={SOURCE_COLORS.booking_com} stackId="a" />
                  <Bar dataKey="direct" name="Direct" fill={SOURCE_COLORS.direct} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HostRevenueByChannel;
