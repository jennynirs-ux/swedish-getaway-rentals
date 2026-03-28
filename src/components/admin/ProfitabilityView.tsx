import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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

const ProfitabilityView = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<PropertyProfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: properties }, { data: bookings }, expenses] = await Promise.all([
        supabase.from("properties").select("id, title").eq("active", true),
        supabase
          .from("bookings")
          .select("property_id, total_amount")
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
  const totalProfit = data.reduce((s, d) => s + d.profit, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Profitability by Property</h3>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-xl font-bold text-green-600">{fmt(totalRevenue)} kr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Expenses</p>
            <p className="text-xl font-bold text-red-600">{fmt(totalExpenses)} kr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Net Profit</p>
            <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmt(totalProfit)} kr
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="pt-4">
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

      {/* Table */}
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
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
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

export default ProfitabilityView;
