import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { emptyPriceDraft, loadPriceDraft, parseKronor, PriceFields, priceDraftProblem, savePriceDraft, type PriceDraft } from "./listingPrices";

interface Props {
  propertyId: string;
  /** The nightly price as typed (kronor), for the price calculator */
  onPriceChange?: (kronor: number) => void;
  onSaved?: () => void;
}

/** The Pricing tab's main card: price per night, extra guests and cleaning fee, saved together */
export function HostPriceSettings({ propertyId, onPriceChange, onSaved }: Props) {
  const [draft, setDraft] = useState<PriceDraft | null>(null);
  const [maxGuests, setMaxGuests] = useState(1);
  const [extras, setExtras] = useState<Awaited<ReturnType<typeof loadPriceDraft>>["extras"]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPriceDraft(propertyId)
      .then(({ draft, maxGuests, extras }) => {
        setDraft(draft);
        setMaxGuests(maxGuests);
        setExtras(extras);
      })
      .catch((error) => {
        console.error("Error loading prices:", error);
        setDraft(emptyPriceDraft(1));
      });
  }, [propertyId]);

  const change = (next: PriceDraft) => {
    setDraft(next);
    const nightly = parseKronor(next.nightly, 1);
    if (nightly !== null) onPriceChange?.(nightly);
  };

  const save = async () => {
    if (!draft) return;
    const problem = priceDraftProblem(draft, maxGuests);
    if (problem) {
      toast({ title: "Check your prices", description: problem, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await savePriceDraft(propertyId, draft, maxGuests);
      toast({ title: "Prices saved" });
      onSaved?.();
    } catch (error) {
      console.error("Error saving prices:", error);
      toast({ title: "Could not save your prices", description: (error as { message?: string })?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeExtra = async (id: string) => {
    const { error } = await supabase.from("properties_pricing_rules").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Could not remove it", description: error.message, variant: "destructive" });
      return;
    }
    setExtras((list) => list.filter((e) => e.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your prices</CardTitle>
        <CardDescription>
          Your place sleeps {maxGuests} {maxGuests === 1 ? "guest" : "guests"} (change that under Details).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {draft ? <PriceFields value={draft} onChange={change} maxGuests={maxGuests} /> : <p className="text-sm text-muted-foreground">Loading…</p>}

        {extras.length > 0 && (
          <Alert>
            <AlertDescription className="space-y-2">
              <p>
                Guests can't book paid extras on Nordic Getaways yet, so these are not shown or charged. Mention them in
                your description instead, or include them in your price.
              </p>
              <ul className="space-y-1">
                {extras.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {e.name}: {Math.round(e.price / 100).toLocaleString("sv-SE")} kr{e.is_per_night ? " per night" : ""}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => removeExtra(e.id)} aria-label={`Remove ${e.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={save} disabled={!draft || saving}>
            {saving ? "Saving…" : "Save prices"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
