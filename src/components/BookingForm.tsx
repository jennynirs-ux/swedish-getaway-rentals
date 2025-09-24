import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays } from "lucide-react";
import { useBooking } from "@/hooks/useBooking";
import PropertyCalendarOptimized from "@/components/PropertyCalendarOptimized";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";

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
  
  // Enable real-time calendar updates when bookings are made
  useBookingRealtime({
    onBookingUpdate: (booking) => {
      if (booking.property_id === propertyId && booking.status === 'confirmed') {
        // Calendar will automatically refresh due to real-time subscription in PropertyCalendarOptimized
        console.log('Booking confirmed for this property:', booking);
      }
    }
  });

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    number_of_guests: 2,
    special_requests: ''
  });

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

  const calculateTotalAmount = () => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights * pricePerNight : 0;
  };

  const nights = checkIn && checkOut
    ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalAmount = calculateTotalAmount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) return;
  
    try {
      await createBooking({
        property_id: propertyId,
        total_amount: totalAmount,
        currency,
        check_in_date: checkIn?.toISOString().split("T")[0],
        check_out_date: checkOut?.toISOString().split("T")[0],
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone,
        number_of_guests: formData.number_of_guests,
        special_requests: formData.special_requests
      });
  
      // Reset form
      setFormData({
        guest_name: "",
        guest_email: "",
        guest_phone: "",
        number_of_guests: 2,
        special_requests: "",
      });
      setCheckIn(null);
      setCheckOut(null);
    } catch (err) {
      console.error("Booking failed:", err);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'number_of_guests' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <Card className="shadow-soft-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Complete Your Booking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Kalendern */}
        <PropertyCalendarOptimized
          propertyId={propertyId}
          basePrice={pricePerNight}
          currency={currency}
          mode="guest"
          onDateSelect={({ checkIn, checkOut }) => {
            setCheckIn(checkIn);
            setCheckOut(checkOut);
          }}
        />

        {/* Sammanställning */}
        {checkIn && checkOut && (
          <div className="mt-4 p-4 bg-accent rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Check-in:</span>
              <span className="font-medium">{checkIn.toDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Check-out:</span>
              <span className="font-medium">{checkOut.toDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Number of nights:</span>
              <span className="font-medium">{nights}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{totalAmount.toLocaleString()} {currency}</span>
            </div>
          </div>
        )}

        {/* Gästinfo */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="number_of_guests">Number of guests (max {maxGuests})</Label>
            <Input
              id="number_of_guests"
              name="number_of_guests"
              type="number"
              min="1"
              max={maxGuests}
              value={formData.number_of_guests}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_name">Your name</Label>
            <Input
              id="guest_name"
              name="guest_name"
              value={formData.guest_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_email">Email</Label>
            <Input
              id="guest_email"
              name="guest_email"
              type="email"
              value={formData.guest_email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_phone">Phone (optional)</Label>
            <Input
              id="guest_phone"
              name="guest_phone"
              type="tel"
              value={formData.guest_phone}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_requests">Special requests</Label>
            <Textarea
              id="special_requests"
              name="special_requests"
              value={formData.special_requests}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || totalAmount <= 0}
          >
            {loading ? 'Sending...' : 'Send booking request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;
