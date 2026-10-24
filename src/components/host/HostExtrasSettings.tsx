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
import { MAX_EXTRAS_PER_BOOKING } from "../../../supabase/functions/_shared/booking-price";
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
  { value: "stay", label: "per vistelse", is_per_night: false, per_guest: false },
  { value: "night", label: "per natt", is_per_night: true, per_guest: false },
  { value: "guest", label: "per gäst", is_per_night: false, per_guest: true },
  { value: "guest-night", label: "per gäst och natt", is_per_night: true, per_guest: true },
] as const;
type Unit = (typeof UNITS)[number]["value"];

/** The unit in Swedish for the host panel, as extraServiceUnit words it for guests */
const unitLabel = (e: Pick<Extra, "is_per_night" | "per_guest">) =>
  e.per_guest ? (e.is_per_night ? "per gäst och natt" : "per gäst") : e.is_per_night ? "per natt" : "per vistelse";

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
      toast({ title: "Ge tillvalet ett namn", variant: "destructive" });
      return;
    }
    const price = draft.included ? 0 : parseKronor(draft.price, 1);
    if (price === null) {
      toast({ title: "Skriv in priset i hela kronor", variant: "destructive" });
      return;
    }
    const wasOptional = draft.id ? extras.some((e) => e.id === draft.id && !e.included) : false;
    if (!draft.included && !wasOptional && optionalCount >= MAX_EXTRAS_PER_BOOKING) {
      toast({ title: `Du kan erbjuda upp till ${MAX_EXTRAS_PER_BOOKING} tillval som gästerna kan lägga till`, variant: "destructive" });
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
      toast({ title: "Det gick inte att spara tillvalet", description: error.message, variant: "destructive" });
      return;
    }
    setDraft(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("properties_pricing_rules").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Det gick inte att ta bort det", description: error.message, variant: "destructive" });
      return;
    }
    if (draft?.id === id) setDraft(null);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tillval</CardTitle>
        <CardDescription>
          Du bestämmer vad som ingår i en vistelse: saker som ingår i ditt pris (som sängkläder och handdukar) och tillval
          som gästerna kan lägga till när de bokar (som badtunna eller ved).
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
                      ? "Ingår i priset"
                      : `Gästerna kan lägga till det: ${Math.round(e.price / 100).toLocaleString("sv-SE")} kr ${unitLabel(e)}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Ändra ${e.name}`}
                    onClick={() =>
                      setDraft({ id: e.id, name: e.name, included: e.included, price: e.included ? "" : String(Math.round(e.price / 100)), unit: unitOf(e) })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" aria-label={`Ta bort ${e.name}`} onClick={() => remove(e.id)}>
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
              <Label htmlFor="extra-name">Vad är det?</Label>
              <Input
                id="extra-name"
                value={draft.name}
                maxLength={80}
                onChange={(ev) => setDraft({ ...draft, name: ev.target.value })}
                placeholder="t.ex. Sängkläder och handdukar, Badtunna, Ved"
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
                <Label htmlFor="extra-included" className="font-normal">Ingår i priset</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="optional" id="extra-optional" />
                <Label htmlFor="extra-optional" className="font-normal">Gästerna kan lägga till det när de bokar</Label>
              </div>
            </RadioGroup>
            {!draft.included && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="extra-price">Pris</Label>
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
                  <Label htmlFor="extra-unit">Debiteras</Label>
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
              <Button variant="ghost" onClick={() => setDraft(null)}>Avbryt</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Sparar…" : "Spara tillval"}</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setDraft(NEW_DRAFT)}>
            <Plus className="mr-2 h-4 w-4" /> Lägg till tillval
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
