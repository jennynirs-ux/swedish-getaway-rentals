import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays } from "lucide-react";
import { useBooking } from "@/hooks/useBooking";
import { usePricingRules } from "@/hooks/usePricingRules";
import { supabase } from "@/integrations/supabase/client";
import PropertyCalendarOptimized from "@/components/PropertyCalendarOptimized";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";

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

  const [selectedDates, setSelectedDates] = useState<{ checkIn: Date | null; checkOut: Date | null }>({
    checkIn: null,
    checkOut: null
  });

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availabilityPrices, setAvailabilityPrices] = useState<Record<string, number>>({});

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

    const bookingData = {
      property_id: propertyId,
      guest_name: formData.guest_name,
      guest_email: formData.guest_email,
      guest_phone: formData.guest_phone,
      check_in_date: selectedDates.checkIn.toISOString().split('T')[0],
      check_out_date: selectedDates.checkOut.toISOString().split('T')[0],
      number_of_guests: formData.number_of_guests,
      special_requests: formData.special_requests,
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
      setSelectedDates({ checkIn: null, checkOut: null });
      setSelectedServices([]);
    }
  };

  const handleDateSelect = (dates: { checkIn: Date | null; checkOut: Date | null }) => {
    setSelectedDates(dates);
  };

  const availableServices = getAvailableServices();

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
            <PropertyCalendarOptimized
              propertyId={propertyId}
              basePrice={pricePerNight}
              currency={currency}
              onDateSelect={handleDateSelect}
              mode="guest"
            />
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
              <Input
                id="guests"
                type="number"
                min="1"
                max={maxGuests}
                value={formData.number_of_guests}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_guests: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          {/* Extra Services */}
          {availableServices.length > 0 && (
            <div className="space-y-2">
              <Label>Extra Services</Label>
              {availableServices.map((service) => (
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
                 <div className="border-t pt-1 flex justify-between text-sm text-muted-foreground">
                   <span>Subtotal (Host Earnings)</span>
                   <span>{formatPrice(pricingCalculation.subtotal)}</span>
                 </div>
                 <div className="flex justify-between text-sm text-muted-foreground">
                   <span>Platform Fee (10%)</span>
                   <span>+{formatPrice(Math.round(pricingCalculation.subtotal * 0.1))}</span>
                 </div>
                 <div className="border-t pt-1 flex justify-between font-semibold text-lg">
                   <span>Total (Guest Pays)</span>
                   <span>{formatPrice(Math.round(pricingCalculation.subtotal * 1.1))}</span>
                 </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={pricingCalculation.total === 0 || loading}
          >
            {loading ? 'Processing...' : `Book Now (${pricingCalculation.total > 0 ? `${pricingCalculation.total.toLocaleString()} ${currency}` : 'Select dates'})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;