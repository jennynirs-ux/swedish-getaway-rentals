import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPriceDraft(propertyId)
      .then(({ draft, maxGuests }) => {
        setDraft(draft);
        setMaxGuests(maxGuests);
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

        <div className="flex justify-end">
          <Button onClick={save} disabled={!draft || saving}>
            {saving ? "Saving…" : "Save prices"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
