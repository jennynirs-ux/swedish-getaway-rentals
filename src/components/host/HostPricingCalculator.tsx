import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { usePricingRules } from "@/hooks/usePricingRules";
import { Calculator } from "lucide-react";
import { HOST_PAYOUT_TIMING_TEXT } from "@/lib/constants";
import {
  applicableStayDiscount,
  extraGuestCount,
  serviceFeeAmount,
  stayDiscountAmount,
} from "../../../supabase/functions/_shared/booking-price";

interface HostPricingCalculatorProps {
  propertyId: string;
  /** Nightly price in SEK */
  basePrice: number;
  currency: string;
}

const clampInt = (raw: string, min: number, max: number) => Math.min(max, Math.max(min, parseInt(raw, 10) || min));

/**
 * What a stay costs the guest and what the host receives, worked out like
 * the booking form and the payment function do (the same shared helpers):
 * pricing rules in öre, guests beyond those the price covers, cleaning once, the
 * weekly/monthly discount on the nights only, and this listing's real guest
 * service fee (5 % during the founding-host offer).
 */
export const HostPricingCalculator = ({ propertyId, basePrice, currency }: HostPricingCalculatorProps) => {
  // Raw text, so a field can be cleared while typing
  const [guestsText, setGuestsText] = useState("2");
  const [nightsText, setNightsText] = useState("3");
  const { calculatePrice, rules } = usePricingRules(propertyId);
  const [feeRate, setFeeRate] = useState<number | null>(null);
  const [discounts, setDiscounts] = useState({ weekly: 0, monthly: 0 });

  useEffect(() => {
    supabase.rpc("property_service_fee_rate", { _property_id: propertyId }).then(({ data, error }) => {
      setFeeRate(error || data == null ? null : Number(data));
    });
    supabase
      .from("properties")
      .select("weekly_discount_percentage, monthly_discount_percentage")
      .eq("id", propertyId)
      .single()
      .then(({ data }) => {
        setDiscounts({
          weekly: Number(data?.weekly_discount_percentage) || 0,
          monthly: Number(data?.monthly_discount_percentage) || 0,
        });
      });
  }, [propertyId]);

  const nights = clampInt(nightsText, 1, 365);
  const guests = clampInt(guestsText, 1, 50);
  // Any dates: the calculator uses the base price, not per-night special prices
  const checkIn = new Date(2026, 0, 5);
  const checkOut = new Date(2026, 0, 5 + nights);
  const calc = calculatePrice(Math.round((basePrice || 0) * 100), checkIn, checkOut, guests);
  const discount = applicableStayDiscount(nights, discounts.weekly, discounts.monthly);
  const stayDiscount = stayDiscountAmount(calc.breakdown.accommodation, discount);
  const hostTotal = Math.max(0, calc.total - calc.breakdown.services - stayDiscount);
  const rate = feeRate ?? 10;
  const serviceFee = serviceFeeAmount(hostTotal, rate);
  const guestPays = hostTotal + serviceFee;

  const money = (ore: number) => `${Math.round(ore / 100).toLocaleString("sv-SE")} ${currency}`;
  const nightsLabel = `${nights} night${nights > 1 ? "s" : ""}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Price Calculator
        </CardTitle>
        <CardDescription>
          See what guests pay and what you receive for a stay at your base price
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="calc-guests">Number of Guests</Label>
            <Input
              id="calc-guests"
              type="number"
              inputMode="numeric"
              min="1"
              value={guestsText}
              onChange={(e) => setGuestsText(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="calc-nights">Number of Nights</Label>
            <Input
              id="calc-nights"
              type="number"
              inputMode="numeric"
              min="1"
              value={nightsText}
              onChange={(e) => setNightsText(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex justify-between gap-4 text-sm">
            <span>Your price ({nightsLabel})</span>
            <span>{money(calc.breakdown.accommodation)}</span>
          </div>

          {calc.breakdown.extraGuests > 0 && (
            <div className="flex justify-between gap-4 text-sm text-muted-foreground">
              <span>Extra guests ({extraGuestCount(guests, rules.find((r) => r.rule_type === "extra_guest")?.guests_included)})</span>
              <span>{money(calc.breakdown.extraGuests)}</span>
            </div>
          )}

          {calc.breakdown.cleaning > 0 && (
            <div className="flex justify-between gap-4 text-sm text-muted-foreground">
              <span>Cleaning</span>
              <span>{money(calc.breakdown.cleaning)}</span>
            </div>
          )}

          {stayDiscount > 0 && discount && (
            <div className="flex justify-between gap-4 text-sm text-muted-foreground">
              <span>
                {discount.type === "monthly" ? "Monthly" : "Weekly"} discount ({discount.percentage}%)
              </span>
              <span>−{money(stayDiscount)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between gap-4 text-lg font-bold text-green-600">
            <span>You receive</span>
            <span>{money(hostTotal)}</span>
          </div>

          <div className="flex justify-between gap-4 text-sm text-muted-foreground">
            <span>Guest service fee ({rate}%)</span>
            <span>+{money(serviceFee)}</span>
          </div>

          <div className="flex justify-between gap-4 font-medium">
            <span>Guest pays</span>
            <span>{money(guestPays)}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            Guests pay {rate}% on top; you receive your price in full. It is paid out to your bank{" "}
            {HOST_PAYOUT_TIMING_TEXT}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
