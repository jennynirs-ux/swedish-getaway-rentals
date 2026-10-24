import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { FinancialScope, ResolvedScope } from "./scope";
import { oreToSek } from "@/lib/swedishTax";
import { INCOME_STATUSES, NORDIC_GETAWAYS_ONLY_LABEL, STAY_BASIS_LABEL, hostNetAmount, yearBounds } from "./reporting";
import { YearSelect } from "./YearSelect";
import { useFinancialYears } from "./useFinancialYears";

/** Every value bookings.source can hold (bookings_source_check) */
const SOURCE_COLORS: Record<string, string> = {
  direct: "#22c55e",
  manual: "#a855f7",
  airbnb: "#f43f5e",
  booking_com: "#3b82f6",
  vrbo: "#0ea5e9",
  landfolk: "#f59e0b",
  ical: "#64748b",
  other: "#9ca3af",
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direkt",
  manual: "Manuell",
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  vrbo: "Vrbo",
  landfolk: "Landfolk",
  ical: "Kalenderimport",
  other: "Övrigt",
};

const sourceLabel = (source: string) => SOURCE_LABELS[source] || source;
const sourceColor = (source: string) => SOURCE_COLORS[source] || SOURCE_COLORS.other;

interface ChannelData {
  /** Sources with income, largest first */
  sources: string[];
  pie: { name: string; value: number; color: string }[];
  /** One row per month: { month: "01", [source]: kronor } */
  monthly: Record<string, string | number>[];
}

const EMPTY: ChannelData = { sources: [], pie: [], monthly: [] };

/** Host income per channel and check-in month (öre summed first, kronor at the end, so both charts agree) */
async function loadChannels({ propertyIds }: ResolvedScope, year: number): Promise<ChannelData> {
  if (propertyIds.length === 0) return EMPTY;

  const { from, to } = yearBounds(year);
  const { data, error } = await supabase
    .from("bookings_secure")
    .select(
      "source, status, total_amount, host_amount, service_fee, refunded_amount, host_reversed_amount, stripe_payment_intent_id, check_in_date, property_id"
    )
    .in("property_id", propertyIds)
    .in("status", INCOME_STATUSES)
    .gte("check_in_date", from)
    .lte("check_in_date", to);
  if (error) throw error;

  const bySource: Record<string, number> = {};
  const byMonth: Record<string, Record<string, number>> = {};
  for (const b of data || []) {
    const src = b.source || "direct";
    const month = (b.check_in_date || "").slice(5, 7);
    const net = hostNetAmount(b);
    // Blocked dates are not bookings and carry no income
    if (src === "blocked" || net <= 0 || !month) continue;
    bySource[src] = (bySource[src] || 0) + net;
    byMonth[month] = byMonth[month] || {};
    byMonth[month][src] = (byMonth[month][src] || 0) + net;
  }

  const sources = Object.keys(bySource).sort((a, b) => bySource[b] - bySource[a]);
  return {
    sources,
    pie: sources.map((src) => ({ name: sourceLabel(src), value: Math.round(oreToSek(bySource[src])), color: sourceColor(src) })),
    monthly: Array.from({ length: 12 }, (_, m) => {
      const month = String(m + 1).padStart(2, "0");
      const row: Record<string, string | number> = { month };
      for (const src of sources) row[src] = Math.round(oreToSek(byMonth[month]?.[src] || 0));
      return row;
    }),
  };
}

interface Props {
  scope: FinancialScope;
}

/**
 * The host's income per booking channel and month. Income is what the host
 * keeps (including from cancelled bookings), counted in the check-in month.
 * Only bookings made through Nordic Getaways exist here: Airbnb and
 * Booking.com reach us as blocked dates without prices, which the labels say.
 * The charts show only the channels that have income.
 */
const RevenueByChannel = ({ scope }: Props) => {
  const { year, setYear, years, scope: resolved } = useFinancialYears(scope);
  const [channels, setChannels] = useState<ChannelData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolved) return;
    // Drop the answer if the year or scope changed while it was loading
    let stale = false;
    setLoading(true);
    loadChannels(resolved, year)
      .then((result) => {
        if (!stale) setChannels(result);
      })
      .catch(() => {
        if (!stale) setChannels(EMPTY); // Empty charts shown
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [year, resolved]);

  const { pie: pieData, monthly: monthlyData, sources } = channels;
  const totalRevenue = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Intäkter per kanal</h3>
          <p className="text-xs text-muted-foreground">
            {NORDIC_GETAWAYS_ONLY_LABEL}: inkomst från Airbnb, Booking.com och andra kanaler ingår inte.{" "}
            {STAY_BASIS_LABEL}.
          </p>
        </div>
        <YearSelect years={years} value={year} onChange={setYear} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Fördelning per kanal (totalt {totalRevenue.toLocaleString("sv-SE")} kr)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Laddar...</p>
            ) : pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inga intäkter att visa än. Bokningar dyker upp här när de är bekräftade.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)} %`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("sv-SE")} kr`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Intäkter per incheckningsmånad</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Laddar...</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString("sv-SE")} kr`} />
                  <Legend />
                  {sources.map((src) => (
                    <Bar key={src} dataKey={src} name={sourceLabel(src)} fill={sourceColor(src)} stackId="a" />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueByChannel;
