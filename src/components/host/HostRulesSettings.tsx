import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ADULT_AGE } from "@/lib/stayRules";
import { CANCELLATION_POLICIES, DEFAULT_POLICY, isPolicyKey, POLICY_KEYS, type PolicyKey } from "../../../supabase/functions/_shared/cancellation";
import { Stepper } from "./listingPrices";

interface Rules {
  cancellation_policy: PolicyKey;
  min_nights: number;
  holiday_min_nights: number | null;
  pets_allowed: boolean;
  smoking_allowed: boolean;
  events_allowed: boolean;
  min_guest_age: number;
}

/**
 * The Rules tab: the listing's cancellation policy (one of four fixed ones)
 * and house rules. Guests see both before they pay; the payment function
 * enforces the minimum stay and the age confirmation, and the policy shown
 * when a guest books is saved on the booking and decides their refund.
 */
export function HostRulesSettings({ propertyId, onSaved }: { propertyId: string; onSaved?: () => void }) {
  const [rules, setRules] = useState<Rules | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("properties")
      .select("cancellation_policy, min_nights, holiday_min_nights, pets_allowed, smoking_allowed, events_allowed, min_guest_age")
      .eq("id", propertyId)
      .single()
      .then(({ data, error }) => {
        // Never show (and save) defaults over rules that could not be read
        if (error || !data) {
          console.error("Error loading rules:", error);
          setLoadFailed(true);
          return;
        }
        setRules({ ...data, cancellation_policy: isPolicyKey(data.cancellation_policy) ? data.cancellation_policy : DEFAULT_POLICY });
      });
  }, [propertyId]);

  if (loadFailed) return <p className="text-sm text-destructive">Det gick inte att läsa in dina regler. Ladda om sidan och försök igen.</p>;
  if (!rules) return <p className="text-sm text-muted-foreground">Laddar…</p>;
  const set = <K extends keyof Rules>(key: K, value: Rules[K]) => setRules({ ...rules, [key]: value });
  const holidayOn = rules.holiday_min_nights !== null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("properties")
      .update({
        ...rules,
        // A holiday minimum only means something when it is longer
        holiday_min_nights: holidayOn ? Math.max(rules.min_nights + 1, rules.holiday_min_nights ?? 0) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", propertyId);
    setSaving(false);
    if (error) {
      toast({ title: "Det gick inte att spara dina regler", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reglerna är sparade" });
    onSaved?.();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Avbokningsregel</CardTitle>
          <CardDescription>
            Vad gästerna får tillbaka om de avbokar. Regeln som visas när en gäst bokar gäller för den bokningen, även om du
            ändrar den senare. Gästens serviceavgift betalas aldrig tillbaka när en gäst avbokar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Avbokningsregel" className="grid gap-3 sm:grid-cols-2">
            {POLICY_KEYS.map((key) => {
              const policy = CANCELLATION_POLICIES[key];
              const chosen = rules.cancellation_policy === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => set("cancellation_policy", key)}
                  className={`rounded-xl border-2 p-4 text-left transition-colors hover:border-foreground/60 ${
                    chosen ? "border-foreground bg-muted" : "border-border"
                  }`}
                >
                  <p className="font-medium">{policy.nameSv}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{policy.summarySv}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Husregler</CardTitle>
          <CardDescription>Gästerna ser dem och godkänner dem innan de betalar.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <Stepper
            id="rules-min-nights"
            label="Minsta antal nätter"
            hint={`${rules.min_nights} ${rules.min_nights === 1 ? "natt" : "nätter"}`}
            value={rules.min_nights}
            min={1}
            max={holidayOn ? 29 : 30}
            onChange={(n) =>
              setRules({ ...rules, min_nights: n, holiday_min_nights: holidayOn ? Math.max(n + 1, rules.holiday_min_nights ?? 0) : null })
            }
          />
          <div className="space-y-2 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="rules-holiday" className="text-base font-normal">Fler nätter kring valborg, midsommar och nyårsafton</Label>
                <p className="text-xs text-muted-foreground">De nätter som oftast bokas för fester</p>
              </div>
              <Switch
                id="rules-holiday"
                checked={holidayOn}
                onCheckedChange={(on) => set("holiday_min_nights", on ? Math.max(rules.min_nights + 1, 3) : null)}
              />
            </div>
            {holidayOn && (
              <Stepper
                id="rules-holiday-nights"
                label="Minsta antal nätter då"
                value={rules.holiday_min_nights ?? rules.min_nights + 1}
                min={rules.min_nights + 1}
                max={30}
                onChange={(n) => set("holiday_min_nights", n)}
              />
            )}
          </div>
          {(
            [
              ["pets_allowed", "Husdjur tillåtna"],
              ["smoking_allowed", "Rökning tillåten"],
              ["events_allowed", "Fester och evenemang tillåtna"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3">
              <Label htmlFor={`rules-${key}`} className="text-base font-normal">{label}</Label>
              <Switch id={`rules-${key}`} checked={rules[key]} onCheckedChange={(on) => set(key, on)} />
            </div>
          ))}
          <Stepper
            id="rules-min-age"
            label="Lägsta ålder för den som bokar"
            hint="Personen måste också bo i boendet"
            value={rules.min_guest_age}
            min={ADULT_AGE}
            max={30}
            onChange={(n) => set("min_guest_age", n)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Sparar…" : "Spara regler"}</Button>
      </div>
    </div>
  );
}
