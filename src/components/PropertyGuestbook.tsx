import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import GuestbookEntry from "./GuestbookEntry";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface GuestbookEntryData {
  id: string;
  guest_name: string | null;
  message: string;
  rating: number | null;
  image_url: string | null;
  stay_date: string | null;
  created_at: string;
}

interface PropertyGuestbookProps {
  propertyId: string;
}

const PropertyGuestbook = ({ propertyId }: PropertyGuestbookProps) => {
  const [entries, setEntries] = useState<GuestbookEntryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuestbookEntries();
  }, [propertyId]);

  const fetchGuestbookEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("guestbook_entries")
        .select("*")
        .eq("property_id", propertyId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching guestbook entries:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border-border/40 bg-secondary/5">
        <CardContent className="p-12 text-center">
          <div className="text-5xl mb-4">🌿</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No Entries Yet
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Be the first to share your experience! Past guests will receive an invitation to write in our guestbook after their stay.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
          Words from Our Guests 🌿
        </h2>
        <p className="text-muted-foreground">
          {entries.length} {entries.length === 1 ? "guest" : "guests"} shared {entries.length === 1 ? "their" : "their"} experience
        </p>
      </div>

      {entries.map((entry) => (
        <GuestbookEntry
          key={entry.id}
          guestName={entry.guest_name || undefined}
          message={entry.message}
          rating={entry.rating || undefined}
          imageUrl={entry.image_url || undefined}
          stayDate={entry.stay_date || undefined}
          submittedAt={entry.created_at}
        />
      ))}
    </div>
  );
};

export default PropertyGuestbook;
