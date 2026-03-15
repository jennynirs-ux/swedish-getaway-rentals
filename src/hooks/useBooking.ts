import { useState } from 'react';
import { checkBookingAvailability, createBooking as createBookingService, generateAccessCode } from '@/services/bookingService';
import { useToast } from "@/hooks/use-toast";

export interface BookingData {
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  special_requests?: string;
  total_amount: number;
  coupon_id?: string;
}

export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkAvailability = async (
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<boolean> => {
    try {
      return await checkBookingAvailability(propertyId, checkIn, checkOut);
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  };

  const createBooking = async (bookingData: BookingData & { property_title?: string; currency?: string }) => {
    try {
      setLoading(true);

      // Check availability first
      const isAvailable = await checkAvailability(
        bookingData.property_id,
        bookingData.check_in_date,
        bookingData.check_out_date
      );

      if (!isAvailable) {
        toast({
          title: "Sorry",
          description: "The selected dates are not available. Please choose different dates.",
          variant: "destructive",
        });
        return { success: false, error: 'Dates not available' };
      }

      // Create Stripe Connect payment session
      const data = await createBookingService({
        property_id: bookingData.property_id,
        check_in_date: bookingData.check_in_date,
        check_out_date: bookingData.check_out_date,
        number_of_guests: bookingData.number_of_guests,
        guest_name: bookingData.guest_name,
        guest_email: bookingData.guest_email,
        guest_phone: bookingData.guest_phone,
        special_requests: bookingData.special_requests,
        total_amount: bookingData.total_amount,
        currency: bookingData.currency,
        coupon_id: bookingData.coupon_id
      });

      // Generate Yale access code if property has smart lock configured
      if (data?.bookingId) {
        try {
          await generateAccessCode(
            data.bookingId,
            bookingData.property_id,
            bookingData.check_in_date,
            bookingData.check_out_date
          );
        } catch (codeError) {
          console.error('Failed to generate Yale code:', codeError);
          // Don't fail the booking if code generation fails
        }
      }

      if (data?.url) {
        // BUG-047: Validate redirect URL before navigating
        if (!data.url || !data.url.startsWith('https://')) {
          throw new Error('Invalid checkout URL');
        }
        // Redirect to Stripe Checkout in the same window to avoid popup blockers
        window.location.href = data.url;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating booking payment:', error);
      toast({
        title: "Error",
        description: "Could not create payment. Please try again.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { createBooking, checkAvailability, loading };
};
