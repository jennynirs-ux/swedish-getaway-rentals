import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PropertySpecialPricingProps {
  propertyId: string;
  basePrice: number;
  currency: string;
}

const PropertySpecialPricing: React.FC<PropertySpecialPricingProps> = ({
  propertyId,
  basePrice,
  currency
}) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [specialPrice, setSpecialPrice] = useState<number>(basePrice);
  const [loading, setLoading] = useState(false);
  const [existingPrices, setExistingPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    loadExistingPrices();
  }, [propertyId]);

  const loadExistingPrices = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('date, seasonal_price')
        .eq('property_id', propertyId)
        .not('seasonal_price', 'is', null);

      if (error) throw error;

      const pricesMap: Record<string, number> = {};
      data?.forEach(item => {
        if (item.seasonal_price) {
          pricesMap[item.date] = item.seasonal_price;
        }
      });
      setExistingPrices(pricesMap);
    } catch (error) {
      console.error('Error loading existing prices:', error);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const existingPrice = existingPrices[dateStr];
    
    if (existingPrice) {
      setSpecialPrice(existingPrice / 100); // Convert from cents
    } else {
      setSpecialPrice(basePrice / 100); // Convert from cents
    }

    setSelectedDates([date]);
  };

  const saveSpecialPrice = async () => {
    if (selectedDates.length === 0) {
      toast({ title: 'Fel', description: 'Välj ett datum först', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const priceInCents = Math.round(specialPrice * 100);
      const promises = selectedDates.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        return supabase
          .from('availability')
          .upsert({
            property_id: propertyId,
            date: dateStr,
            available: true,
            seasonal_price: priceInCents
          }, {
            onConflict: 'property_id,date'
          });
      });

      const results = await Promise.all(promises);
      const hasError = results.some(result => result.error);

      if (hasError) {
        throw new Error('Failed to save some prices');
      }

      toast({ 
        title: 'Pris sparat', 
        description: `Specialpris ${specialPrice} ${currency} har satts för valda datum` 
      });
      
      loadExistingPrices();
      setSelectedDates([]);
    } catch (error) {
      console.error('Error saving special price:', error);
      toast({ title: 'Fel', description: 'Kunde inte spara specialpriset', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const removeSpecialPrice = async () => {
    if (selectedDates.length === 0) {
      toast({ title: 'Fel', description: 'Välj ett datum först', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const promises = selectedDates.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        return supabase
          .from('availability')
          .update({ seasonal_price: null })
          .eq('property_id', propertyId)
          .eq('date', dateStr);
      });

      await Promise.all(promises);

      toast({ 
        title: 'Specialpris borttaget', 
        description: 'Datum använder nu baspriset igen' 
      });
      
      loadExistingPrices();
      setSelectedDates([]);
      setSpecialPrice(basePrice / 100);
    } catch (error) {
      console.error('Error removing special price:', error);
      toast({ title: 'Fel', description: 'Kunde inte ta bort specialpriset', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getDayClassName = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const hasSpecialPrice = existingPrices[dateStr];
    const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);

    let className = 'relative cursor-pointer';
    
    if (hasSpecialPrice) {
      className += ' bg-primary/20 text-primary-foreground';
    }
    
    if (isSelected) {
      className += ' ring-2 ring-primary';
    }
    
    return className;
  };

  const renderDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const specialPrice = existingPrices[dateStr];
    
    return (
      <div className="flex flex-col items-center">
        <span>{date.getDate()}</span>
        {specialPrice && (
          <span className="text-xs opacity-75">
            {Math.round(specialPrice / 100)}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Specialpriser för datum</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-4">Välj datum</h3>
            <Calendar
              mode="single"
              selected={selectedDates[0]}
              onSelect={handleDateSelect}
              className="rounded-md border"
              components={{
                DayContent: ({ date }) => renderDay(date)
              }}
              modifiers={{
                specialPrice: (date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return !!existingPrices[dateStr];
                }
              }}
              modifiersClassNames={{
                specialPrice: 'bg-primary/20'
              }}
            />
            <div className="text-sm text-muted-foreground mt-2">
              Blå bakgrund = specialpris satt
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="special-price">Specialpris ({currency})</Label>
              <Input
                id="special-price"
                type="number"
                value={specialPrice}
                onChange={(e) => setSpecialPrice(parseFloat(e.target.value) || 0)}
                placeholder={`Baspris: ${basePrice / 100}`}
              />
              <div className="text-sm text-muted-foreground mt-1">
                Baspris: {basePrice / 100} {currency}
              </div>
            </div>

            {selectedDates.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium">Valt datum:</div>
                <div className="text-sm">
                  {format(selectedDates[0], 'yyyy-MM-dd')}
                </div>
                {existingPrices[format(selectedDates[0], 'yyyy-MM-dd')] && (
                  <div className="text-sm text-muted-foreground">
                    Nuvarande specialpris: {existingPrices[format(selectedDates[0], 'yyyy-MM-dd')] / 100} {currency}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={saveSpecialPrice} 
                disabled={loading || selectedDates.length === 0}
              >
                Spara specialpris
              </Button>
              <Button 
                variant="outline" 
                onClick={removeSpecialPrice}
                disabled={loading || selectedDates.length === 0}
              >
                Ta bort specialpris
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertySpecialPricing;