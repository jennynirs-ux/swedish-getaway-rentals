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
          title: "Tyvärr",
          description: "De valda datumen är inte tillgängliga. Välj andra datum.",
          variant: "destructive",
        });
        return { success: false, error: 'Dates not available' };
      }

      // Create Stripe payment session
      const { data, error } = await supabase.functions.invoke('create-booking-payment', {
        body: {
          bookingData: {
            ...bookingData,
            property_title: bookingData.property_title || 'Property Booking',
            currency: bookingData.currency || 'SEK'
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.open(data.url, '_blank');
        
        toast({
          title: "Omdirigerar till betalning",
          description: "Du kommer att omdirigeras för att slutföra betalningen.",
        });
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating booking payment:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skapa betalning. Försök igen.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { createBooking, checkAvailability, loading };
};