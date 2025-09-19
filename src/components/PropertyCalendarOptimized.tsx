import React, { memo, useMemo, useCallback, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';

interface AvailabilityDate {
  date: string;
  available: boolean;
  reason?: string;
  seasonal_price?: number;
  minimum_nights?: number;
}

interface PropertyCalendarOptimizedProps {
  propertyId: string;
  basePrice: number;
  currency: string;
  onDateSelect?: (dates: { checkIn: Date | null; checkOut: Date | null }) => void;
  mode?: 'guest' | 'admin';
}

const PropertyCalendarOptimized = memo(({ 
  propertyId, 
  basePrice, 
  currency, 
  onDateSelect, 
  mode = 'guest' 
}: PropertyCalendarOptimizedProps) => {
  const today = new Date();

  // Hämta tillgänglighet
  const availabilityQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from('availability')
      .select('date, available, reason, seasonal_price, minimum_nights')
      .eq('property_id', propertyId)
      .gte('date', today.toISOString().split('T')[0])
      .order('date');

    if (error) throw error;
    return { data, error: null };
  }, [propertyId, today]);

  const { data: availability, loading } = useOptimizedQuery(
    `availability-${propertyId}`,
    availabilityQueryFn,
    {
      cacheTime: 5 * 60 * 1000,
      staleTime: 30 * 1000,
      enableRealtime: true,
      realtimeFilter: {
        event: '*',
        schema: 'public',
        table: 'availability',
        filter: `property_id=eq.${propertyId}`
      }
    }
  );

  // Map för lookup
  const availabilityMap = useMemo(() => {
    if (!availability) return new Map();
    return new Map(
      availability.map((item: AvailabilityDate) => [
        item.date,
        {
          available: item.available,
          price: item.seasonal_price || basePrice,
        }
      ])
    );
  }, [availability, basePrice]);

  const isDateAvailable = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const info = availabilityMap.get(dateStr);
    return info?.available !== false;
  }, [availabilityMap]);

  const getDatePrice = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const info = availabilityMap.get(dateStr);
    return info?.price || basePrice;
  }, [availabilityMap, basePrice]);

  // Samla disabled datum
  const disabledMatchers = useMemo(() => {
    const matchers: any[] = [{ before: today }];
    (availability || []).forEach((item: AvailabilityDate) => {
      if (!item.available) {
        matchers.push(new Date(item.date + 'T00:00:00'));
      }
    });
    return matchers;
  }, [availability, today]);

  const [range, setRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  const handleSelect = (r: { from: Date | null; to: Date | null } | undefined) => {
    if (!r) {
      setRange({ from: null, to: null });
      return;
    }

    // Blockera start eller slut på disabled datum
    if (r.from && !isDateAvailable(r.from)) return;
    if (r.to && !isDateAvailable(r.to)) return;

    // Blockera intervall som korsar disabled datum
    if (r.from && r.to) {
      const d = new Date(r.from);
      while (d <= r.to) {
        if (!isDateAvailable(d)) return; // Hitta spärr -> avbryt
        d.setDate(d.getDate() + 1);
      }
    }

    setRange(r);
    if (onDateSelect) {
      onDateSelect({
        checkIn: r.from || null,
        checkOut: r.to || null,
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Calendar...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          disabled={disabledMatchers}
          initialFocus
          numberOfMonths={1}
          className="rounded-md border"
          components={{
            DayContent: (props) => {
              const date = props.date;
              const available = isDateAvailable(date);
              const price = getDatePrice(date);
              const showPrice = mode === "guest" && available && price !== basePrice;

              return (
                <div className="flex flex-col items-center leading-none">
                  <span className={available ? "" : "line-through opacity-50"}>
                    {date.getDate()}
                  </span>
                  {showPrice && (
                    <span className="text-[10px] opacity-70 mt-0.5">
                      {price}
                    </span>
                  )}
                </div>
              );
            }
          }}
        />

        {mode === 'guest' && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                Available
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                Unavailable
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Base rate: {basePrice} {currency}/night
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

PropertyCalendarOptimized.displayName = 'PropertyCalendarOptimized';

export default PropertyCalendarOptimized;
