import React, { memo, useMemo, useCallback, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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
  const maxDate = new Date(today.getFullYear() + 2, 11, 31); // 2 years ahead

  // Fetch availability only (same as Host Dashboard)
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

  // Create lookup map for availability
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
    // Default to available if no specific entry (same as Host Dashboard)
    return info ? info.available : true;
  }, [availabilityMap]);

  const getDatePrice = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const info = availabilityMap.get(dateStr);
    return info?.price || basePrice;
  }, [availabilityMap, basePrice]);

  // Disabled dates: only past dates and explicitly unavailable dates
  const isDateDisabled = useCallback((date: Date) => {
    if (date < today) return true;
    return !isDateAvailable(date);
  }, [today, isDateAvailable]);

  const [selectedDates, setSelectedDates] = useState<{
    checkIn: Date | null;
    checkOut: Date | null;
  }>({ checkIn: null, checkOut: null });
  
  const { toast } = useToast();

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (!isDateAvailable(date)) {
      toast({
        title: "Date unavailable",
        description: "This date is not available for booking",
        variant: "destructive"
      });
      return;
    }

    const { checkIn, checkOut } = selectedDates;

    if (!checkIn || (checkIn && checkOut)) {
      setSelectedDates({ checkIn: date, checkOut: null });
      onDateSelect?.({ checkIn: date, checkOut: null });
    } else if (checkIn && !checkOut) {
      if (date < checkIn) {
        setSelectedDates({ checkIn: date, checkOut: null });
        onDateSelect?.({ checkIn: date, checkOut: null });
      } else {
        setSelectedDates({ checkIn, checkOut: date });
        onDateSelect?.({ checkIn, checkOut: date });
      }
    }
  };

  const getDayClassName = (date: Date) => {
    const { checkIn, checkOut } = selectedDates;
    const info = availabilityMap.get(date.toISOString().split('T')[0]);
    const available = isDateAvailable(date);
    const isSelected = (checkIn && isSameDay(date, checkIn)) || (checkOut && isSameDay(date, checkOut));
    const isInRange = checkIn && checkOut && date > checkIn && date < checkOut;
    
    let className = "relative w-full h-full flex items-center justify-center text-sm cursor-pointer transition-colors ";
    
    if (!available) {
      className += "bg-red-100 text-red-700 cursor-not-allowed opacity-50 ";
    } else if (isSelected) {
      className += "bg-primary text-primary-foreground ";
    } else if (isInRange) {
      className += "bg-primary/20 text-primary ";
    } else if (info?.price && info.price !== basePrice) {
      className += "bg-blue-50 text-blue-900 hover:bg-blue-100 ";
    } else {
      className += "hover:bg-accent hover:text-accent-foreground ";
    }

    return className;
  };

  const renderDay = (date: Date) => {
    const info = availabilityMap.get(date.toISOString().split('T')[0]);
    const available = isDateAvailable(date);
    const price = getDatePrice(date);
    const isPreparation = info?.reason === 'preparation';

    return (
      <div className={getDayClassName(date)} onClick={() => handleDateSelect(date)}>
        <div className="text-center w-full">
          <div className="font-medium">{date.getDate()}</div>
          {mode === 'guest' && available && price !== basePrice && (
            <div className="text-xs opacity-75">
              {price}
            </div>
          )}
          {!available && (
            <div className="text-xs">✕</div>
          )}
          {!available && isPreparation && mode === "admin" && (
            <span className="text-[8px] text-orange-600 mt-0.5">prep</span>
          )}
        </div>
      </div>
    );
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
        mode="single"
        selected={selectedDates.checkIn || undefined}
        onSelect={handleDateSelect}
        disabled={(date) => date < today || !isDateAvailable(date)}
        fromDate={today}
        toDate={maxDate}
        numberOfMonths={1}
        weekStartsOn={1}
        className="rounded-md border w-full"
        components={{
          Day: ({ date }) => renderDay(date)
        }}
      />
    </div>
  );
});

PropertyCalendarOptimized.displayName = 'PropertyCalendarOptimized';

export default PropertyCalendarOptimized;
