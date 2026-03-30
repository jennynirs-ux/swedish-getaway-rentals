// @ts-nocheck
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

interface PricingCalculatorProps {
  basePrice: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
  currency?: string;
}

export const PricingCalculator = ({ 
  basePrice, 
  weeklyDiscount, 
  monthlyDiscount,
  currency = "SEK" 
}: PricingCalculatorProps) => {
  const [nights, setNights] = useState(1);
  const platformFeePercentage = 10;

  const calculatePrice = (numNights: number) => {
    let discount = 0;
    if (numNights >= 30 && monthlyDiscount > 0) {
      discount = monthlyDiscount;
    } else if (numNights >= 7 && weeklyDiscount > 0) {
      discount = weeklyDiscount;
    }

    const subtotal = basePrice * numNights;
    const discountAmount = (subtotal * discount) / 100;
    const hostEarnings = subtotal - discountAmount;
    const platformFee = (hostEarnings * platformFeePercentage) / 100;
    const guestPays = hostEarnings + platformFee;

    return {
      subtotal,
      discount,
      discountAmount,
      hostEarnings,
      platformFee,
      guestPays
    };
  };

  const pricing = calculatePrice(nights);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Price Calculator</CardTitle>
        </div>
        <CardDescription>
          See how discounts and platform fees affect your earnings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="calc-nights">Number of Nights</Label>
          <Input
            id="calc-nights"
            type="number"
            min="1"
            value={nights}
            onChange={(e) => setNights(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base Price × {nights} nights</span>
            <span className="font-medium">{pricing.subtotal.toLocaleString()} {currency}</span>
          </div>

          {pricing.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                {nights >= 30 ? "Monthly" : "Weekly"} Discount ({pricing.discount}%)
              </span>
              <span>-{pricing.discountAmount.toLocaleString()} {currency}</span>
            </div>
          )}

          <div className="flex justify-between text-sm border-t pt-2">
            <span className="font-medium">Your Earnings</span>
            <span className="font-semibold text-lg">{pricing.hostEarnings.toLocaleString()} {currency}</span>
          </div>

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Platform Fee ({platformFeePercentage}%)</span>
            <span>+{pricing.platformFee.toLocaleString()} {currency}</span>
          </div>

          <div className="flex justify-between text-base border-t pt-2">
            <span className="font-semibold">Guest Pays</span>
            <span className="font-bold text-primary">{pricing.guestPays.toLocaleString()} {currency}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
