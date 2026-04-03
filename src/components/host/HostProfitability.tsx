// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getExpenses } from "@/services/expenseService";

interface PropertyProfit {
  id: string;
  title: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  bookings: number;
}

const HostProfitability = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<PropertyProfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get host's profile
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (!profile) return;

      // Get host's properties + their bookings + expenses in parallel
      const [{ data: properties }, { data: bookings }, expenses] = await Promise.all([
        supabase.from("properties").select("id, title").eq("host_id", profile.id),
        supabase
          .from("bookings")
          .select("property_id, total_amount, properties!inner(host_id)")
          .eq("properties.host_id", profile.id)
          .in("status", ["confirmed", "completed"])
          .gte("created_at", `${year}-01-01`)
          .lte("created_at", `${year}-12-31`),
        getExpenses({ year }),
      ]);

      const profitData: PropertyProfit[] = (properties || []).map((prop) => {
        const propBookings = (bookings || []).filter((b) => b.property_id === prop.id);
        const revenue = propBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
        const propExpenses = expenses.filter((e) => e.property_id === prop.id);
        const totalExpenses = propExpenses.reduce((sum, e) => sum + e.amount, 0);
        const profit = revenue - totalExpenses;

        return {
          id: prop.id,
          title: prop.title,
          revenue,
          expenses: totalExpenses,
          profit,
          margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
          bookings: propBookings.length,
        };
      });

      setData(profitData.sort((a, b) => b.profit - a.profit));
    } catch {
      // Empty state shown
    } finally {
      setLoading(false);
    }
  };

  const fmt = (amount: number) => (amount / 100).toLocaleString("sv-SE");
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const overallMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  const MarginIcon = ({ margin }: { margin: number }) => {
    if (margin >= 50) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (margin >= 0) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Profitability</h3>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-bold text-green-600">{fmt(totalRevenue)} kr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold text-red-600">{fmt(totalExpenses)} kr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Net Profit</p>
            <p className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmt(totalProfit)} kr
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Margin</p>
            <div className="flex items-center justify-center gap-1">
              <MarginIcon margin={overallMargin} />
              <p className={`text-lg font-bold ${overallMargin >= 50 ? "text-green-600" : overallMargin >= 0 ? "text-yellow-600" : "text-red-600"}`}>
                {overallMargin}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Chart */}
      {data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net Profit by Property</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.map((d) => ({ name: d.title, profit: Math.round(d.profit / 100) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString("sv-SE")} SEK`} />
                <Bar dataKey="profit" name="Net Profit">
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.profit >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <p className="font-medium">No data yet</p>
                    <p className="text-sm mt-1">Add expenses and receive bookings to see your profitability.</p>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-right text-green-700">{fmt(d.revenue)} kr</TableCell>
                    <TableCell className="text-right text-red-600">{fmt(d.expenses)} kr</TableCell>
                    <TableCell className={`text-right font-semibold ${d.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {fmt(d.profit)} kr
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={d.margin >= 50 ? "text-green-700" : d.margin >= 0 ? "text-yellow-700" : "text-red-700"}>
                        {d.margin}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{d.bookings}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostProfitability;
