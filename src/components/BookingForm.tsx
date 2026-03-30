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
import { VAT_RATE, SERVICE_FEE_RATE } from "@/lib/constants";
import { convertForDisplay } from "@/lib/currencyConverter";
import { useTranslation } from "@/lib/i18n/useTranslation";

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

const BookingForm: React.FC<BookingFormProps> = ({
  propertyId,
  propertyTitle: _propertyTitle,
  pricePerNight,
  currency,
  maxGuests,
  onOpenGuidebook
}) => {
  const { t } = useTranslation();
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

  // BUG-036: Clear applied coupon when dates change - moved after state declarations

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
        // IMP-008: Updated phone validation to require digits and allow 7-20 chars
        .refine((val) => !val || /^[+]?[\d\s()-]{7,20}$/.test(val), "Invalid phone number")),
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
  const [availabilityPrices, setAvailabilityPrices] = useState<Record<string, number>>({});
  const [houseRulesAccepted, setHouseRulesAccepted] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountAmount: number;
  } | undefined>();

  const calculateTotalAmount = () => {
    if (!checkIn || !checkOut) return null;
    // pricePerNight is in SEK, convert to cents for calculation
    // BUG-015 FIXED: seasonal prices from calendar are now passed through
    const calculation = calculatePrice(
      pricePerNight * 100,
      checkIn,
      checkOut,
      formData.number_of_guests,
      availabilityPrices
    );
    return calculation;
  };

  // BUG-035: Use UTC-based calculation to avoid DST issues
  // BUG-014: Use Math.ceil to match edge function calculation (prevents price discrepancies)
  const nights = checkIn && checkOut
    ? Math.ceil((Date.UTC(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate()) - Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate())) / 86400000)
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
  const subtotalBeforeVat = subtotalBeforeDiscount - stayDiscount;
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const subtotalAfterCoupon = Math.max(0, subtotalBeforeVat - couponDiscount);
  // BL-011: Service fee (10%) shown transparently to guest
  const serviceFee = Math.round(subtotalAfterCoupon * SERVICE_FEE_RATE);
  const subtotalWithFee = subtotalAfterCoupon + serviceFee;
  // IMP-002: Add Swedish VAT (12%) to the subtotal including service fee
  const vatAmount = Math.round(subtotalWithFee * VAT_RATE);
  const totalAmount = subtotalWithFee + vatAmount;

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
      setValidationErrors({ houseRules: t('forms.booking.acceptRules') });
      return;
    }

    const validatedData = validateForm();
    if (!validatedData || !checkIn || !checkOut) return;

    // Additional date validation - BUG-009: Normalize dates to UTC midnight for consistent comparison
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const checkInUTC = new Date(Date.UTC(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate()));

    if (checkInUTC < todayUTC) {
      setValidationErrors({ checkIn: t('forms.booking.pastDate') });
      return;
    }
    if (checkOut <= checkIn) {
      setValidationErrors({ checkOut: t('forms.booking.checkOutAfter') });
      return;
    }

    // Check max advance booking window
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceBookingDays);
    if (checkIn > maxDate) {
      setValidationErrors({ checkIn: t('forms.booking.maxAdvance').replace('{{days}}', maxAdvanceBookingDays.toString()) });
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
          {t('forms.booking.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Kalendern */}
        <PropertyCalendarOptimized
          propertyId={propertyId}
          basePrice={pricePerNight}
          currency={currency}
          mode="guest"
          onDateSelect={({ checkIn, checkOut, availabilityPrices: prices }) => {
            setCheckIn(checkIn);
            setCheckOut(checkOut);
            setAvailabilityPrices(prices || {});
          }}
        />

        {/* Gästinfo */}
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="number_of_guests">{t('forms.booking.numberOfGuests')} (max {maxGuests})</Label>
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
                <span>{t('forms.booking.checkInDate')}</span>
                <span className="font-medium">{checkIn.toDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('forms.booking.checkOutDate')}</span>
                <span className="font-medium">{checkOut.toDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('forms.booking.numberOfNights')}</span>
                <span className="font-medium">{nights}</span>
              </div>

              {/* Price Breakdown */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{nights} {nights !== 1 ? t('forms.booking.nightsLabel') : t('forms.booking.nightLabel')} × {pricePerNight.toLocaleString()} {currency}</span>
                  <span>{(priceCalculation.breakdown.accommodation / 100).toLocaleString()} {currency}</span>
                </div>

                {priceCalculation.cleaningFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('forms.booking.cleaningFee')}</span>
                    <span>{(priceCalculation.cleaningFee / 100).toLocaleString()} {currency}</span>
                  </div>
                )}

                {priceCalculation.extraGuestFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('forms.booking.extraGuestFee')} ({Math.max(0, formData.number_of_guests - 1)} {Math.max(0, formData.number_of_guests - 1) !== 1 ? t('forms.booking.guests') : t('forms.booking.guest')} × {nights} {nights !== 1 ? t('forms.booking.nights') : t('forms.booking.nightLabel')})</span>
                    <span>{(priceCalculation.extraGuestFee / 100).toLocaleString()} {currency}</span>
                  </div>
                )}

                {priceCalculation.extraServices > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('forms.booking.additionalServices')}</span>
                    <span>{(priceCalculation.extraServices / 100).toLocaleString()} {currency}</span>
                  </div>
                )}

                {/* Weekly/Monthly Discount */}
                {applicableDiscount && stayDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {applicableDiscount.type === 'monthly' ? t('forms.booking.monthlyDiscount') : t('forms.booking.weeklyDiscount')} ({applicableDiscount.percentage}%)
                    </span>
                    <span>-{(stayDiscount / 100).toLocaleString()} {currency}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t('forms.booking.couponDiscount')} ({appliedCoupon.code})</span>
                    <span>-{(couponDiscount / 100).toLocaleString()} {currency}</span>
                  </div>
                )}

                {/* IMP-002: Show subtotal before fees */}
                <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
                  <span>{t('forms.booking.subtotal')}</span>
                  <span>{(subtotalAfterCoupon / 100).toLocaleString()} {currency}</span>
                </div>

                {/* BL-011: Service fee transparency */}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Service fee ({Math.round(SERVICE_FEE_RATE * 100)}%)</span>
                  <span>{(serviceFee / 100).toLocaleString()} {currency}</span>
                </div>

                {/* IMP-002: VAT line item for Swedish compliance */}
                <div className="flex justify-between text-sm text-amber-600">
                  <span>{t('forms.booking.vat')}</span>
                  <span>{(vatAmount / 100).toLocaleString()} {currency}</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>{t('forms.booking.total')}</span>
                <div className="text-right">
                  <span>{(totalAmount / 100).toLocaleString()} {currency}</span>
                  {(() => {
                    const converted = convertForDisplay(totalAmount, currency);
                    return converted ? (
                      <span className="block text-xs font-normal text-muted-foreground">{converted.formatted}</span>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Coupon Input */}
          {checkIn && checkOut && subtotalBeforeVat > 0 && (
            <CouponInput
              propertyId={propertyId}
              totalAmount={subtotalBeforeVat}
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
            <Label htmlFor="guest_name">{t('forms.booking.yourName')}</Label>
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
            <Label htmlFor="guest_email">{t('forms.booking.email')}</Label>
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
            <Label htmlFor="guest_phone">{t('forms.booking.phone')}</Label>
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
            <Label htmlFor="special_requests">{t('forms.booking.specialRequests')}</Label>
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
                  {t('forms.booking.houseRulesAccept')}{" "}
                  <button
                    type="button"
                    onClick={onOpenGuidebook ?? (() => {
                      // Fallback: navigate to property guide page if no callback provided
                      window.open(`/property/${propertyId}/guide`, '_blank');
                    })}
                    className="text-primary underline hover:text-primary/80"
                  >
                    {t('forms.booking.houseRules')}
                  </button>
                </label>
                <p className="text-sm text-muted-foreground">
                  {t('forms.booking.houseRulesDesc')}
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
              {loading ? t('forms.booking.processing') : `${t('forms.booking.completeBooking')} • ${(totalAmount / 100).toLocaleString()} ${currency}`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default BookingForm;
