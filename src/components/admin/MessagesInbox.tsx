import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Reply, Check, Search, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface GuestMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
  reply: string;
  replied_at: string;
  created_at: string;
  properties?: {
    title: string;
  };
}

const MessagesInbox = () => {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<GuestMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_messages')
        .select(`
          *,
          properties(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda meddelanden",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('guest_messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('guest_messages')
        .update({
          reply: replyText,
          replied_at: new Date().toISOString(),
          read: true
        })
        .eq('id', selectedMessage.id);

      if (error) throw error;

      // Send the reply email to the guest
      const { error: emailError } = await supabase.functions.invoke('send-guest-reply', {
        body: {
          guestEmail: selectedMessage.email,
          guestName: selectedMessage.name,
          reply: replyText
        }
      });

      if (emailError) {
        console.error('Email send error:', emailError);
        // Don't throw - reply is saved in DB
      }

      toast({
        title: "Svar skickat",
        description: "Ditt svar har sparats och skickats till gästen"
      });

      setReplyText('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skicka svar",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter(msg => !msg.read).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meddelanden från gäster</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} olästa meddelanden` : 'Alla meddelanden lästa'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{messages.length} totalt</span>
        </div>
      </div>

      <div className="grid gap-4">
        {messages.map((message) => (
          <Card key={message.id} className={`cursor-pointer transition-colors ${!message.read ? 'border-primary/50 bg-primary/5' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{message.name}</h3>
                    {!message.read && <Badge variant="default" className="text-xs">Nytt</Badge>}
                    {message.reply && <Badge variant="outline" className="text-xs">Besvarat</Badge>}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{message.email}</span>
                    </div>
                    {message.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{message.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(message.created_at), 'dd MMM yyyy HH:mm', { locale: sv })}</span>
                    </div>
                  </div>
                  
                  {message.subject && (
                    <p className="font-medium text-sm">{message.subject}</p>
                  )}
                  
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.message}
                  </p>
                  
                  {message.properties && (
                    <Badge variant="outline" className="text-xs">
                      {message.properties.title}
                    </Badge>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {!message.read && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(message.id);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedMessage(message);
                          if (!message.read) markAsRead(message.id);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Meddelande från {message.name}</DialogTitle>
                        <DialogDescription>
                          {format(new Date(message.created_at), 'dd MMMM yyyy HH:mm', { locale: sv })}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Kontaktinformation</h4>
                            <div className="space-y-1 text-sm">
                              <div>{message.email}</div>
                              {message.phone && <div>{message.phone}</div>}
                            </div>
                          </div>
                          {message.properties && (
                            <div>
                              <h4 className="font-medium mb-2">Property</h4>
                              <div className="text-sm">{message.properties.title}</div>
                            </div>
                          )}
                        </div>
                        
                        {message.subject && (
                          <div>
                            <h4 className="font-medium mb-2">Ämne</h4>
                            <p className="text-sm">{message.subject}</p>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium mb-2">Meddelande</h4>
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          </div>
                        </div>
                        
                        {message.reply && (
                          <div>
                            <h4 className="font-medium mb-2">Ditt svar</h4>
                            <div className="bg-primary/10 p-4 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{message.reply}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Skickat {format(new Date(message.replied_at), 'dd MMM yyyy HH:mm', { locale: sv })}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-medium mb-2">
                            {message.reply ? 'Uppdatera svar' : 'Skriv svar'}
                          </h4>
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Skriv ditt svar här..."
                            rows={4}
                          />
                          <Button 
                            onClick={sendReply} 
                            disabled={!replyText.trim() || sending}
                            className="mt-2"
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            {sending ? 'Skickar...' : 'Skicka svar'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {messages.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Inga meddelanden</h3>
              <p className="text-muted-foreground">Du har inga meddelanden från gäster ännu.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MessagesInbox;