import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, Shield, Tag } from "lucide-react";
import { useBooking } from "@/hooks/useBooking";
import PropertyCalendarOptimized from "@/components/PropertyCalendarOptimized";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { usePricingRules } from "@/hooks/usePricingRules";
import CouponInput from "@/components/CouponInput";
import { CancellationPolicyDisplay } from "@/components/CancellationPolicyDisplay";
import { z } from "zod";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";

interface BookingFormProps {
  propertyId: string;
  propertyTitle: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  onOpenGuidebook?: () => void;
}

interface PropertyDiscounts {
  weekly_discount_percentage: number;
  monthly_discount_percentage: number;
}

const maxAdvanceBookingDays = 365;

// BUG-052: TODO - Use i18n system from src/lib/i18n/ instead of hardcoded Swedish strings
const BookingForm: React.FC<BookingFormProps> = ({
  propertyId,
  propertyTitle,
  pricePerNight,
  currency,
  maxGuests,
  onOpenGuidebook
}) => {
  const { createBooking, loading } = useBooking();
  const { calculatePrice } = usePricingRules(propertyId);
  const [propertyDiscounts, setPropertyDiscounts] = useState<PropertyDiscounts>({
    weekly_discount_percentage: 0,
    monthly_discount_percentage: 0
  });
  
  // Fetch property discounts
  useEffect(() => {
    const fetchDiscounts = async () => {
      const { data } = await supabase
        .from('properties')
        .select('weekly_discount_percentage, monthly_discount_percentage')
        .eq('id', propertyId)
        .single();
      
      if (data) {
        setPropertyDiscounts({
          weekly_discount_percentage: data.weekly_discount_percentage || 0,
          monthly_discount_percentage: data.monthly_discount_percentage || 0
        });
      }
    };
    fetchDiscounts();
  }, [propertyId]);
  
  // Enable real-time calendar updates when bookings are made
  useBookingRealtime({
    onBookingUpdate: (booking) => {
      if (booking.property_id === propertyId && booking.status === 'confirmed') {
        // Calendar will automatically refresh due to real-time subscription
      }
    }
  });

  // BUG-036: Clear/revalidate applied coupon when dates change
  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(undefined);
    }
  }, [checkIn, checkOut]);

  // Input validation schema with sanitization via transforms
  const bookingSchema = z.object({
    guest_name: z.string()
      .transform(val => DOMPurify.sanitize(val.trim()))
      .pipe(z.string()
        .min(2, "Name must be at least 2 characters")
        .max(100, "Name must be less than 100 characters")
        .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Name contains invalid characters")),
    guest_email: z.string()
      .transform(val => DOMPurify.sanitize(val.trim()))
      .pipe(z.string()
        .email("Invalid email address")
        .max(255, "Email must be less than 255 characters")),
    guest_phone: z.string()
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val.trim()) : '')
      .pipe(z.string()
        .refine((val) => !val || /^[\+]?[0-9\s\-\(\)]{7,15}$/.test(val), "Invalid phone number")),
    number_of_guests: z.number()
      .min(1, "At least 1 guest required")
      .max(maxGuests, `Maximum ${maxGuests} guests allowed`),
    special_requests: z.string()
      .optional()
      .transform(val => val ? DOMPurify.sanitize(val.trim()) : '')
      .pipe(z.string()
        .max(1000, "Special requests must be less than 1000 characters"))
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
  
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountAmount: number;
  } | undefined>();

  const calculateTotalAmount = () => {
    if (!checkIn || !checkOut) return null;
    // pricePerNight is in SEK, convert to cents for calculation
    const calculation = calculatePrice(
      pricePerNight * 100,
      checkIn,
      checkOut,
      formData.number_of_guests
    );
    return calculation;
  };

  // BUG-035: Use UTC-based calculation to avoid DST issues
  const nights = checkIn && checkOut
    ? Math.round((Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()) - Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate())) / 86400000)
    : 0;

  // Determine applicable discount based on stay length
  const getApplicableDiscount = () => {
    if (nights >= 28 && propertyDiscounts.monthly_discount_percentage > 0) {
      return { type: 'monthly', percentage: propertyDiscounts.monthly_discount_percentage };
    }
    if (nights >= 7 && propertyDiscounts.weekly_discount_percentage > 0) {
      return { type: 'weekly', percentage: propertyDiscounts.weekly_discount_percentage };
    }
    return null;
  };

  const priceCalculation = calculateTotalAmount();
  const subtotalBeforeDiscount = priceCalculation?.total || 0;
  const applicableDiscount = getApplicableDiscount();
  const stayDiscount = applicableDiscount 
    ? Math.round(subtotalBeforeDiscount * (applicableDiscount.percentage / 100))
    : 0;
  const subtotal = subtotalBeforeDiscount - stayDiscount;
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const totalAmount = Math.max(0, subtotal - couponDiscount);

  const validateForm = () => {
    try {
      // Schema automatically sanitizes inputs via transforms
      const validatedData = bookingSchema.parse(formData);
      setValidationErrors({});
      return validatedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((err) => {
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

    // Additional date validation - BUG-009: Normalize dates to UTC midnight for consistent comparison
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const checkInUTC = new Date(Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()));

    if (checkInUTC < todayUTC) {
      setValidationErrors({ checkIn: "Check-in date cannot be in the past" });
      return;
    }
    if (checkOut <= checkIn) {
      setValidationErrors({ checkOut: "Check-out must be after check-in date" });
      return;
    }

    // Check max advance booking window
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays);
    if (checkIn > maxDate) {
      setValidationErrors({ checkIn: `Check-in date cannot be more than ${maxAdvanceBookingDays} days in advance` });
      return;
    }
  
    try {
      await createBooking({
        property_id: propertyId,
        total_amount: totalAmount,
        currency,
        check_in_date: `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, '0')}-${String(checkIn.getDate()).padStart(2, '0')}`,
        check_out_date: `${checkOut.getFullYear()}-${String(checkOut.getMonth() + 1).padStart(2, '0')}-${String(checkOut.getDate()).padStart(2, '0')}`,
        guest_name: validatedData.guest_name,
        guest_email: validatedData.guest_email,
        guest_phone: validatedData.guest_phone,
        number_of_guests: validatedData.number_of_guests,
        special_requests: validatedData.special_requests,
        coupon_id: appliedCoupon?.id
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
      setAppliedCoupon(undefined);
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

          {/* Sammanställning */}
          {checkIn && checkOut && priceCalculation && (
            <div className="p-4 bg-accent rounded-lg space-y-3">
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
              
              {/* Price Breakdown */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{nights} night{nights !== 1 ? 's' : ''} × {pricePerNight.toLocaleString()} {currency}</span>
                  <span>{(priceCalculation.breakdown.accommodation / 100).toLocaleString()} {currency}</span>
                </div>
                
                {priceCalculation.cleaningFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Cleaning fee</span>
                    <span>{(priceCalculation.cleaningFee / 100).toLocaleString()} {currency}</span>
                  </div>
                )}
                
                {priceCalculation.extraGuestFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Extra guest fee ({Math.max(0, formData.number_of_guests - 1)} guest{Math.max(0, formData.number_of_guests - 1) !== 1 ? 's' : ''} × {nights} night{nights !== 1 ? 's' : ''})</span>
                    <span>{(priceCalculation.extraGuestFee / 100).toLocaleString()} {currency}</span>
                  </div>
                )}
                
                {priceCalculation.extraServices > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Additional services</span>
                    <span>{(priceCalculation.extraServices / 100).toLocaleString()} {currency}</span>
                  </div>
                )}
                
                {/* Weekly/Monthly Discount */}
                {applicableDiscount && stayDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {applicableDiscount.type === 'monthly' ? 'Monthly' : 'Weekly'} discount ({applicableDiscount.percentage}%)
                    </span>
                    <span>-{(stayDiscount / 100).toLocaleString()} {currency}</span>
                  </div>
                )}
                
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Coupon discount ({appliedCoupon.code})</span>
                    <span>-{(couponDiscount / 100).toLocaleString()} {currency}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total:</span>
                <span>{(totalAmount / 100).toLocaleString()} {currency}</span>
              </div>
            </div>
          )}

          {/* Coupon Input */}
          {checkIn && checkOut && subtotal > 0 && (
            <CouponInput
              propertyId={propertyId}
              totalAmount={subtotal}
              onCouponApplied={(couponId, discountAmount, code) => {
                setAppliedCoupon({
                  id: couponId,
                  code: code,
                  discountAmount
                });
              }}
              onCouponRemoved={() => setAppliedCoupon(undefined)}
              appliedCoupon={appliedCoupon}
            />
          )}

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
              aria-describedby={validationErrors.guest_name ? "guest_name-error" : undefined}
            />
            {validationErrors.guest_name && (
              <p id="guest_name-error" className="text-destructive text-sm" role="alert">{validationErrors.guest_name}</p>
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
              aria-describedby={validationErrors.guest_email ? "guest_email-error" : undefined}
            />
            {validationErrors.guest_email && (
              <p id="guest_email-error" className="text-destructive text-sm" role="alert">{validationErrors.guest_email}</p>
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
              aria-describedby={validationErrors.guest_phone ? "guest_phone-error" : undefined}
            />
            {validationErrors.guest_phone && (
              <p id="guest_phone-error" className="text-destructive text-sm" role="alert">{validationErrors.guest_phone}</p>
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
              aria-describedby={validationErrors.special_requests ? "special_requests-error" : undefined}
            />
            {validationErrors.special_requests && (
              <p id="special_requests-error" className="text-destructive text-sm" role="alert">{validationErrors.special_requests}</p>
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
                  I have read and agree to the{" "}
                  {onOpenGuidebook ? (
                    <button
                      type="button"
                      onClick={onOpenGuidebook}
                      className="text-primary underline hover:text-primary/80"
                    >
                      House Rules
                    </button>
                  ) : (
                    "House Rules"
                  )}
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

          {/* Cancellation Policy */}
          <CancellationPolicyDisplay />

          {/* BUG-054: Sticky submit button on mobile to keep it in view */}
          <div className="sticky bottom-0 bg-white p-4 border-t md:static md:bg-transparent md:p-0 md:border-0">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || totalAmount <= 0 || !houseRulesAccepted}
            >
              {loading ? 'Processing...' : `Complete Your Booking • ${(totalAmount / 100).toLocaleString()} ${currency}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;
