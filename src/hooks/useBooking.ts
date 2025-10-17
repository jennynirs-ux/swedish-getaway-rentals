import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
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
      const { data, error } = await supabase.rpc('check_booking_conflict', {
        property_id_param: propertyId,
        check_in_param: checkIn,
        check_out_param: checkOut
      });

      if (error) throw error;
      return !data; // Returns true if no conflict (available)
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
      const { data, error } = await supabase.functions.invoke('create-booking-payment-connect', {
        body: {
          propertyId: bookingData.property_id,
          checkInDate: bookingData.check_in_date,
          checkOutDate: bookingData.check_out_date,
          numberOfGuests: bookingData.number_of_guests,
          guestName: bookingData.guest_name,
          guestEmail: bookingData.guest_email,
          guestPhone: bookingData.guest_phone,
          specialRequests: bookingData.special_requests,
          totalAmount: bookingData.total_amount,
          currency: bookingData.currency
        }
      });

      if (error) {
        throw error;
      }

      // Generate Yale access code if property has smart lock configured
      if (data?.bookingId) {
        try {
          await supabase.functions.invoke('generate-yale-code', {
            body: {
              bookingId: data.bookingId,
              propertyId: bookingData.property_id,
              checkInDate: bookingData.check_in_date,
              checkOutDate: bookingData.check_out_date,
            }
          });
        } catch (codeError) {
          console.error('Failed to generate Yale code:', codeError);
          // Don't fail the booking if code generation fails
        }
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecting to payment",
          description: "You will be redirected to complete the payment.",
        });
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
