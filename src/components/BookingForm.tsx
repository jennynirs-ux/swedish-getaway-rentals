import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, Shield } from "lucide-react";
import { useBooking } from "@/hooks/useBooking";
import PropertyCalendarOptimized from "@/components/PropertyCalendarOptimized";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { z } from "zod";
import DOMPurify from "dompurify";

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

  // Input validation schema
  const bookingSchema = z.object({
    guest_name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters")
      .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Name contains invalid characters"),
    guest_email: z.string()
      .email("Invalid email address")
      .max(255, "Email must be less than 255 characters"),
    guest_phone: z.string()
      .optional()
      .refine((val) => !val || /^[\+]?[0-9\s\-\(\)]{7,15}$/.test(val), "Invalid phone number"),
    number_of_guests: z.number()
      .min(1, "At least 1 guest required")
      .max(maxGuests, `Maximum ${maxGuests} guests allowed`),
    special_requests: z.string()
      .max(1000, "Special requests must be less than 1000 characters")
      .optional()
  });

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    number_of_guests: 2,
    special_requests: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [houseRulesAccepted, setHouseRulesAccepted] = useState(false);

  const calculateTotalAmount = () => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights * pricePerNight : 0;
  };

  const nights = checkIn && checkOut
    ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalAmount = calculateTotalAmount();

  const validateForm = () => {
    try {
      const sanitizedData = {
        ...formData,
        guest_name: DOMPurify.sanitize(formData.guest_name.trim()),
        guest_email: DOMPurify.sanitize(formData.guest_email.trim()),
        guest_phone: formData.guest_phone ? DOMPurify.sanitize(formData.guest_phone.trim()) : '',
        special_requests: formData.special_requests ? DOMPurify.sanitize(formData.special_requests.trim()) : ''
      };
      
      bookingSchema.parse(sanitizedData);
      setValidationErrors({});
      return sanitizedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount <= 0) return;

    if (!houseRulesAccepted) {
      setValidationErrors({ houseRules: "You must accept the house rules to proceed" });
      return;
    }

    const validatedData = validateForm();
    if (!validatedData || !checkIn || !checkOut) return;

    // Additional date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkIn < today) {
      setValidationErrors({ checkIn: "Check-in date cannot be in the past" });
      return;
    }
    if (checkOut <= checkIn) {
      setValidationErrors({ checkOut: "Check-out must be after check-in date" });
      return;
    }
  
    try {
      await createBooking({
        property_id: propertyId,
        total_amount: totalAmount,
        currency,
        check_in_date: checkIn.toISOString().split("T")[0],
        check_out_date: checkOut.toISOString().split("T")[0],
        guest_name: validatedData.guest_name,
        guest_email: validatedData.guest_email,
        guest_phone: validatedData.guest_phone,
        number_of_guests: validatedData.number_of_guests,
        special_requests: validatedData.special_requests
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
      setValidationErrors({});
    } catch (err) {
      console.error("Booking failed:", err);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
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
              maxLength={100}
              required
              className={validationErrors.guest_name ? "border-destructive" : ""}
            />
            {validationErrors.guest_name && (
              <p className="text-destructive text-sm">{validationErrors.guest_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_email">Email</Label>
            <Input
              id="guest_email"
              name="guest_email"
              type="email"
              value={formData.guest_email}
              onChange={handleChange}
              maxLength={255}
              required
              className={validationErrors.guest_email ? "border-destructive" : ""}
            />
            {validationErrors.guest_email && (
              <p className="text-destructive text-sm">{validationErrors.guest_email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest_phone">Phone (optional)</Label>
            <Input
              id="guest_phone"
              name="guest_phone"
              type="tel"
              value={formData.guest_phone}
              onChange={handleChange}
              maxLength={15}
              className={validationErrors.guest_phone ? "border-destructive" : ""}
            />
            {validationErrors.guest_phone && (
              <p className="text-destructive text-sm">{validationErrors.guest_phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="special_requests">Special requests</Label>
            <Textarea
              id="special_requests"
              name="special_requests"
              value={formData.special_requests}
              onChange={handleChange}
              maxLength={1000}
              rows={3}
              className={validationErrors.special_requests ? "border-destructive" : ""}
            />
            {validationErrors.special_requests && (
              <p className="text-destructive text-sm">{validationErrors.special_requests}</p>
            )}
          </div>

          {/* House Rules Acceptance */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="houseRules"
                checked={houseRulesAccepted}
                onCheckedChange={(checked) => {
                  setHouseRulesAccepted(checked as boolean);
                  if (validationErrors.houseRules) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.houseRules;
                      return newErrors;
                    });
                  }
                }}
                className={validationErrors.houseRules ? "border-destructive" : ""}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="houseRules"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="h-4 w-4 text-primary" />
                  I have read and agree to the House Rules
                </label>
                <p className="text-sm text-muted-foreground">
                  You'll receive a link to the full guest guidebook after booking
                </p>
                {validationErrors.houseRules && (
                  <p className="text-destructive text-sm">{validationErrors.houseRules}</p>
                )}
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || totalAmount <= 0 || !houseRulesAccepted}
          >
            {loading ? 'Sending...' : 'Send booking request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;
