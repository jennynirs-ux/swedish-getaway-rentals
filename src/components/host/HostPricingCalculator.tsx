import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Calculator } from "lucide-react";

interface PricingRule {
  id: string;
  rule_type: string;
  name: string;
  price: number;
  is_per_night: boolean;
  is_active: boolean;
}

interface HostPricingCalculatorProps {
  propertyId: string;
  basePrice: number;
  currency: string;
}

export const HostPricingCalculator = ({ propertyId, basePrice, currency }: HostPricingCalculatorProps) => {
  const [guests, setGuests] = useState(2);
  const [nights, setNights] = useState(1);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  useEffect(() => {
    loadPricingRules();
  }, [propertyId]);

  const loadPricingRules = async () => {
    try {
      const { data, error } = await supabase
        .from("properties_pricing_rules")
        .select("*")
        .eq("property_id", propertyId)
        .eq("is_active", true);

      if (error) throw error;
      setPricingRules(data || []);
    } catch (error) {
      console.error("Error loading pricing rules:", error);
    }
  };

  const calculateSubtotal = () => {
    let subtotal = basePrice * nights;

    pricingRules.forEach((rule) => {
      if (rule.is_per_night) {
        subtotal += rule.price * nights;
      } else {
        subtotal += rule.price;
      }
    });

    return subtotal;
  };

  const subtotal = calculateSubtotal();
  const platformFee = Math.round(subtotal * 0.1); // 10% platform fee
  const guestPays = subtotal + platformFee;
  const hostEarns = subtotal;
  const commissionRate = 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Price Calculator
        </CardTitle>
        <CardDescription>
          Calculate what guests pay and what you earn
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="guests">Number of Guests</Label>
            <Input
              id="guests"
              type="number"
              min="1"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nights">Number of Nights</Label>
            <Input
              id="nights"
              type="number"
              min="1"
              value={nights}
              onChange={(e) => setNights(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Base Price ({nights} night{nights > 1 ? 's' : ''})</span>
            <span>{(basePrice * nights).toLocaleString()} {currency}</span>
          </div>

          {pricingRules.map((rule) => (
            <div key={rule.id} className="flex justify-between text-sm text-muted-foreground">
              <span>
                {rule.name} {rule.is_per_night && `(${nights} night${nights > 1 ? 's' : ''})`}
              </span>
              <span>
                {rule.is_per_night
                  ? (rule.price * nights).toLocaleString()
                  : rule.price.toLocaleString()}{' '}
                {currency}
              </span>
            </div>
          ))}

          <Separator />

          <div className="flex justify-between font-medium">
            <span>Subtotal</span>
            <span>{subtotal.toLocaleString()} {currency}</span>
          </div>

          <div className="flex justify-between text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <span>Platform Fee ({commissionRate}%)</span>
            <span>+{platformFee.toLocaleString()} {currency}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-lg font-bold text-primary">
            <span>Guest Pays</span>
            <span>{guestPays.toLocaleString()} {currency}</span>
          </div>

          <div className="flex justify-between text-lg font-bold text-green-600">
            <span>You Earn</span>
            <span>{hostEarns.toLocaleString()} {currency}</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            The platform fee is automatically deducted from the total amount. You receive {hostEarns.toLocaleString()} {currency} per booking.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
