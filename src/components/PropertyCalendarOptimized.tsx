import React, { memo, useMemo, useCallback, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import type { DateRange } from 'react-day-picker';

interface AvailabilityDate {
  date: string;               // 'YYYY-MM-DD'
  available: boolean;
  reason?: string;
  seasonal_price?: number;    // e.g. 1500
  minimum_nights?: number;
}

interface PropertyCalendarOptimizedProps {
  propertyId: string;
  basePrice: number;
  currency: string;
  onDateSelect?: (dates: { checkIn: Date | null; checkOut: Date | null }) => void;
  mode?: 'guest' | 'admin';
}

const PropertyCalendarOptimized = memo(function PropertyCalendarOptimized({
  propertyId,
  basePrice,
  currency,
  onDateSelect,
  mode = 'guest',
}: PropertyCalendarOptimizedProps) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Fetch availability (today → forward)
  const availabilityQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from('availability')
      .select('date, available, reason, seasonal_price, minimum_nights')
      .eq('property_id', propertyId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date');

    if (error) throw error;
    return { data, error: null };
  }, [propertyId]);

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
        filter: `property_id=eq.${propertyId}`,
      },
    }
  );

  // Map for quick lookups
  const availabilityMap = useMemo(() => {
    const map = new Map<
      string,
      { available: boolean; price: number; minimumNights: number }
    >();
    (availability || []).forEach((item: AvailabilityDate) => {
      map.set(item.date, {
        available: item.available,
        price: item.seasonal_price || basePrice,
        minimumNights: item.minimum_nights || 1,
      });
    });
    return map;
  }, [availability, basePrice]);

  const isDateAvailable = useCallback(
    (date: Date) => {
      const key = date.toISOString().split('T')[0];
      const info = availabilityMap.get(key);
      // If no explicit record, assume available
      return info ? info.available !== false : true;
    },
    [availabilityMap]
  );

  const getDatePrice = useCallback(
    (date: Date) => {
      const key = date.toISOString().split('T')[0];
      const info = availabilityMap.get(key);
      return info?.price ?? basePrice;
    },
    [availabilityMap, basePrice]
  );

  // Build disabled matchers
  const disabledMatchers = useMemo(() => {
    const dates: Date[] = [];
    (availability || []).forEach((item: AvailabilityDate) => {
      if (!item.available) {
        // Force midnight local to avoid TZ shift
        const d = new Date(item.date + 'T00:00:00');
        dates.push(d);
      }
    });
    // Also disable past dates
    return [{ before: today }, ...dates];
  }, [availability, today]);

  const handleSelect = (selected: DateRange | undefined) => {
    setRange(selected);
    onDateSelect?.({
      checkIn: selected?.from ?? null,
      checkOut: selected?.to ?? null,
    });
  };

  // Loading skeleton (no card here—parent owns the wrapper)
  if (loading) {
    return <div className="h-80 bg-muted animate-pulse rounded-lg" />;
  }

  return (
    <div className="space-y-3">
      <Calendar
        mode="range"
        selected={range}
        onSelect={handleSelect}
        disabled={disabledMatchers}
        initialFocus
        numberOfMonths={1}
        className="rounded-md border"
        // Keep the default Day (button) — only customize its content
        components={{
          DayContent: (props) => {
            const date = props.date;
            const available = isDateAvailable(date);
            const price = getDatePrice(date);
            const showPrice = mode === 'guest' && available && price !== basePrice;

            return (
              <div className="flex flex-col items-center leading-none">
                <span className={available ? '' : 'line-through opacity-50'}>
                  {date.getDate()}
                </span>
                {showPrice && (
                  <span className="text-[10px] opacity-70 mt-0.5">
                    {price}
                  </span>
                )}
              </div>
            );
          },
        }}
      />

      {mode === 'guest' && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-primary/80" />
            Available
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-destructive/80" />
            Unavailable
          </div>
          <Badge variant="outline" className="border-dashed">
            Base: {basePrice} {currency}/night
          </Badge>
        </div>
      )}
    </div>
  );
});

export default PropertyCalendarOptimized;
