import React, { memo, useMemo, useCallback, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';

interface AvailabilityDate {
  date: string;
  available: boolean;
  reason?: string | null;
  seasonal_price?: number | null;
  minimum_nights?: number | null;
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

  // Hämta availability
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

  // Gör lookup-map
  const availabilityMap = useMemo(() => {
    if (!availability) return new Map();
    return new Map(
      availability.map((item: AvailabilityDate) => [
        item.date,
        {
          available: item.available,
          price: item.seasonal_price || basePrice,
          reason: item.reason,
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

  // Markera disabled datum
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

    // Blockera val av otillgängliga datum
    if (r.from && !isDateAvailable(r.from)) return;
    if (r.to && !isDateAvailable(r.to)) return;

    // Blockera intervall som korsar otillgängliga datum
    if (r.from && r.to) {
      const d = new Date(r.from);
      while (d <= r.to) {
        if (!isDateAvailable(d)) return;
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
      <div>
        <p>Loading Calendar...</p>
        <div className="h-80 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <Calendar
        mode="range"
        selected={range}
        onSelect={handleSelect}
        disabled={disabledMatchers}
        initialFocus
        numberOfMonths={1}
        weekStartsOn={1}
        className="rounded-md border"
        components={{
          DayContent: (props) => {
            const date = props.date;
            const dateStr = date.toISOString().split('T')[0];
            const info = availabilityMap.get(dateStr);
            const available = isDateAvailable(date);
            const price = getDatePrice(date);
            const showPrice = mode === "guest" && available && price !== basePrice;
            const isPreparation = info?.reason === 'preparation';
            const isBooked = info?.reason === 'booked';

            return (
              <div className="flex flex-col items-center leading-none">
                <span className={
                  !available 
                    ? isPreparation 
                      ? "opacity-40 text-orange-600" 
                      : isBooked 
                        ? "line-through opacity-50 text-red-600"
                        : "line-through opacity-50" 
                    : ""
                }>
                  {date.getDate()}
                </span>
                {showPrice && (
                  <span className="text-[10px] opacity-70 mt-0.5">
                    {price}
                  </span>
                )}
                {!available && isPreparation && mode === "admin" && (
                  <span className="text-[8px] text-orange-600 mt-0.5">prep</span>
                )}
              </div>
            );
          }
        }}
      />
    </div>
  );
});

PropertyCalendarOptimized.displayName = 'PropertyCalendarOptimized';

export default PropertyCalendarOptimized;
