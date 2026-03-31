import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays, isSameDay } from "date-fns";
import { usePricingRules } from "@/hooks/usePricingRules";
import { cn } from "@/lib/utils";

interface PropertySpecialPricingEnhancedProps {
  propertyId: string;
  basePrice: number;
  currency: string;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
}

interface AvailabilityDate {
  date: string;
  available: boolean;
  reason: string | null;
  seasonal_price: number | null;
}

export const PropertySpecialPricingEnhanced = ({
  propertyId,
  basePrice,
  currency,
  weeklyDiscount = 0,
  monthlyDiscount = 0,
}: PropertySpecialPricingEnhancedProps) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [specialPrice, setSpecialPrice] = useState("");
  const [availability, setAvailability] = useState<AvailabilityDate[]>([]);
  const [loading, setLoading] = useState(false);
  const { calculatePrice } = usePricingRules(propertyId);

  useEffect(() => {
    loadAvailability();
  }, [propertyId]);

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("property_id", propertyId)
        .gte("date", format(new Date(), "yyyy-MM-dd"))
        .lte("date", format(addDays(new Date(), 365), "yyyy-MM-dd"));

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error("Error loading availability:", error);
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.find((a) => a.date === dateStr);
  };

  const saveSpecialPrice = async () => {
    if (selectedDates.length === 0) {
      toast({
        title: "No dates selected",
        description: "Please select at least one date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const price = parseInt(specialPrice) || null;

      for (const date of selectedDates) {
        const { error } = await supabase.from("availability").upsert(
          {
            property_id: propertyId,
            date: format(date, "yyyy-MM-dd"),
            available: true,
            seasonal_price: price,
          },
          { onConflict: "property_id,date" }
        );

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Special price set for ${selectedDates.length} date(s)`,
      });

      loadAvailability();
      setSelectedDates([]);
      setSpecialPrice("");
    } catch (error) {
      console.error("Error saving special price:", error);
      toast({
        title: "Error",
        description: "Failed to save special price",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalForSelection = () => {
    if (selectedDates.length === 0) return null;

    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const checkIn = sortedDates[0];
    const checkOut = addDays(sortedDates[sortedDates.length - 1], 1);
    const nights = differenceInDays(checkOut, checkIn);

    if (nights <= 0) return null;

    // Calculate seasonal prices
    const seasonalPrices: Record<string, number> = {};
    availability.forEach((avail) => {
      if (avail.seasonal_price) {
        seasonalPrices[avail.date] = avail.seasonal_price;
      }
    });

    const calculation = calculatePrice(
      basePrice,
      checkIn,
      checkOut,
      1, // guests
      seasonalPrices,
      []
    );

    // Apply discounts
    let totalAfterDiscount = calculation.total;
    
    if (nights >= 30 && monthlyDiscount > 0) {
      const discount = (calculation.total * monthlyDiscount) / 100;
      totalAfterDiscount -= discount;
    } else if (nights >= 7 && weeklyDiscount > 0) {
      const discount = (calculation.total * weeklyDiscount) / 100;
      totalAfterDiscount -= discount;
    }

    return {
      nights,
      subtotal: calculation.total,
      weeklyDiscount: nights >= 7 ? weeklyDiscount : 0,
      monthlyDiscount: nights >= 30 ? monthlyDiscount : 0,
      total: totalAfterDiscount,
    };
  };

  const calculation = calculateTotalForSelection();

  const isDateUnavailable = (date: Date) => {
    const avail = getDateAvailability(date);
    return avail && !avail.available;
  };

  const modifiers = {
    unavailable: availability
      .filter((a) => !a.available)
      .map((a) => new Date(a.date + "T00:00:00")),
    specialPrice: availability
      .filter((a) => a.seasonal_price)
      .map((a) => new Date(a.date + "T00:00:00")),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Special Pricing</CardTitle>
          <CardDescription>
            Select multiple dates to set special pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={(dates) => setSelectedDates(dates || [])}
            className="rounded-md border"
            disabled={isDateUnavailable}
            modifiers={modifiers}
            modifiersClassNames={{
              unavailable: "bg-destructive/20 text-destructive line-through",
              specialPrice: "bg-blue-100 text-blue-900 font-semibold",
            }}
            components={{
              DayContent: ({ date }) => {
                const avail = getDateAvailability(date);
                return (
                  <div className="flex flex-col items-center leading-none">
                    <span>{date.getDate()}</span>
                    {avail?.seasonal_price && (
                      <span className="text-[10px] mt-0.5">
                        {avail.seasonal_price}
                      </span>
                    )}
                  </div>
                );
              },
            }}
          />

          {selectedDates.length > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <Label htmlFor="special-price">
                  Special Price ({currency}/night)
                </Label>
                <Input
                  id="special-price"
                  type="number"
                  min="0"
                  value={specialPrice}
                  onChange={(e) => setSpecialPrice(e.target.value)}
                  placeholder={`Base price: ${basePrice} ${currency}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedDates.length} date(s) selected
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveSpecialPrice} disabled={loading} className="flex-1">
                  {loading ? "Saving..." : "Save Special Price"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDates([]);
                    setSpecialPrice("");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>Special Price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive/20 rounded"></div>
              <span>Unavailable</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {calculation && (
        <Card>
          <CardHeader>
            <CardTitle>Price Calculation</CardTitle>
            <CardDescription>
              Based on selected dates in calendar above
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nights:</span>
              <span className="font-medium">{calculation.nights}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">
                {calculation.subtotal} {currency}
              </span>
            </div>
            {calculation.weeklyDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Weekly Discount ({calculation.weeklyDiscount}%):</span>
                <span>
                  -{Math.round((calculation.subtotal * calculation.weeklyDiscount) / 100)}{" "}
                  {currency}
                </span>
              </div>
            )}
            {calculation.monthlyDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Monthly Discount ({calculation.monthlyDiscount}%):</span>
                <span>
                  -{Math.round((calculation.subtotal * calculation.monthlyDiscount) / 100)}{" "}
                  {currency}
                </span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between font-bold">
              <span>Total:</span>
              <span>
                {Math.round(calculation.total)} {currency}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
