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

  // No placeholder while loading: most properties have no entries yet
  if (loading) {
    return null;
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-16 space-y-6">
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
    </section>
  );
};

export default PropertyGuestbook;
