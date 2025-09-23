import { useState, useEffect, useCallback } from 'react';
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

export const useBookingChat = (bookingId?: string) => {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const fetchMessages = useCallback(async () => {
    if (!bookingId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('booking_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as BookingMessage[]);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [bookingId, toast]);

  const sendMessage = useCallback(async (
    message: string, 
    senderType: 'guest' | 'host' | 'admin'
  ) => {
    if (!bookingId || !message.trim()) return;

    try {
      setSending(true);
      const { data, error } = await supabase
        .from('booking_messages')
        .insert({
          booking_id: bookingId,
          sender_type: senderType,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          message: message.trim(),
          message_type: 'text'
        })
        .select()
        .single();

      if (error) throw error;
      
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
          setMessages(prev => [...prev, payload.new as BookingMessage]);
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
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? payload.new as BookingMessage : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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
      
      // Get user profile to check if host or admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, is_admin, is_host')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

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

      // Filter by host if not admin
      if (!profile.is_admin && profile.is_host) {
        query = query.eq('properties.host_id', profile.id);
      }

      const { data: bookings, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Process data efficiently
      const chatInfos: BookingChatInfo[] = (bookings || []).map(booking => {
        const messages = (booking as any).booking_messages || [];
        const sortedMessages = messages.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const unreadCount = messages.filter((msg: any) => 
          !msg.read_by_host && msg.sender_type !== 'host'
        ).length;

        return {
          booking_id: booking.id,
          property_title: (booking as any).properties.title,
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