import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseBookingRealtimeOptions {
  onBookingUpdate?: (booking: any) => void;
  enableAdminNotifications?: boolean;
}

export const useBookingRealtime = (options: UseBookingRealtimeOptions = {}) => {
  const { onBookingUpdate, enableAdminNotifications = false } = options;

  // TODO: Add detailed error handling and retry logic for failed subscriptions
  // TODO: Consider implementing exponential backoff for connection failures
  const handleBookingInsert = useCallback((payload: any) => {
    if (enableAdminNotifications) {
      toast.info(`${payload.new.guest_name} has made a booking for ${payload.new.property_id}`);
    }

    onBookingUpdate?.(payload.new);
  }, [onBookingUpdate, enableAdminNotifications]);

  const handleBookingUpdate = useCallback((payload: any) => {
    if (enableAdminNotifications && payload.new.status === 'confirmed') {
      toast.success(`Booking by ${payload.new.guest_name} has been confirmed`);
    }

    onBookingUpdate?.(payload.new);
  }, [onBookingUpdate, enableAdminNotifications]);

  useEffect(() => {
    const channel = supabase
      .channel('booking-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        handleBookingInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        handleBookingUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleBookingInsert, handleBookingUpdate]);

  return {
    // This hook manages subscriptions internally
  };
};