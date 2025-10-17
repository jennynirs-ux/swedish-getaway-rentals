import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { useBooking } from "@/hooks/useBooking";
import { usePricingRules } from "@/hooks/usePricingRules";
import { supabase } from "@/integrations/supabase/client";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { z } from 'zod';
import DOMPurify from 'dompurify';
import { format, addDays } from "date-fns";
import type { DateRange } from "react-day-picker";

// Input validation schema
const bookingSchema = z.object({
  guest_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  guest_email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .trim(),
  guest_phone: z.string()
    .max(20, 'Phone number too long')
    .optional(),
  special_requests: z.string()
    .max(1000, 'Special requests must be less than 1000 characters')
    .optional()
});

interface BookingFormProps {
  propertyId: string;
  propertyTitle: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
}

const BookingForm: React.FC<BookingFormProps> = ({
  propertyId,
  propertyTitle,
  pricePerNight,
  currency,
  maxGuests
}) => {
  const { createBooking, loading } = useBooking();
  const { rules, calculatePrice, getAvailableServices } = usePricingRules(propertyId);
  const { userCurrency, formatPrice, convertPrice } = useCurrencyConversion();
  
  // Enable real-time calendar updates when bookings are made
  useBookingRealtime({
    onBookingUpdate: (booking) => {
      if (booking.property_id === propertyId && booking.status === 'confirmed') {
        console.log('Booking confirmed for this property:', booking);
      }
    }
  });

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    number_of_guests: 1,
    special_requests: ''
  });

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);

  const [availability, setAvailability] = useState<Array<{
    date: string;
    available: boolean;
    reason: string | null;
    seasonal_price: number | null;
  }>>([]);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availabilityPrices, setAvailabilityPrices] = useState<Record<string, number>>({});
  const [houseRulesAccepted, setHouseRulesAccepted] = useState(false);
  const [guestCountConfirmed, setGuestCountConfirmed] = useState(false);
  const [bringPet, setBringPet] = useState(false);

  // Load availability data
  useEffect(() => {
    loadAvailability();
  }, [propertyId]);

  const loadAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("property_id", propertyId)
        .gte("date", format(new Date(), "yyyy-MM-dd"))
        .lte("date", format(addDays(new Date(), 365), "yyyy-MM-dd"));

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error("Error loading availability:", error);
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.find((a) => a.date === dateStr);
  };

  const isDateUnavailable = (date: Date) => {
    const avail = getDateAvailability(date);
    return avail && !avail.available;
  };

  const modifiers = {
    unavailable: availability
      .filter((a) => !a.available)
      .map((a) => new Date(a.date + "T00:00:00")),
    specialPrice: availability
      .filter((a) => a.seasonal_price)
      .map((a) => new Date(a.date + "T00:00:00")),
  };

  // Convert selected date range to checkIn/checkOut
  const selectedDates = useMemo(() => ({
    checkIn: selectedDateRange?.from || null,
    checkOut: selectedDateRange?.to || null
  }), [selectedDateRange]);

  // Load availability prices when dates change
  useEffect(() => {
    if (selectedDates.checkIn && selectedDates.checkOut) {
      loadAvailabilityPrices();
    }
  }, [selectedDates.checkIn, selectedDates.checkOut, propertyId]);

  const loadAvailabilityPrices = async () => {
    if (!selectedDates.checkIn || !selectedDates.checkOut) return;

    try {
      const { data, error } = await supabase
        .from('availability')
        .select('date, seasonal_price')
        .eq('property_id', propertyId)
        .gte('date', selectedDates.checkIn.toISOString().split('T')[0])
        .lt('date', selectedDates.checkOut.toISOString().split('T')[0]);

      if (error) throw error;

      const pricesMap: Record<string, number> = {};
      data?.forEach(item => {
        if (item.seasonal_price) {
          pricesMap[item.date] = item.seasonal_price;
        }
      });
      setAvailabilityPrices(pricesMap);
    } catch (error) {
      console.error('Error loading availability prices:', error);
    }
  };

  // Fetch property discount data
  const [propertyDiscounts, setPropertyDiscounts] = useState<{ weekly: number; monthly: number }>({
    weekly: 0,
    monthly: 0
  });

  useEffect(() => {
    const loadPropertyDiscounts = async () => {
      const { data } = await supabase
        .from('properties')
        .select('weekly_discount_percentage, monthly_discount_percentage')
        .eq('id', propertyId)
        .single();
      
      if (data) {
        setPropertyDiscounts({
          weekly: data.weekly_discount_percentage || 0,
          monthly: data.monthly_discount_percentage || 0
        });
      }
    };
    loadPropertyDiscounts();
  }, [propertyId]);

  // Calculate pricing with dynamic pricing rules and discounts
  const pricingCalculation = useMemo(() => {
    if (!selectedDates.checkIn || !selectedDates.checkOut) {
      return {
        basePrice: pricePerNight,
        nights: 0,
        guests: formData.number_of_guests,
        extraGuestFee: 0,
        cleaningFee: 0,
        extraServices: 0,
        discount: 0,
        subtotal: 0,
        total: 0,
        breakdown: {
          accommodation: 0,
          extraGuests: 0,
          cleaning: 0,
          services: 0
        }
      };
    }
    
    const baseCalc = calculatePrice(
      pricePerNight,
      selectedDates.checkIn,
      selectedDates.checkOut,
      formData.number_of_guests,
      availabilityPrices,
      selectedServices
    );

    // Apply weekly or monthly discount
    let discount = 0;
    const nights = baseCalc.nights;
    if (nights >= 30 && propertyDiscounts.monthly > 0) {
      discount = (baseCalc.total * propertyDiscounts.monthly) / 100;
    } else if (nights >= 7 && propertyDiscounts.weekly > 0) {
      discount = (baseCalc.total * propertyDiscounts.weekly) / 100;
    }

    const subtotal = baseCalc.total - discount;
    
    return {
      ...baseCalc,
      discount,
      subtotal,
      total: subtotal
    };
  }, [selectedDates, pricePerNight, formData.number_of_guests, availabilityPrices, selectedServices, calculatePrice, propertyDiscounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDates.checkIn || !selectedDates.checkOut) {
      alert('Please select check-in and check-out dates');
      return;
    }

    // Validate and sanitize inputs
    try {
      const validatedData = bookingSchema.parse({
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone || undefined,
        special_requests: formData.special_requests || undefined
      });

      // Sanitize text inputs to prevent XSS
      const sanitizedData = {
        guest_name: DOMPurify.sanitize(validatedData.guest_name, { ALLOWED_TAGS: [] }),
        guest_email: DOMPurify.sanitize(validatedData.guest_email, { ALLOWED_TAGS: [] }),
        guest_phone: validatedData.guest_phone ? DOMPurify.sanitize(validatedData.guest_phone, { ALLOWED_TAGS: [] }) : '',
        special_requests: validatedData.special_requests ? DOMPurify.sanitize(validatedData.special_requests, { ALLOWED_TAGS: [] }) : ''
      };

      const bookingData = {
        property_id: propertyId,
        ...sanitizedData,
        check_in_date: `${selectedDates.checkIn.getFullYear()}-${String(selectedDates.checkIn.getMonth() + 1).padStart(2, '0')}-${String(selectedDates.checkIn.getDate()).padStart(2, '0')}`,
        check_out_date: `${selectedDates.checkOut.getFullYear()}-${String(selectedDates.checkOut.getMonth() + 1).padStart(2, '0')}-${String(selectedDates.checkOut.getDate()).padStart(2, '0')}`,
        number_of_guests: formData.number_of_guests,
        total_amount: pricingCalculation.total,
        property_title: propertyTitle,
        currency: currency
      };

      const result = await createBooking(bookingData);
      if (result.success) {
        setFormData({
          guest_name: '',
          guest_email: '',
          guest_phone: '',
          number_of_guests: 1,
          special_requests: ''
        });
        setSelectedDateRange(undefined);
        setSelectedServices([]);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        alert(error.issues[0].message);
      } else {
        alert('Invalid input. Please check your information and try again.');
      }
    }
  };


  const availableServices = getAvailableServices();
  const petFeeService = availableServices.find(s => s.name.toLowerCase().includes('pet'));
  const otherServices = availableServices.filter(s => !s.name.toLowerCase().includes('pet'));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Book Your Stay
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Calendar */}
          <div>
            <Label className="text-base font-medium mb-3 block">Select Dates</Label>
            <div className="bg-muted/30 rounded-lg border p-4">
              <Calendar
                mode="range"
                selected={selectedDateRange}
                onSelect={(range) => {
                  if (!range) {
                    setSelectedDateRange(undefined);
                    return;
                  }
                  
                  // Prevent selection if from date is unavailable
                  if (range.from && isDateUnavailable(range.from)) {
                    return;
                  }
                  
                  // Prevent selection if to date is unavailable
                  if (range.to && isDateUnavailable(range.to)) {
                    return;
                  }
                  
                  // Check if any date in the range is unavailable
                  if (range.from && range.to) {
                    let checkDate = new Date(range.from);
                    while (checkDate <= range.to) {
                      if (isDateUnavailable(checkDate)) {
                        // Don't allow selecting this range
                        return;
                      }
                      checkDate.setDate(checkDate.getDate() + 1);
                    }
                  }
                  
                  setSelectedDateRange(range);
                }}
                className="rounded-md border"
                disabled={isDateUnavailable}
                modifiers={modifiers}
                modifiersClassNames={{
                  unavailable: "bg-destructive/20 text-destructive line-through",
                  specialPrice: "bg-blue-100 text-blue-900 font-semibold",
                }}
                numberOfMonths={1}
                components={{
                  DayContent: ({ date }) => {
                    const avail = getDateAvailability(date);
                    return (
                      <div className="flex flex-col items-center leading-none">
                        <span>{date.getDate()}</span>
                        {avail?.seasonal_price && (
                          <span className="text-[10px] mt-0.5">
                            {avail.seasonal_price}
                          </span>
                        )}
                      </div>
                    );
                  },
                }}
              />
              <div className="flex flex-wrap gap-4 text-sm mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span>Special Price</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-destructive/20 rounded"></div>
                  <span>Unavailable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guest Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="guest-name">Full Name *</Label>
              <Input
                id="guest-name"
                type="text"
                value={formData.guest_name}
                onChange={(e) => setFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="guest-email">Email *</Label>
              <Input
                id="guest-email"
                type="email"
                value={formData.guest_email}
                onChange={(e) => setFormData(prev => ({ ...prev, guest_email: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="guest-phone">Phone</Label>
              <Input
                id="guest-phone"
                type="tel"
                value={formData.guest_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, guest_phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="guests">Number of Guests</Label>
              <Select
                value={formData.number_of_guests.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, number_of_guests: parseInt(value) }))}
              >
                <SelectTrigger id="guests">
                  <SelectValue placeholder="Select number of guests" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pet Fee */}
          {petFeeService && (
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <Label>Bringing a Pet?</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bring-pet"
                  checked={bringPet}
                  onCheckedChange={(checked) => {
                    setBringPet(checked === true);
                    if (checked) {
                      if (!selectedServices.includes(petFeeService.id)) {
                        setSelectedServices([...selectedServices, petFeeService.id]);
                      }
                    } else {
                      setSelectedServices(selectedServices.filter(id => id !== petFeeService.id));
                    }
                  }}
                />
                <Label htmlFor="bring-pet" className="text-sm">
                  Yes, I'm bringing a pet (+{petFeeService.price.toLocaleString()} {petFeeService.currency}
                  {petFeeService.is_per_night ? ' per night' : ' one-time fee'})
                </Label>
              </div>
            </div>
          )}

          {/* Extra Services */}
          {otherServices.length > 0 && (
            <div className="space-y-2">
              <Label>Extra Services</Label>
              {otherServices.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.id}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedServices([...selectedServices, service.id]);
                      } else {
                        setSelectedServices(selectedServices.filter(id => id !== service.id));
                      }
                    }}
                  />
                  <Label htmlFor={service.id} className="text-sm">
                    {service.name} - {service.price.toLocaleString()} {service.currency}
                    {service.is_per_night ? ' per night' : ' one-time fee'}
                  </Label>
                </div>
              ))}
            </div>
          )}

          {/* Special Requests */}
          <div>
            <Label htmlFor="special-requests">Special Requests</Label>
            <Textarea
              id="special-requests"
              value={formData.special_requests}
              onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
              placeholder="Any special requests or notes..."
              rows={3}
            />
          </div>

          {/* Price Breakdown */}
          {pricingCalculation.total > 0 && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Price Breakdown</h4>
                {userCurrency.code !== currency && (
                  <span className="text-xs text-muted-foreground">
                    Showing in {userCurrency.code} (base: {currency})
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm">
                 <div className="flex justify-between">
                   <span>Accommodation ({pricingCalculation.nights} nights)</span>
                   <span>
                     {formatPrice(pricingCalculation.breakdown.accommodation)}
                     {userCurrency.code !== currency && (
                       <span className="text-xs text-muted-foreground ml-1">
                         (~{pricingCalculation.breakdown.accommodation.toLocaleString()} {currency})
                       </span>
                     )}
                   </span>
                 </div>
                 {pricingCalculation.breakdown.extraGuests > 0 && (
                   <div className="flex justify-between">
                     <span>Extra guests</span>
                     <span>
                       {formatPrice(pricingCalculation.breakdown.extraGuests)}
                     </span>
                   </div>
                 )}
                 {pricingCalculation.breakdown.cleaning > 0 && (
                   <div className="flex justify-between">
                     <span>Cleaning fee</span>
                     <span>
                       {formatPrice(pricingCalculation.breakdown.cleaning)}
                     </span>
                   </div>
                 )}
                 {pricingCalculation.breakdown.services > 0 && (
                   <div className="flex justify-between">
                     <span>Extra services</span>
                     <span>
                       {formatPrice(pricingCalculation.breakdown.services)}
                     </span>
                   </div>
                 )}
                 {pricingCalculation.discount > 0 && (
                   <div className="flex justify-between text-green-600">
                     <span>
                       {pricingCalculation.nights >= 30 ? 'Monthly' : 'Weekly'} Discount
                       ({pricingCalculation.nights >= 30 ? propertyDiscounts.monthly : propertyDiscounts.weekly}%)
                     </span>
                     <span>-{formatPrice(pricingCalculation.discount)}</span>
                   </div>
                 )}
                   <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                     <span>Total</span>
                     <span>{formatPrice(pricingCalculation.subtotal)}</span>
                   </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Includes all fees and charges
                  </div>
              </div>
            </div>
          )}

          {/* Confirmation Checkboxes */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="house-rules"
                checked={houseRulesAccepted}
                onCheckedChange={(checked) => setHouseRulesAccepted(checked === true)}
              />
              <Label htmlFor="house-rules" className="text-sm leading-relaxed cursor-pointer">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={() => {
                    const event = new CustomEvent('open-guest-guide', { 
                      detail: { section: 'rules' } 
                    });
                    window.dispatchEvent(event);
                  }}
                  className="text-primary underline hover:no-underline"
                >
                  House Rules
                </button>
              </Label>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="guest-count"
                checked={guestCountConfirmed}
                onCheckedChange={(checked) => setGuestCountConfirmed(checked === true)}
              />
              <Label htmlFor="guest-count" className="text-sm leading-relaxed cursor-pointer">
                I confirm that I have entered the correct number of guests ({formData.number_of_guests} {formData.number_of_guests === 1 ? 'person' : 'people'}), including myself
              </Label>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={
              pricingCalculation.total === 0 || 
              loading || 
              !houseRulesAccepted || 
              !guestCountConfirmed
            }
          >
            {loading ? 'Processing...' : 
             !houseRulesAccepted || !guestCountConfirmed ? 'Please accept terms above' :
             `Confirm Booking (${pricingCalculation.total > 0 ? formatPrice(pricingCalculation.subtotal) : 'Select dates'})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;