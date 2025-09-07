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

  const createBooking = async (bookingData: BookingData) => {
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

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      // Create a guest message for the booking inquiry
      await supabase.from('guest_messages').insert([{
        name: bookingData.guest_name,
        email: bookingData.guest_email,
        phone: bookingData.guest_phone,
        property_id: bookingData.property_id,
        subject: 'Bokningsförfrågan',
        message: `Ny bokningsförfrågan för ${bookingData.check_in_date} till ${bookingData.check_out_date} för ${bookingData.number_of_guests} gäster. Specialönskemål: ${bookingData.special_requests || 'Inga'}`
      }]);

      toast({
        title: "Bokningsförfrågan skickad!",
        description: "Vi kommer att kontakta dig inom 24 timmar för att bekräfta din bokning.",
      });

      return { success: true, data };
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skicka bokningsförfrågan. Försök igen.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { createBooking, checkAvailability, loading };
};