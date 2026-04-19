// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Info, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { oreToSek } from "@/lib/swedishTax";
import { differenceInCalendarDays } from "date-fns";

interface PropertyPricing {
  id: string;
  title: string;
  basePrice: number; // SEK per night
  avgBookedRate: number; // SEK, computed from bookings
  marketMedian: number; // SEK, computed from similar properties
  suggestion: "raise" | "lower" | "on_target";
  suggestedPrice: number;
  marginToMarket: number; // %
  bookingCount: number;
}

/**
 * Smart pricing suggestions for the host.
 *
 * Compares each property against:
 *  1. Its own average booked rate (what guests actually paid per night)
 *  2. Market median — the median nightly price of other active properties
 *     with the same property_type and similar max_guests (+-1)
 *
 * Suggests raising or lowering the base price based on these signals.
 * Not a guarantee — just a signal to help the host make decisions.
 */
const HostPricingSuggestions = () => {
  const [data, setData] = useState<PropertyPricing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();
      if (!profile) return;

      // 1) Host's properties
      const { data: myProperties } = await supabase
        .from("properties")
        .select("id, title, price_per_night, property_type, max_guests")
        .eq("host_id", profile.id);

      if (!myProperties || myProperties.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const propertyIds = myProperties.map((p) => p.id);

      // 2) All recent bookings for this host's properties (for own avg rate)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("property_id, total_amount, check_in_date, check_out_date")
        .in("property_id", propertyIds)
        .in("status", ["confirmed", "completed"])
        .gte("check_in_date", oneYearAgo.toISOString().slice(0, 10));

      // 3) Market data: all active properties (RLS permits SELECT for browse)
      const { data: marketProperties } = await supabase
        .from("properties")
        .select("id, price_per_night, property_type, max_guests")
        .eq("active", true);

      const pricingData: PropertyPricing[] = myProperties.map((prop) => {
        // Own avg booked rate
        const propBookings = (bookings || []).filter((b) => b.property_id === prop.id);
        let totalNights = 0;
        let totalRevenue = 0;
        for (const b of propBookings) {
          const nights = Math.max(
            1,
            differenceInCalendarDays(new Date(b.check_out_date), new Date(b.check_in_date)),
          );
          totalNights += nights;
          totalRevenue += b.total_amount || 0;
        }
        const avgBookedRate =
          totalNights > 0 ? oreToSek(Math.round(totalRevenue / totalNights)) : 0;

        // Market median: same property_type, similar capacity (+/- 1)
        const peers = (marketProperties || []).filter(
          (m) =>
            m.id !== prop.id &&
            m.property_type === prop.property_type &&
            Math.abs((m.max_guests || 0) - (prop.max_guests || 0)) <= 1 &&
            m.price_per_night > 0,
        );

        const peerPrices = peers.map((p) => p.price_per_night).sort((a, b) => a - b);
        const marketMedian =
          peerPrices.length > 0 ? peerPrices[Math.floor(peerPrices.length / 2)] : 0;

        const basePrice = prop.price_per_night || 0;
        const marginToMarket = marketMedian > 0 ? Math.round(((basePrice - marketMedian) / marketMedian) * 100) : 0;

        // Suggestion logic:
        // - If avg booked rate is notably higher than base, suggest raising
        // - If base is >20% below market median, suggest raising toward median
        // - If base is >20% above market median and low booking count, suggest lowering
        let suggestion: "raise" | "lower" | "on_target" = "on_target";
        let suggestedPrice = basePrice;

        if (avgBookedRate > basePrice * 1.08 && propBookings.length >= 3) {
          suggestion = "raise";
          suggestedPrice = Math.round(avgBookedRate * 0.95); // conservative
        } else if (marketMedian > 0 && marginToMarket < -15 && basePrice > 0) {
          suggestion = "raise";
          suggestedPrice = Math.round((basePrice + marketMedian) / 2);
        } else if (marketMedian > 0 && marginToMarket > 25 && propBookings.length < 3) {
          suggestion = "lower";
          suggestedPrice = Math.round((basePrice + marketMedian) / 2);
        }

        return {
          id: prop.id,
          title: prop.title,
          basePrice,
          avgBookedRate,
          marketMedian,
          suggestion,
          suggestedPrice,
          marginToMarket,
          bookingCount: propBookings.length,
        };
      });

      setData(pricingData);
    } catch {
      // Leave empty on error
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number) => Math.round(v).toLocaleString("sv-SE");

  const SuggestionBadge = ({ s }: { s: "raise" | "lower" | "on_target" }) => {
    if (s === "raise") {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <TrendingUp className="h-3 w-3 mr-1" /> Raise price
        </Badge>
      );
    }
    if (s === "lower") {
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          <TrendingDown className="h-3 w-3 mr-1" /> Lower price
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Minus className="h-3 w-3 mr-1" /> On target
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" />
          Pricing Suggestions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Based on your past 12 months of bookings and similar properties on the platform.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Analyzing your prices...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties yet.</p>
        ) : (
          data.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Base: {fmt(d.basePrice)} kr/night
                    {d.bookingCount > 0 && ` · ${d.bookingCount} bookings last 12mo`}
                  </p>
                </div>
                <SuggestionBadge s={d.suggestion} />
              </div>

              {/* Signals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div className="rounded bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Your avg booked</p>
                  <p className="font-medium">
                    {d.avgBookedRate > 0 ? `${fmt(d.avgBookedRate)} kr` : "--"}
                  </p>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Market median</p>
                  <p className="font-medium">
                    {d.marketMedian > 0 ? `${fmt(d.marketMedian)} kr` : "--"}
                  </p>
                </div>
                <div className="rounded bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">vs Market</p>
                  <p
                    className={`font-medium ${
                      d.marginToMarket > 10
                        ? "text-orange-600"
                        : d.marginToMarket < -10
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {d.marketMedian > 0 ? `${d.marginToMarket > 0 ? "+" : ""}${d.marginToMarket}%` : "--"}
                  </p>
                </div>
              </div>

              {d.suggestion !== "on_target" && d.suggestedPrice !== d.basePrice && (
                <p className="text-sm pt-1 border-t">
                  <span className="text-muted-foreground">Suggested:</span>{" "}
                  <strong>{fmt(d.suggestedPrice)} kr/night</strong>{" "}
                  <span className="text-muted-foreground">
                    ({d.suggestedPrice > d.basePrice ? "+" : ""}
                    {Math.round(((d.suggestedPrice - d.basePrice) / d.basePrice) * 100)}%)
                  </span>
                </p>
              )}
            </div>
          ))
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <p>
            These are suggestions based on historical data. You can always apply seasonal pricing
            rules from the Properties tab. Market median compares against properties with the same
            type and similar capacity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HostPricingSuggestions;
