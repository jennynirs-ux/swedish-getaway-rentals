import React, { useState, useEffect, memo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, addDays, eachDayOfInterval } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
        // Validate that all nights in the range are available
        if (!validateDateRange(checkIn, date)) {
          toast({
            title: "Range unavailable",
            description: "Some nights in this date range are not available for booking",
            variant: "destructive"
          });
          return;
        }
        // Set as check-out date
        setSelectedDates({ checkIn, checkOut: date });
        onDateSelect?.({ checkIn, checkOut: date });
      }
    }
  };

  const isCheckoutEligible = (date: Date) => {
    if (isDateAvailable(date)) return false; // Available dates aren't checkout-only
    
    // Check if the immediately previous day is available
    // If so, this date can be used as checkout date
    const prevDate = addDays(date, -1);
    return isDateAvailable(prevDate);
  };

  const validateDateRange = (checkIn: Date, checkOut: Date): boolean => {
    // Check all nights between check-in and check-out (exclusive of checkout)
    const nights = eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) });
    
    for (const night of nights) {
      if (!isDateAvailable(night)) {
        return false;
      }
    }
    return true;
  };

  const getDayClassName = (date: Date) => {
    const { checkIn, checkOut } = selectedDates;
    const avail = getDateAvailability(date);
    const isSelected = (checkIn && isSameDay(date, checkIn)) || (checkOut && isSameDay(date, checkOut));
    const isInRange = checkIn && checkOut && date > checkIn && date < checkOut;
    const isUnavailable = !isDateAvailable(date);
    const canBeCheckout = isCheckoutEligible(date);
    
    let className = "relative w-full h-full flex items-center justify-center text-sm cursor-pointer transition-all hover:scale-105 ";
    
    if (isSelected) {
      className += "bg-primary text-primary-foreground font-semibold shadow-sm ";
    } else if (isInRange) {
      className += "bg-primary/20 text-primary font-medium ";
    } else if (isUnavailable && canBeCheckout) {
      // Checkout-eligible dates - medium grey with underline to show they're special
      className += "text-muted-foreground/70 underline decoration-dotted underline-offset-2 ";
    } else if (isUnavailable) {
      // Completely unavailable dates - very light grey
      className += "text-muted-foreground/40 cursor-not-allowed ";
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
    const isUnavailable = !isDateAvailable(date);
    const canBeCheckout = isCheckoutEligible(date);
    const showTooltip = isUnavailable && canBeCheckout;

    const dayContent = (
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

    if (showTooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {dayContent}
            </TooltipTrigger>
            <TooltipContent>
              <p>Checkout only</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return dayContent;
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
            <div className="w-4 h-4 rounded text-muted-foreground/70 flex items-center justify-center text-xs underline decoration-dotted">5</div>
            <span>Checkout only</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded text-muted-foreground/40 flex items-center justify-center text-xs">6</div>
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
