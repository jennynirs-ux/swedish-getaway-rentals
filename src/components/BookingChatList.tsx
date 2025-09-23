import React, { useState } from 'react';
import { format } from 'date-fns';
import { MessageCircle, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookingChat } from './BookingChat';
import { useBookingChatList } from '@/hooks/useBookingChat';

export const BookingChatList: React.FC = () => {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBookingInfo, setSelectedBookingInfo] = useState<any>(null);
  const { chats, loading, refetch } = useBookingChatList();

  const handleChatClick = (chat: any) => {
    setSelectedBookingId(chat.booking_id);
    setSelectedBookingInfo({
      property_title: chat.property_title,
      guest_name: chat.guest_name,
      check_in_date: chat.check_in_date,
      check_out_date: chat.check_out_date
    });
  };

  const handleCloseChat = () => {
    setSelectedBookingId(null);
    setSelectedBookingInfo(null);
    refetch(); // Refresh the chat list to update unread counts
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Guest Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Guest Messages
            {chats.some(chat => chat.unread_count > 0) && (
              <Badge variant="destructive" className="ml-auto">
                {chats.reduce((sum, chat) => sum + chat.unread_count, 0)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No guest conversations yet</p>
              <p className="text-sm">Messages from confirmed bookings will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.booking_id}
                    onClick={() => handleChatClick(chat)}
                    className="p-4 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{chat.guest_name}</span>
                          {chat.unread_count > 0 && (
                            <Badge variant="destructive" className="ml-auto">
                              {chat.unread_count}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          {chat.property_title}
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(chat.check_in_date), 'MMM d')} - {format(new Date(chat.check_out_date), 'MMM d, yyyy')}
                        </div>
                        
                        {chat.last_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.last_message}
                          </p>
                        )}
                        
                        {chat.last_message_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(chat.last_message_at), 'MMM d, HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBookingId} onOpenChange={handleCloseChat}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Guest Conversation</DialogTitle>
          </DialogHeader>
          
          {selectedBookingId && (
            <BookingChat
              bookingId={selectedBookingId}
              userType="host"
              bookingInfo={selectedBookingInfo}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};