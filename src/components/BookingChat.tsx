import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { format } from 'date-fns';
import { Send, User, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBookingChat, BookingMessage } from '@/hooks/useBookingChat';

interface BookingChatProps {
  bookingId: string;
  userType: 'guest' | 'host' | 'admin';
  bookingInfo?: {
    property_title: string;
    guest_name: string;
    check_in_date: string;
    check_out_date: string;
  };
}

const ChatMessage: React.FC<{ 
  message: BookingMessage; 
  userType: 'guest' | 'host' | 'admin';
}> = ({ message, userType }) => {
  const isOwnMessage = message.sender_type === userType;
  const isSystem = message.sender_type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <Badge variant="secondary" className="text-xs">
          {message.message}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-center mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <div className="flex items-center gap-2">
            {message.sender_type === 'host' ? (
              <UserCheck className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium capitalize">
              {message.sender_type}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.created_at), 'HH:mm')}
            </span>
          </div>
        </div>
        <div
          className={`p-3 rounded-lg ${
            isOwnMessage
              ? 'bg-primary text-primary-foreground ml-4'
              : 'bg-muted mr-4'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
        </div>
      </div>
    </div>
  );
};

export const BookingChat: React.FC<BookingChatProps> = ({
  bookingId,
  userType,
  bookingInfo
}) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);
  const { messages, loading, sending, sendMessage, markAsRead } = useBookingChat(bookingId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    await sendMessage(newMessage);
    setNewMessage('');
  };

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    if (messages.length > 0 && userType !== 'admin') {
      markAsRead(userType);
    }
  }, [messages, userType, markAsRead]);

  // Auto-scroll to bottom when new messages arrive using useLayoutEffect to prevent race conditions
  useLayoutEffect(() => {
    // Only scroll if new messages have arrived
    if (messages.length > lastMessageCountRef.current) {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages]);

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Chat
          {bookingInfo && (
            <div className="text-sm font-normal text-muted-foreground mt-1">
              {bookingInfo.property_title} • {bookingInfo.guest_name}
              <br />
              {format(new Date(bookingInfo.check_in_date), 'MMM d')} - {format(new Date(bookingInfo.check_out_date), 'MMM d, yyyy')}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-muted-foreground mb-2">No messages yet</div>
              <div className="text-sm text-muted-foreground">
                Start the conversation by sending a message below
              </div>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  userType={userType}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" disabled={!newMessage.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};