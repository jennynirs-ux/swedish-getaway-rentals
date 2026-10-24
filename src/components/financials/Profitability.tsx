import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getExpenses } from "@/services/expenseService";
import type { FinancialScope, ResolvedScope } from "./scope";
import { oreToSek } from "@/lib/swedishTax";
import { INCOME_STATUSES, NORDIC_GETAWAYS_ONLY_LABEL, STAY_BASIS_LABEL, summarizeIncome, yearBounds } from "./reporting";
import { YearSelect } from "./YearSelect";
import { useFinancialYears } from "./useFinancialYears";

interface PropertyProfit {
  id: string;
  title: string;
  revenue: number;
  /** Part of revenue the host kept from cancelled bookings */
  cancellationIncome: number;
  /** Expenses plus what the host owes us for the year's bookings (host_charges) */
  expenses: number;
  /** Part of expenses that is host_charges, e.g. the card fee when the host cancelled */
  hostCharges: number;
  profit: number;
  margin: number;
  bookings: number;
}

interface Props {
  scope: FinancialScope;
  /** Show the 4-card summary (host view); admin view uses 3-card summary. */
  showMarginCard?: boolean;
}

/**
 * Per-property revenue, expenses and profit for a year. Revenue is what the
 * host keeps (stays plus cancellations, by check-in date); expenses are the
 * host's own (by expense date) plus what they owe us for that year's bookings
 * (host_charges, e.g. the card fee when the host cancelled).
 */
