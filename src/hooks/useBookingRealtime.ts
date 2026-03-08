import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UseBookingRealtimeOptions {
  onBookingUpdate?: (booking: any) => void;
  enableAdminNotifications?: boolean;
}

export const useBookingRealtime = (options: UseBookingRealtimeOptions = {}) => {
  const { onBookingUpdate, enableAdminNotifications = false } = options;

  const handleBookingInsert = useCallback((payload: any) => {
    
    
    if (enableAdminNotifications) {
      toast({
        title: "New Booking Received!",
        description: `${payload.new.guest_name} has made a booking for ${payload.new.property_id}`,
        duration: 10000,
      });
    }

    onBookingUpdate?.(payload.new);
  }, [onBookingUpdate, enableAdminNotifications]);

  const handleBookingUpdate = useCallback((payload: any) => {
    
    
    if (enableAdminNotifications && payload.new.status === 'confirmed') {
      toast({
        title: "Booking Confirmed!",
        description: `Booking by ${payload.new.guest_name} has been confirmed`,
        duration: 5000,
      });
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