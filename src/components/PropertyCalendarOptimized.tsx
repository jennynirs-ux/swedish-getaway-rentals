import React, { useState, useEffect, memo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, addDays } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface AvailabilityDate {
  date: string;
  available: boolean;
  reason: string;
  seasonal_price: number | null;
  minimum_nights: number;
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
  currency = 'SEK',
  onDateSelect,
  mode = 'guest'
}: PropertyCalendarOptimizedProps) => {
  const [availability, setAvailability] = useState<AvailabilityDate[]>([]);
  const [selectedDates, setSelectedDates] = useState<{
    checkIn: Date | null;
    checkOut: Date | null;
  }>({ checkIn: null, checkOut: null });
  const { toast } = useToast();

  useEffect(() => {
    fetchAvailability();
  }, [propertyId]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('property_id', propertyId)
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .lte('date', format(addDays(new Date(), 365), 'yyyy-MM-dd'));

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availability.find(a => a.date === dateStr);
  };

  const isDateAvailable = (date: Date) => {
    const avail = getDateAvailability(date);
    return avail ? avail.available : true; // Default to available if no specific entry
  };

  const getDatePrice = (date: Date) => {
    const avail = getDateAvailability(date);
    return avail?.seasonal_price || basePrice;
  };

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
      // Start new selection
      setSelectedDates({ checkIn: date, checkOut: null });
      onDateSelect?.({ checkIn: date, checkOut: null });
    } else if (checkIn && !checkOut) {
      // Complete the selection
      if (date < checkIn) {
        // If selected date is before check-in, make it the new check-in
        setSelectedDates({ checkIn: date, checkOut: null });
        onDateSelect?.({ checkIn: date, checkOut: null });
      } else {
        // Set as check-out date
        setSelectedDates({ checkIn, checkOut: date });
        onDateSelect?.({ checkIn, checkOut: date });
      }
    }
  };

  const getDayClassName = (date: Date) => {
    const { checkIn, checkOut } = selectedDates;
    const avail = getDateAvailability(date);
    const isSelected = (checkIn && isSameDay(date, checkIn)) || (checkOut && isSameDay(date, checkOut));
    const isInRange = checkIn && checkOut && date > checkIn && date < checkOut;
    
    let className = "relative w-full h-full flex items-center justify-center text-sm cursor-pointer transition-colors ";
    
    if (!isDateAvailable(date)) {
      className += "bg-red-100 text-red-700 cursor-not-allowed opacity-50 ";
    } else if (isSelected) {
      className += "bg-primary text-primary-foreground ";
    } else if (isInRange) {
      className += "bg-primary/20 text-primary ";
    } else if (avail?.seasonal_price) {
      className += "bg-blue-50 text-blue-900 hover:bg-blue-100 ";
    } else {
      className += "hover:bg-accent hover:text-accent-foreground ";
    }

    return className;
  };

  const renderDay = (date: Date) => {
    const avail = getDateAvailability(date);
    const price = getDatePrice(date);
    const isUnavailable = !isDateAvailable(date);

    return (
      <div className={getDayClassName(date)} onClick={() => handleDateSelect(date)}>
        <div className="text-center w-full">
          <div className="font-medium">{date.getDate()}</div>
          {mode === 'guest' && !isUnavailable && (
            <div className="text-xs opacity-75">
              {price !== basePrice ? `${price} ${currency}` : ''}
            </div>
          )}
          {isUnavailable && (
            <div className="text-xs">✕</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <Calendar
        mode="single"
        selected={selectedDates.checkIn || undefined}
        onSelect={handleDateSelect}
        disabled={(date) => date < new Date() || !isDateAvailable(date)}
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
