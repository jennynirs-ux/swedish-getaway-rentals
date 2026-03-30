// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, addDays } from 'date-fns';
import { CalendarIcon, DollarSign } from 'lucide-react';

interface AvailabilityDate {
  date: string;
  available: boolean;
  reason: string;
  seasonal_price: number | null;
  minimum_nights: number;
}

interface PropertyCalendarWidgetProps {
  propertyId: string;
  basePrice: number;
  currency?: string;
  onDateSelect?: (checkIn: Date | null, checkOut: Date | null) => void;
  mode?: 'guest' | 'admin';
}

export const PropertyCalendarWidget = ({
  propertyId,
  basePrice,
  currency = 'SEK',
  onDateSelect,
  mode = 'guest'
}: PropertyCalendarWidgetProps) => {
  const [availability, setAvailability] = useState<AvailabilityDate[]>([]);
  const [selectedDates, setSelectedDates] = useState<{
    checkIn: Date | null;
    checkOut: Date | null;
  }>({ checkIn: null, checkOut: null });
  const [loading, setLoading] = useState(false);
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
      onDateSelect?.(date, null);
    } else if (checkIn && !checkOut) {
      // Complete the selection
      if (date < checkIn) {
        // If selected date is before check-in, make it the new check-in
        setSelectedDates({ checkIn: date, checkOut: null });
        onDateSelect?.(date, null);
      } else {
        // Set as check-out date
        setSelectedDates({ checkIn, checkOut: date });
        onDateSelect?.(checkIn, date);
      }
    }
  };

  const calculateTotalPrice = () => {
    const { checkIn, checkOut } = selectedDates;
    if (!checkIn || !checkOut) return 0;

    let total = 0;
    let currentDate = new Date(checkIn);
    
    while (currentDate < checkOut) {
      total += getDatePrice(currentDate);
      currentDate = addDays(currentDate, 1);
    }
    
    return total;
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

  const { checkIn, checkOut } = selectedDates;
  const totalPrice = calculateTotalPrice();
  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Select Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={checkIn || undefined}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date() || !isDateAvailable(date)}
            className="rounded-md border w-full"
            components={{
              Day: ({ date }) => renderDay(date)
            }}
          />
          
          {mode === 'guest' && (
            <div className="mt-4 space-y-3">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
                  <span>Special Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 rounded"></div>
                  <span>Unavailable</span>
                </div>
              </div>

              {/* Selected dates display */}
              {(checkIn || checkOut) && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <Label className="text-sm text-muted-foreground">Check-in</Label>
                      <div className="font-medium">
                        {checkIn ? format(checkIn, 'MMM dd, yyyy') : 'Select date'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Check-out</Label>
                      <div className="font-medium">
                        {checkOut ? format(checkOut, 'MMM dd, yyyy') : 'Select date'}
                      </div>
                    </div>
                  </div>
                  
                  {checkIn && checkOut && (
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {nights} {nights === 1 ? 'night' : 'nights'}
                        </span>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {totalPrice.toLocaleString()} {currency}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ~{Math.round(totalPrice / nights)} {currency}/night avg
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};