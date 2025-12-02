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
    
    const { checkIn, checkOut } = selectedDates;

    if (!checkIn || (checkIn && checkOut)) {
      // Start new selection - check if check-in date is available
      if (!isDateAvailable(date)) {
        toast({
          title: "Date unavailable",
          description: "This date is not available for check-in",
          variant: "destructive"
        });
        return;
      }
      setSelectedDates({ checkIn: date, checkOut: null });
      onDateSelect?.({ checkIn: date, checkOut: null });
    } else if (checkIn && !checkOut) {
      // Complete the selection
      if (date < checkIn) {
        // If selected date is before check-in, make it the new check-in
        if (!isDateAvailable(date)) {
          toast({
            title: "Date unavailable",
            description: "This date is not available for check-in",
            variant: "destructive"
          });
          return;
        }
        setSelectedDates({ checkIn: date, checkOut: null });
        onDateSelect?.({ checkIn: date, checkOut: null });
      } else {
        // Set as check-out date - don't check availability for check-out
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
    const isUnavailable = !isDateAvailable(date);
    
    let className = "relative w-full h-full flex items-center justify-center text-sm cursor-pointer transition-all hover:scale-105 ";
    
    if (isSelected) {
      className += "bg-primary text-primary-foreground font-semibold shadow-sm ";
    } else if (isInRange && isUnavailable) {
      // Checkout-only date - just lighter text, no background or strikethrough
      className += "text-muted-foreground/50 ";
    } else if (isInRange) {
      className += "bg-primary/20 text-primary font-medium ";
    } else if (isUnavailable) {
      className += "bg-muted-foreground/20 text-muted-foreground opacity-60 line-through ";
    } else if (avail?.seasonal_price) {
      className += "bg-accent text-accent-foreground hover:bg-accent/80 font-medium ";
    } else {
      className += "hover:bg-accent/50 ";
    }

    return className;
  };

  const renderDay = (date: Date) => {
    const avail = getDateAvailability(date);
    const price = getDatePrice(date);

    return (
      <div className={getDayClassName(date)} onClick={() => handleDateSelect(date)}>
        <div className="text-center w-full py-1">
          <div className="font-semibold text-base">{date.getDate()}</div>
          {mode === 'guest' && price !== basePrice && (
            <div className="text-xs mt-0.5 font-medium">
              {Math.round(price / 100)} {currency}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-4 space-y-2">
        <div className="flex gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/20"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted-foreground/20 line-through"></div>
            <span>Unavailable</span>
          </div>
        </div>
      </div>
      <Calendar
        mode="single"
        selected={selectedDates.checkIn || undefined}
        onSelect={handleDateSelect}
        disabled={(date) => date < new Date()}
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
