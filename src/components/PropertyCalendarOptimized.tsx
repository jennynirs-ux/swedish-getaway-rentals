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

const PropertyCalendarOptimized = memo(
  ({
    propertyId,
    basePrice,
    currency,
    onDateSelect,
    mode = 'guest',
  }: PropertyCalendarOptimizedProps) => {
    const [range, setRange] = useState<{ from: Date | null; to: Date | null }>({
      from: null,
      to: null,
    });

    // Fetch availability from Supabase
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
        cacheTime: 5 * 60 * 1000, // 5 minutes
        staleTime: 30 * 1000, // 30 seconds
        enableRealtime: true,
        realtimeFilter: {
          event: '*',
          schema: 'public',
          table: 'availability',
          filter: `property_id=eq.${propertyId}`,
        },
      }
    );

    // Build a map for quick lookups
    const availabilityMap = useMemo(() => {
      if (!availability) return new Map();

      return new Map(
        availability.map((item: AvailabilityDate) => [
          item.date,
          {
            available: item.available,
            reason: item.reason,
            price: item.seasonal_price || basePrice,
            minimumNights: item.minimum_nights || 1,
          },
        ])
      );
    }, [availability, basePrice]);

    // Date availability
    const isDateAvailable = useCallback(
      (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const info = availabilityMap.get(dateStr);
        return info?.available !== false;
      },
      [availabilityMap]
    );

    // Date price
    const getDatePrice = useCallback(
      (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const info = availabilityMap.get(dateStr);
        return info?.price || basePrice;
      },
      [availabilityMap, basePrice]
    );

    // Disabled dates
    const disabledDates = useMemo(() => {
      if (!availability) return [];
      return availability
        .filter((item: AvailabilityDate) => !item.available)
        .map((item: AvailabilityDate) => new Date(item.date));
    }, [availability]);

    // Handle date selection
    const handleSelect = (selected: any) => {
      setRange(selected);

      if (onDateSelect) {
        onDateSelect({
          checkIn: selected?.from || null,
          checkOut: selected?.to || null,
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Availability & Pricing
            {mode === 'guest' && <Badge variant="secondary">{currency}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleSelect}
            disabled={disabledDates}
            className="rounded-md border"
            components={{
              Day: ({ date, ...props }) => {
                const price = getDatePrice(date);
                const available = isDateAvailable(date);

                return (
                  <div className="relative p-2 text-center">
                    <div
                      className={`
                        w-8 h-8 flex items-center justify-center rounded-full text-sm
                        ${
                          available
                            ? 'hover:bg-primary hover:text-primary-foreground'
                            : 'text-muted-foreground line-through'
                        }
                      `}
                    >
                      {date.getDate()}
                    </div>
                    {mode === 'guest' && available && price !== basePrice && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                        <Badge variant="outline" className="text-xs py-0 px-1">
                          {price}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              },
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
                  <div className="w-3 h-3 rounded-full bg-destructive" />
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
  }
);

PropertyCalendarOptimized.displayName = 'PropertyCalendarOptimized';

export default PropertyCalendarOptimized;
