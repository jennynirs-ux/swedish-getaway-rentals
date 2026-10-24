import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// The listing's prices as the host thinks of them (like Airbnb): a nightly
// price that covers a number of guests, a fee per extra guest per night, and
// a cleaning fee per stay. Stored as properties.price_per_night (kronor) and
// one properties_pricing_rules row each for extra_guest and cleaning_fee (öre).

/** What the host typed; amounts in kronor, kept as text so a field can be cleared */
export interface PriceDraft {
  nightly: string;
  chargeExtraGuests: boolean;
  guestsIncluded: number;
  extraGuestFee: string;
  cleaningFee: string;
}

export const emptyPriceDraft = (maxGuests: number): PriceDraft => ({
  nightly: "",
  chargeExtraGuests: false,
  guestsIncluded: Math.max(1, Math.min(2, maxGuests)),
  extraGuestFee: "",
  cleaningFee: "",
});

/** Whole kronor of at least min, or null */
export const parseKronor = (text: string, min = 0): number | null => {
  const t = text.trim().replace(/\s/g, "");
  if (!/^\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  return n >= min ? n : null;
};

const kr = (n: number) => `${n.toLocaleString("sv-SE")} kr`;

/** Why the draft can't be saved yet, or null */
export function priceDraftProblem(draft: PriceDraft, maxGuests: number): string | null {
  if (parseKronor(draft.nightly, 1) === null) return "Skriv in priset per natt i hela kronor.";
  if (draft.chargeExtraGuests && maxGuests > 1) {
    if (parseKronor(draft.extraGuestFee, 1) === null) return "Skriv in vad varje extra gäst betalar per natt, eller stäng av extra gäster.";
    if (draft.guestsIncluded >= maxGuests) return `Priset kan gälla högst ${maxGuests - 1} gäster om extra gäster betalar mer (ditt boende har plats för ${maxGuests}).`;
  }
  if (draft.cleaningFee.trim() && parseKronor(draft.cleaningFee) === null) return "Skriv in städavgiften i hela kronor, eller lämna fältet tomt.";
  return null;
}

/** A number with − and + buttons */
export function Stepper({
  id,
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, Math.round(next / step) * step)));
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <Label id={`${id}-label`} className="text-base font-normal">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-3" role="group" aria-labelledby={`${id}-label`}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          aria-label={`Minska: ${label}`}
          disabled={value <= min}
          onClick={() => set(value - step)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center tabular-nums" aria-live="polite">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full"
          aria-label={`Öka: ${label}`}
          disabled={value >= max}
          onClick={() => set(value + step)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function KronorInput({ id, value, onChange, suffix, placeholder }: { id: string; value: string; onChange: (v: string) => void; suffix: string; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="max-w-[10rem]"
      />
      <span className="text-sm text-muted-foreground">{suffix}</span>
    </div>
  );
}

/** Price per night, extra guests and cleaning fee: the same fields in the new-listing guide and the Pricing tab */
export function PriceFields({ value, onChange, maxGuests }: { value: PriceDraft; onChange: (draft: PriceDraft) => void; maxGuests: number }) {
  const set = <K extends keyof PriceDraft>(key: K, v: PriceDraft[K]) => onChange({ ...value, [key]: v });
  const nightly = parseKronor(value.nightly, 1);
  const fee = parseKronor(value.extraGuestFee, 1);
  const canHaveExtra = maxGuests > 1;
  const included = Math.min(value.guestsIncluded, Math.max(1, maxGuests - 1));
  const exampleExtra = Math.min(2, maxGuests - included);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="price-nightly" className="text-base">Pris per natt</Label>
        <KronorInput id="price-nightly" value={value.nightly} onChange={(v) => set("nightly", v)} suffix="kr per natt" placeholder="1500" />
        <p className="text-xs text-muted-foreground">
          Det du får per natt. Gästerna betalar en liten serviceavgift ovanpå. Du kan sätta andra priser för enskilda datum senare.
        </p>
      </div>

      {canHaveExtra && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="price-extra-toggle" className="text-base">Extra gäster</Label>
              <p className="text-xs text-muted-foreground">
                {value.chargeExtraGuests
                  ? "Större sällskap betalar mer per natt."
                  : `Av: priset per natt är detsamma för 1 till ${maxGuests} gäster.`}
              </p>
            </div>
            <Switch
              id="price-extra-toggle"
              checked={value.chargeExtraGuests}
              onCheckedChange={(on) => onChange({ ...value, chargeExtraGuests: on, guestsIncluded: included })}
            />
          </div>
          {value.chargeExtraGuests && (
            <>
              <Stepper
                id="price-guests-included"
                label="Gäster som ingår i priset"
                value={included}
                min={1}
                max={maxGuests - 1}
                onChange={(n) => set("guestsIncluded", n)}
              />
              <div className="space-y-2">
                <Label htmlFor="price-extra-fee">Varje extra gäst betalar</Label>
                <KronorInput id="price-extra-fee" value={value.extraGuestFee} onChange={(v) => set("extraGuestFee", v)} suffix="kr per natt" placeholder="300" />
              </div>
              {nightly !== null && fee !== null && exampleExtra > 0 && (
                <p className="text-sm text-muted-foreground">
                  Exempel: {included + exampleExtra} gäster betalar {kr(nightly)} + {exampleExtra} × {kr(fee)} ={" "}
                  <strong>{kr(nightly + exampleExtra * fee)}</strong> per natt.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="price-cleaning" className="text-base">Städavgift <span className="font-normal text-muted-foreground">(valfritt)</span></Label>
        <KronorInput id="price-cleaning" value={value.cleaningFee} onChange={(v) => set("cleaningFee", v)} suffix="kr per vistelse" placeholder="0" />
        <p className="text-xs text-muted-foreground">Tas ut en gång per bokning. Lämna tomt om du inte vill ha någon.</p>
      </div>
    </div>
  );
}

interface RuleRow {
  id: string;
  rule_type: string;
  name: string;
  price: number;
  is_per_night: boolean;
  guests_included: number | null;
}

/** The listing's price per night, extra-guest fee and cleaning fee */
export async function loadPriceDraft(propertyId: string): Promise<{ draft: PriceDraft; maxGuests: number }> {
  const [{ data: property, error }, { data: rules, error: rulesError }] = await Promise.all([
    supabase.from("properties").select("price_per_night, max_guests").eq("id", propertyId).single(),
    supabase
      .from("properties_pricing_rules")
      .select("id, rule_type, name, price, is_per_night, guests_included")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .in("rule_type", ["extra_guest", "cleaning_fee"])
      .order("created_at"),
  ]);
  if (error) throw error;
  if (rulesError) throw rulesError;
  const maxGuests = Math.max(1, property?.max_guests ?? 1);
  const all = (rules ?? []) as RuleRow[];
  const extra = all.find((r) => r.rule_type === "extra_guest");
  const cleaning = all.find((r) => r.rule_type === "cleaning_fee");
  return {
    maxGuests,
    draft: {
      nightly: property?.price_per_night ? String(property.price_per_night) : "",
      chargeExtraGuests: !!extra,
      guestsIncluded: extra ? Math.max(1, extra.guests_included ?? 1) : emptyPriceDraft(maxGuests).guestsIncluded,
      extraGuestFee: extra ? String(Math.round(extra.price / 100)) : "",
      cleaningFee: cleaning ? String(Math.round(cleaning.price / 100)) : "",
    },
  };
}

/** Saves the nightly price and the extra-guest and cleaning rules (one of each, or none) */
export async function savePriceDraft(propertyId: string, draft: PriceDraft, maxGuests: number) {
  const nightly = parseKronor(draft.nightly, 1);
  if (nightly === null) throw new Error("Skriv in priset per natt i hela kronor.");
  const { error } = await supabase
    .from("properties")
    .update({ price_per_night: nightly, currency: "SEK", updated_at: new Date().toISOString() })
    .eq("id", propertyId);
  if (error) throw error;

  const { data: current, error: readError } = await supabase
    .from("properties_pricing_rules")
    .select("id, rule_type")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .in("rule_type", ["extra_guest", "cleaning_fee"]);
  if (readError) throw readError;

  const keepOne = async (ruleType: "extra_guest" | "cleaning_fee", row: Record<string, unknown> | null) => {
    const existing = (current ?? []).filter((r) => r.rule_type === ruleType).map((r) => r.id);
    const [first, ...rest] = row ? existing : [undefined, ...existing];
    if (rest.length) {
      const { error: offError } = await supabase.from("properties_pricing_rules").update({ is_active: false }).in("id", rest);
      if (offError) throw offError;
    }
    if (!row) return;
    const { error: saveError } = first
      ? await supabase.from("properties_pricing_rules").update(row).eq("id", first)
      : await supabase
          .from("properties_pricing_rules")
          .insert({ property_id: propertyId, rule_type: ruleType, currency: "SEK", is_active: true, ...row } as never);
    if (saveError) throw saveError;
  };

  const fee = parseKronor(draft.extraGuestFee, 1);
  await keepOne(
    "extra_guest",
    draft.chargeExtraGuests && maxGuests > 1 && fee !== null
      ? {
          name: "Extra guest",
          price: fee * 100,
          is_per_night: true,
          guests_included: Math.min(Math.max(1, draft.guestsIncluded), maxGuests - 1),
        }
      : null,
  );
  const cleaning = parseKronor(draft.cleaningFee, 1);
  await keepOne("cleaning_fee", cleaning !== null ? { name: "Cleaning fee", price: cleaning * 100, is_per_night: false } : null);
}
