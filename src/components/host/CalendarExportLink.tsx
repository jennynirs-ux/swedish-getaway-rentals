import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";

/**
 * This listing's own calendar link (export-ical), for the host to paste into
 * Airbnb or Booking.com so dates booked here are blocked there too. The same
 * link as in the editor's Calendar tab.
 */
export const CalendarExportLink = ({ propertyId }: { propertyId: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("property_private_details")
      .select("ical_export_secret")
      .eq("property_id", propertyId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.ical_export_secret) return;
        const base = import.meta.env.VITE_SUPABASE_URL || "https://bbuutvozqfzbsnllsiai.supabase.co";
        setUrl(`${base}/functions/v1/export-ical/${propertyId}?secret=${data.ical_export_secret}`);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (!url) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">Din kalenderlänk för Airbnb och Booking.com</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          aria-label="Din kalenderlänk"
          className="min-w-0 flex-1 rounded-md border bg-muted px-2 py-1 text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            navigator.clipboard.writeText(url).then(
              () => toast.success("Kalenderlänken är kopierad"),
              () => toast.error("Det gick inte att kopiera. Markera länken och kopiera den själv."),
            )
          }
        >
          <Copy className="h-4 w-4 mr-1" />
          Kopiera
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Klistra in den som en importerad kalender där, och lägg till deras kalenderlänk under fliken Kalender i den här
        annonsen.
      </p>
    </div>
  );
};
