import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { type Copy, useCopy, useLang } from "@/i18n";

const en = {
  sorry: "Sorry",
  datesTaken: "The selected dates are not available. Please choose different dates.",
  error: "Error",
  paymentFailed: "Could not create payment. Please try again.",
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    sorry: "Tyvärr",
    datesTaken: "Datumen du valt är inte lediga. Välj andra datum.",
    error: "Något gick fel",
    paymentFailed: "Det gick inte att starta betalningen. Försök igen.",
  },
  de: {
    sorry: "Leider",
    datesTaken: "Die gewählten Daten sind nicht verfügbar. Bitte wähle andere Daten.",
    error: "Fehler",
    paymentFailed: "Die Zahlung konnte nicht gestartet werden. Bitte versuche es erneut.",
  },
};

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
  /** Ids of the extras the guest added (properties_pricing_rules) */
  extras?: string[];
  /** Guest confirmed the listing's minimum age (and no parties, unless the host allows them) */
  rules_confirmed: boolean;
  /** The cancellation policy and minimum age the form showed; the server refuses if the listing's differ now */
  shown_policy?: string;
  shown_min_age?: number;
}

export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = useCopy(COPY);
  const lang = useLang();

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
          title: t.sorry,
          description: t.datesTaken,
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
          currency: bookingData.currency,
          couponId: bookingData.coupon_id,
          extras: bookingData.extras ?? [],
          rulesConfirmed: bookingData.rules_confirmed,
          shownPolicy: bookingData.shown_policy,
          shownMinAge: bookingData.shown_min_age,
          // Stripe's page in the guest's language, and back to the site in it
          lang
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout in the same window to avoid popup blockers
        window.location.href = data.url;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error creating booking payment:', error);
      // Show the payment function's reason (house rules, dates taken, price changed)
      let description = t.paymentFailed;
      const response = (error as { context?: Response })?.context;
      if (response && typeof response.json === 'function') {
        const body = await response.json().catch(() => null);
        if (typeof body?.error === 'string') description = body.error;
      }
      toast({
        title: t.error,
        description,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  return { createBooking, checkAvailability, loading };
};
