// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { MessageCircle, Filter, Search, CheckCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingChat } from "@/components/BookingChat";
import { supabase } from "@/integrations/supabase/client";

interface ChatRow {
  booking_id: string;
  property_id: string;
  property_title: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  source: string;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  direct: "Direct",
  blocked: "Blocked",
};

const SOURCE_COLORS: Record<string, string> = {
  airbnb: "bg-rose-100 text-rose-800",
  booking_com: "bg-blue-100 text-blue-800",
  direct: "bg-emerald-100 text-emerald-800",
  blocked: "bg-gray-100 text-gray-800",
};

/**
 * Unified inbox for host guest conversations.
 *
 * Improves on the basic chat list with:
 *  - Filter by channel (Airbnb / Booking.com / Direct)
 *  - Filter by unread/all
 *  - Text search across guest name and property title
 *  - Shows channel origin badge per conversation
 *
 * Inline modal opens the BookingChat for the selected conversation.
 */
const HostUnifiedInbox = () => {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<"all" | "unread">("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();
      if (!profile) return;

      // Get bookings for this host's properties, with message aggregates
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          id,
          property_id,
          guest_name,
          check_in_date,
          check_out_date,
          source,
          properties!inner(title, host_id)
        `)
        .eq("properties.host_id", profile.id)
        .order("check_in_date", { ascending: false });

      if (!bookings || bookings.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      const bookingIds = bookings.map((b: any) => b.id);

      // Fetch messages for all bookings in one query
      let messages: any[] = [];
      try {
        const { data: msgData } = await supabase
          .from("booking_messages")
          .select("booking_id, message, created_at, read_by_host, sender_type")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false });
        messages = msgData || [];
      } catch {
        // messaging table may not exist — continue with empty list
      }

      // Build chat rows
      const rows: ChatRow[] = bookings.map((b: any) => {
        const bookingMessages = messages.filter((m: any) => m.booking_id === b.id);
        const unread = bookingMessages.filter(
          (m: any) => !m.read_by_host && m.sender_type === "guest",
        ).length;
        const last = bookingMessages[0];

        return {
          booking_id: b.id,
          property_id: b.property_id,
          property_title: b.properties?.title || "Unknown",
          guest_name: b.guest_name || "Guest",
          check_in_date: b.check_in_date,
          check_out_date: b.check_out_date,
          source: b.source || "direct",
          unread_count: unread,
          last_message: last?.message || null,
          last_message_at: last?.created_at || null,
        };
      });

      // Only show chats that have at least one message OR are in the future
      const filtered = rows.filter((r) => {
        if (r.last_message) return true;
        return new Date(r.check_in_date) >= new Date();
      });

      setChats(filtered);
    } catch {
      // Keep empty
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = chats;

    if (filterChannel !== "all") {
      result = result.filter((c) => c.source === filterChannel);
    }

    if (filterRead === "unread") {
      result = result.filter((c) => c.unread_count > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.guest_name.toLowerCase().includes(q) ||
          c.property_title.toLowerCase().includes(q),
      );
    }

    // Sort: unread first, then by last message date / check-in date
    return result.sort((a, b) => {
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
      const aTime = a.last_message_at || a.check_in_date;
      const bTime = b.last_message_at || b.check_in_date;
      return bTime.localeCompare(aTime);
    });
  }, [chats, filterChannel, filterRead, searchQuery]);

  const totalUnread = chats.reduce((s, c) => s + c.unread_count, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Unified Inbox
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-1">{totalUnread} unread</Badge>
              )}
            </CardTitle>
          </div>

          <div className="flex flex-wrap gap-2 pt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guest or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="w-40 h-9">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="airbnb">Airbnb</SelectItem>
                <SelectItem value="booking_com">Booking.com</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRead} onValueChange={(v) => setFilterRead(v as any)}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              {chats.length === 0 ? (
                <>
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-sm">Guest messages from all channels will appear here.</p>
                </>
              ) : (
                <p className="text-sm">No conversations match your filters.</p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-3">
              <div className="space-y-2">
                {filtered.map((chat) => (
                  <button
                    key={chat.booking_id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                      chat.unread_count > 0 ? "bg-primary/5 border-primary/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{chat.guest_name}</span>
                        <Badge variant="outline" className={`shrink-0 ${SOURCE_COLORS[chat.source]}`}>
                          {SOURCE_LABELS[chat.source] || chat.source}
                        </Badge>
                      </div>
                      {chat.unread_count > 0 ? (
                        <Badge variant="destructive" className="shrink-0">
                          {chat.unread_count}
                        </Badge>
                      ) : (
                        <CheckCheck className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-1">
                      {chat.property_title} · {format(new Date(chat.check_in_date), "MMM d")} –{" "}
                      {format(new Date(chat.check_out_date), "MMM d, yyyy")}
                    </p>
                    {chat.last_message && (
                      <p className="text-sm truncate text-foreground/80">
                        {chat.last_message}
                      </p>
                    )}
                    {chat.last_message_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: true })}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Chat dialog */}
      <Dialog open={!!selectedChat} onOpenChange={(open) => !open && setSelectedChat(null)}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedChat?.guest_name} —{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {selectedChat?.property_title}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedChat && (
            <BookingChat
              bookingId={selectedChat.booking_id}
              bookingInfo={{
                property_title: selectedChat.property_title,
                guest_name: selectedChat.guest_name,
                check_in_date: selectedChat.check_in_date,
                check_out_date: selectedChat.check_out_date,
              }}
              onClose={() => {
                setSelectedChat(null);
                load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default HostUnifiedInbox;
