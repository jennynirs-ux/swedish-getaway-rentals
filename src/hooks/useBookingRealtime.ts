import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseBookingRealtimeOptions {
  onBookingUpdate?: (booking: any) => void;
  enableAdminNotifications?: boolean;
}

export const useBookingRealtime = (options: UseBookingRealtimeOptions = {}) => {
  const { onBookingUpdate, enableAdminNotifications = false } = options;

  // Exponential backoff state
  const retryCountRef = useRef(0);
  const maxRetriesRef = useRef(5);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const calculateBackoffDelay = (retryCount: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delayMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
    return delayMs;
  };

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

  const subscribeToBookings = useCallback(() => {
    try {
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
        // Reconnection error handling
        .on('system', { event: 'CHANNEL_ERROR' }, () => {
          console.warn('Booking channel error, attempting reconnection...');
          handleReconnection();
        })
        .on('system', { event: 'TIMED_OUT' }, () => {
          console.warn('Booking channel timed out, attempting reconnection...');
          handleReconnection();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Reset retry counter on successful subscription
            retryCountRef.current = 0;
            if (import.meta.env.DEV) console.log('Booking realtime subscription established');
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Failed to subscribe to bookings:', error);
      handleReconnection();
    }
  }, [handleBookingInsert, handleBookingUpdate]);

  const handleReconnection = useCallback(() => {
    if (retryCountRef.current >= maxRetriesRef.current) {
      console.error(`Max reconnection attempts (${maxRetriesRef.current}) reached. Giving up.`);
      toast.error('Failed to connect to booking updates. Please refresh the page.');
      return;
    }

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clear any pending timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Calculate delay with exponential backoff
    const delayMs = calculateBackoffDelay(retryCountRef.current);
    retryCountRef.current += 1;

    if (import.meta.env.DEV) console.log(`Reconnecting in ${delayMs}ms (attempt ${retryCountRef.current}/${maxRetriesRef.current})`);

    // Schedule reconnection
    reconnectTimeoutRef.current = setTimeout(() => {
      subscribeToBookings();
    }, delayMs);
  }, [subscribeToBookings]);

  useEffect(() => {
    subscribeToBookings();

    return () => {
      // Cleanup
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [subscribeToBookings]);

  return {
    // This hook manages subscriptions internally with automatic reconnection
  };
};