async function loadProfitability({ propertyIds, properties }: ResolvedScope, year: number): Promise<PropertyProfit[]> {
  if (propertyIds.length === 0) return [];

  const { from, to } = yearBounds(year);
  const [{ data: bookings, error }, expenses] = await Promise.all([
    supabase
      .from("bookings_secure")
      .select(
        "id, property_id, status, total_amount, host_amount, service_fee, refunded_amount, host_reversed_amount, stripe_payment_intent_id, check_in_date, check_out_date"
      )
      .in("property_id", propertyIds)
      .in("status", INCOME_STATUSES)
      .gte("check_in_date", from)
      .lte("check_in_date", to),
    getExpenses({ year }),
  ]);
  if (error) throw error;
  const rows = bookings || [];

  // Host charges only arise when the host cancels, so only cancelled bookings can carry one
  const propertyOfBooking = new Map<string, string>();
  for (const b of rows) {
    if (b.status === "cancelled" && b.id && b.property_id) propertyOfBooking.set(b.id, b.property_id);
  }
  const chargesByProperty: Record<string, number> = {};
  if (propertyOfBooking.size > 0) {
    const { data: charges, error: chargesError } = await supabase
      .from("host_charges")
      .select("booking_id, amount")
      .in("booking_id", [...propertyOfBooking.keys()]);
    if (chargesError) throw chargesError;
    for (const c of charges || []) {
      const propertyId = c.booking_id ? propertyOfBooking.get(c.booking_id) : undefined;
      if (propertyId) chargesByProperty[propertyId] = (chargesByProperty[propertyId] || 0) + (c.amount || 0);
    }
  }

  return properties
    .map((prop) => {
      const income = summarizeIncome(rows.filter((b) => b.property_id === prop.id));
      const revenue = income.incomeOre;
      const hostCharges = chargesByProperty[prop.id] || 0;
      const totalExpenses =
        expenses.filter((e) => e.property_id === prop.id).reduce((sum, e) => sum + e.amount, 0) + hostCharges;
      const profit = revenue - totalExpenses;
      return {
        id: prop.id,
        title: prop.title,
        revenue,
        cancellationIncome: income.cancellationIncomeOre,
        expenses: totalExpenses,
        hostCharges,
        profit,
        margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
        bookings: income.stays,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

/**
 * Shared profitability view for host and admin.
 *
 * Shows per-property revenue vs expenses vs net profit with margin %.
 * Revenue is what the host keeps (host share less refunds taken back from
 * them), including what they kept from cancelled bookings; the booking count
 * is real stays only. Bookings are counted by check-in date, expenses by
 * expense date; host charges (e.g. the card fee when the host cancelled) count
 * as expenses of the booking's year. Data access is scoped via the
 * `resolveScope()` helper, resolved once by useFinancialYears.
 */
const Profitability = ({ scope, showMarginCard = true }: Props) => {
  const { year, setYear, years, scope: resolved } = useFinancialYears(scope);
  const [data, setData] = useState<PropertyProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!resolved) return;
    // Drop the answer if the year or scope changed while it was loading
    let stale = false;
    setLoading(true);
    setFailed(false);
    loadProfitability(resolved, year)
      .then((rows) => {
        if (!stale) setData(rows);
      })
      .catch(() => {
        if (stale) return;
        setData([]);
        setFailed(true);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [year, resolved]);

  const fmt = (amountOre: number) => oreToSek(amountOre).toLocaleString("sv-SE");
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalCancellationIncome = data.reduce((s, d) => s + d.cancellationIncome, 0);
  const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
  const totalHostCharges = data.reduce((s, d) => s + d.hostCharges, 0);
  const totalProfit = totalRevenue - totalExpenses;
  const overallMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  const MarginIcon = ({ margin }: { margin: number }) => {
    if (margin >= 50) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (margin >= 0) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  const summaryGridCols = showMarginCard ? "md:grid-cols-4" : "md:grid-cols-3";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Lönsamhet</h3>
          <p className="text-xs text-muted-foreground">
            {NORDIC_GETAWAYS_ONLY_LABEL}. Bokningar {STAY_BASIS_LABEL.toLowerCase()}, utgifter efter utgiftsdatum.
          </p>
        </div>
        <YearSelect years={years} value={year} onChange={setYear} />
      </div>

      <div className={`grid grid-cols-2 ${summaryGridCols} gap-4`}>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Totala intäkter</p>
            <p className="text-lg font-bold text-green-600">{fmt(totalRevenue)} kr</p>
            {totalCancellationIncome > 0 && (
              <p className="text-xs text-muted-foreground">varav {fmt(totalCancellationIncome)} kr från avbokningar</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Totala utgifter</p>
            <p className="text-lg font-bold text-red-600">{fmt(totalExpenses)} kr</p>
            {totalHostCharges > 0 && (
              <p className="text-xs text-muted-foreground">varav {fmt(totalHostCharges)} kr i kortavgifter när värden avbokat</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Vinst</p>
            <p className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {fmt(totalProfit)} kr
            </p>
          </CardContent>
        </Card>
        {showMarginCard && (
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Marginal</p>
              <div className="flex items-center justify-center gap-1">
                <MarginIcon margin={overallMargin} />
                <p className={`text-lg font-bold ${overallMargin >= 50 ? "text-green-600" : overallMargin >= 0 ? "text-yellow-600" : "text-red-600"}`}>
                  {overallMargin} %
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {data.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vinst per boende</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.map((d) => ({ name: d.title, profit: Math.round(oreToSek(d.profit)) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString("sv-SE")} kr`} />
                <Bar dataKey="profit" name="Vinst">
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.profit >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Boende</TableHead>
                <TableHead className="text-right">Intäkter</TableHead>
                <TableHead className="text-right">Utgifter</TableHead>
                <TableHead className="text-right">Vinst</TableHead>
                <TableHead className="text-right">Marginal</TableHead>
                <TableHead className="text-right">Vistelser</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Laddar...</TableCell></TableRow>
              ) : failed ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <p className="font-medium">Det gick inte att ladda {year}</p>
                    <p className="text-sm mt-1">Ladda om sidan eller försök igen senare.</p>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <p className="font-medium">Inget att visa än</p>
                    <p className="text-sm mt-1">Lägg till utgifter och ta emot bokningar så ser du din lönsamhet här.</p>
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
                        {d.margin} %
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

export default Profitability;
