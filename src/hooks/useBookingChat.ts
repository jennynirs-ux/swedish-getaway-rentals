import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_type: 'guest' | 'host' | 'admin' | 'system';
  sender_id?: string;
  message: string;
  message_type: 'text' | 'system' | 'attachment';
  read_by_guest: boolean;
  read_by_host: boolean;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingChatInfo {
  booking_id: string;
  property_title: string;
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  unread_count: number;
  last_message?: string;
  last_message_at?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  is_host: boolean;
}

export interface UserRole {
  user_id: string;
  role: string;
}

export interface BookingWithMessages {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  created_at: string;
  properties: {
    title: string;
    host_id: string;
  };
  booking_messages: BookingMessage[];
}

export const useBookingChat = (bookingId?: string) => {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const isMountedRef = useRef(true);
  const { toast } = useToast();

  // BUG-011: Booking messages table missing RLS policies
  // Database RLS policy needed:
  // CREATE POLICY booking_messages_owner ON booking_messages FOR ALL USING (
  //   booking_id IN (
  //     SELECT id FROM bookings
  //     WHERE user_id = auth.uid()
  //     OR property_id IN (SELECT id FROM properties WHERE host_id = auth.uid())
  //   )
  // );
  // Client-side ownership check for defense-in-depth against unauthorized access
  const checkBookingOwnership = useCallback(async (bId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('bookings')
        .select('user_id, property_id, properties(host_id)')
        .eq('id', bId)
        .single();

      if (error || !data) {
        console.error('Error fetching booking ownership info:', error);
        return false;
      }

      // User must be either the booking guest (user_id) or the property host (host_id)
      // This prevents arbitrary authenticated users from accessing messages for bookings they don't own
      const isGuest = data.user_id === user.id;
      const isHost = data.properties?.host_id === user.id;

      if (!isGuest && !isHost) {
        console.warn('Access denied: User is not guest or host for this booking', {
          bookingId: bId,
          userId: user.id,
          guestId: data.user_id,
          hostId: data.properties?.host_id
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking booking ownership:', error);
      return false;
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return;

    try {
      setLoading(true);

      // Defense-in-depth: Check ownership before fetching
      const isOwner = await checkBookingOwnership(bookingId);
      if (!isOwner) {
        throw new Error('Unauthorized: You do not have access to this booking');
      }

      const { data, error } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      // BUG-042: Check if component is still mounted before updating state
      if (isMountedRef.current) {
        setMessages((data || []) as BookingMessage[]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Only show toast if mounted
      if (isMountedRef.current) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load messages",
          variant: "destructive",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [bookingId, toast, checkBookingOwnership]);

  const sendMessage = useCallback(async (
    message: string
  ) => {
    if (!bookingId || !message.trim()) return;

    try {
      setSending(true);

      // Fetch current user's profile to determine their sender type
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_host')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Determine sender type based on user's role
      let senderType: 'guest' | 'host' | 'admin' = 'guest';

      // Check if user is admin
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRole) {
        senderType = 'admin';
      } else if (profile?.is_host) {
        senderType = 'host';
      }

      const { data, error } = await supabase
        .from('booking_messages')
        .insert({
          booking_id: bookingId,
          sender_type: senderType,
          sender_id: user.id,
          message: message.trim(),
          message_type: 'text'
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger AI auto-reply for guest messages (fire-and-forget)
      if (senderType === 'guest' && data?.id) {
        supabase.functions
          .invoke('ai-guest-reply', {
            body: { bookingId, messageId: data.id },
          })
          .then((res) => {
            if (res.error) console.warn('AI auto-reply skipped:', res.error);
          })
          .catch((err) => console.warn('AI auto-reply failed:', err));
      }

      // Message will be added via real-time subscription
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [bookingId, toast]);

  const markAsRead = useCallback(async (senderType: 'guest' | 'host') => {
    if (!bookingId) return;

    try {
      const readField = senderType === 'guest' ? 'read_by_guest' : 'read_by_host';
      const { error } = await supabase
        .from('booking_messages')
        .update({ [readField]: true })
        .eq('booking_id', bookingId)
        .eq(readField, false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [bookingId]);

  // Real-time subscription
  useEffect(() => {
    if (!bookingId) return;

    const channel = supabase
      .channel(`booking-chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          // BUG-042: Check if mounted before state update
          if (isMountedRef.current) {
            setMessages(prev => [...prev, payload.new as BookingMessage]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'booking_messages',
          filter: `booking_id=eq.${bookingId}`
        },
        (payload) => {
          // BUG-042: Check if mounted before state update
          if (isMountedRef.current) {
            setMessages(prev => prev.map(msg =>
              msg.id === payload.new.id ? payload.new as BookingMessage : msg
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Fetch initial messages when bookingId changes
  useEffect(() => {
    if (bookingId) {
      fetchMessages();
    }
  }, [bookingId, fetchMessages]);

  // BUG-042: Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
    refetch: fetchMessages
  };
};

export const useBookingChatList = () => {
  const [chats, setChats] = useState<BookingChatInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);

      // Get user profile to check if host
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, is_host')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      const profile = profileData as UserProfile | null;
      if (!profile) return;

      // Optimized single query with aggregated data
      let query = supabase
        .from('bookings')
        .select(`
          id,
          property_id,
          guest_name,
          guest_email,
          check_in_date,
          check_out_date,
          status,
          created_at,
          properties!inner(title, host_id),
          booking_messages(
            message,
            created_at,
            read_by_host,
            sender_type
          )
        `)
        .eq('status', 'confirmed')
        .limit(50);

      // Filter by host if not admin (check via user_roles)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: adminRoleData, error: adminRoleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminRoleError) throw adminRoleError;

      // Only filter by host_id if user is not admin and is a host
      if (!adminRoleData && profile.is_host) {
        query = query.eq('properties.host_id', profile.id);
      }

      const { data: bookingsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Process data efficiently with proper typing
      const bookings = bookingsData as BookingWithMessages[] | null;
      const chatInfos: BookingChatInfo[] = (bookings || []).map(booking => {
        const messages = booking.booking_messages || [];
        const sortedMessages = messages.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        const unreadCount = messages.filter(msg =>
          !msg.read_by_host && msg.sender_type !== 'host'
        ).length;

        return {
          booking_id: booking.id,
          property_title: booking.properties.title,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          unread_count: unreadCount,
          last_message: sortedMessages[0]?.message,
          last_message_at: sortedMessages[0]?.created_at
        };
      });

      setChats(chatInfos);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        title: "Error",
        description: "Failed to load chats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    loading,
    refetch: fetchChats
  };
};