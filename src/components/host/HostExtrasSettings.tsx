import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { extraServiceUnit, MAX_EXTRAS_PER_BOOKING } from "../../../supabase/functions/_shared/booking-price";
import { parseKronor } from "./listingPrices";

interface Extra {
  id: string;
  name: string;
  price: number;
  is_per_night: boolean;
  per_guest: boolean;
  included: boolean;
}

const UNITS = [
  { value: "stay", label: "per stay", is_per_night: false, per_guest: false },
  { value: "night", label: "per night", is_per_night: true, per_guest: false },
  { value: "guest", label: "per guest", is_per_night: false, per_guest: true },
  { value: "guest-night", label: "per guest per night", is_per_night: true, per_guest: true },
] as const;
type Unit = (typeof UNITS)[number]["value"];

const unitOf = (e: Pick<Extra, "is_per_night" | "per_guest">): Unit =>
  UNITS.find((u) => u.is_per_night === e.is_per_night && u.per_guest === e.per_guest)?.value ?? "stay";

interface Draft {
  id: string | null;
  name: string;
  included: boolean;
  price: string;
  unit: Unit;
}

const NEW_DRAFT: Draft = { id: null, name: "", included: false, price: "", unit: "stay" };

/**
 * The host decides what comes with the stay: each extra is either included in
 * the price (guests see it in the booking form) or something guests can add
 * when they book, at a price per stay, night, guest or guest and night. Saved
 * as properties_pricing_rules rows with rule_type extra_service; the booking
 * form and create-booking-payment-connect charge them with extraServiceFee.
 */
export function HostExtrasSettings({ propertyId }: { propertyId: string }) {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("properties_pricing_rules")
      .select("id, name, price, is_per_night, per_guest, included")
      .eq("property_id", propertyId)
      .eq("rule_type", "extra_service")
      .eq("is_active", true)
      .order("created_at");
    if (error) {
      console.error("Error loading extras:", error);
      return;
    }
    setExtras((data ?? []) as Extra[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const optionalCount = extras.filter((e) => !e.included).length;

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (name.length < 2) {
      toast({ title: "Give the extra a name", variant: "destructive" });
      return;
    }
    const price = draft.included ? 0 : parseKronor(draft.price, 1);
    if (price === null) {
      toast({ title: "Enter the price in whole kronor", variant: "destructive" });
      return;
    }
    const wasOptional = draft.id ? extras.some((e) => e.id === draft.id && !e.included) : false;
    if (!draft.included && !wasOptional && optionalCount >= MAX_EXTRAS_PER_BOOKING) {
      toast({ title: `You can offer up to ${MAX_EXTRAS_PER_BOOKING} extras guests can add`, variant: "destructive" });
      return;
    }
    const unit = UNITS.find((u) => u.value === draft.unit) ?? UNITS[0];
    const row = {
      name: name.slice(0, 80),
      price: price * 100,
      included: draft.included,
      is_per_night: draft.included ? false : unit.is_per_night,
      per_guest: draft.included ? false : unit.per_guest,
    };
    setSaving(true);
    const { error } = draft.id
      ? await supabase.from("properties_pricing_rules").update(row).eq("id", draft.id)
      : await supabase
          .from("properties_pricing_rules")
          .insert({ ...row, property_id: propertyId, rule_type: "extra_service", currency: "SEK", is_active: true });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save the extra", description: error.message, variant: "destructive" });
      return;
    }
    setDraft(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("properties_pricing_rules").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Could not remove it", description: error.message, variant: "destructive" });
      return;
    }
    if (draft?.id === id) setDraft(null);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extras</CardTitle>
        <CardDescription>
          You decide what comes with a stay: things included in your price (like bed linen and towels), and extras guests
          can add when they book (like a hot tub or firewood).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {extras.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {extras.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {e.included
                      ? "Included in the price"
                      : `Guests can add it: ${Math.round(e.price / 100).toLocaleString("sv-SE")} kr ${extraServiceUnit(e)}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Change ${e.name}`}
                    onClick={() =>
                      setDraft({ id: e.id, name: e.name, included: e.included, price: e.included ? "" : String(Math.round(e.price / 100)), unit: unitOf(e) })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={`Remove ${e.name}`} onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draft ? (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="extra-name">What is it?</Label>
              <Input
                id="extra-name"
                value={draft.name}
                maxLength={80}
                onChange={(ev) => setDraft({ ...draft, name: ev.target.value })}
                placeholder="e.g. Bed linen and towels, Hot tub, Firewood"
                autoFocus
              />
            </div>
            <RadioGroup
              value={draft.included ? "included" : "optional"}
              onValueChange={(v) => setDraft({ ...draft, included: v === "included" })}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="included" id="extra-included" />
                <Label htmlFor="extra-included" className="font-normal">Included in the price</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="optional" id="extra-optional" />
                <Label htmlFor="extra-optional" className="font-normal">Guests can add it when they book</Label>
              </div>
            </RadioGroup>
            {!draft.included && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="extra-price">Price</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="extra-price"
                      inputMode="numeric"
                      className="w-28"
                      value={draft.price}
                      onChange={(ev) => setDraft({ ...draft, price: ev.target.value })}
                      placeholder="200"
                    />
                    <span className="text-sm text-muted-foreground">kr</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra-unit">Charged</Label>
                  <Select value={draft.unit} onValueChange={(v) => setDraft({ ...draft, unit: v as Unit })}>
                    <SelectTrigger id="extra-unit" className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save extra"}</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setDraft(NEW_DRAFT)}>
            <Plus className="mr-2 h-4 w-4" /> Add an extra
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
