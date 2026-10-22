import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HOST_CHECKLIST_KEY } from "./HostOnboardingChecklist";

// The DAC7 step: what Swedish law (lag 2022:1681) makes us collect from every
// host before their listing goes live. Saved through save-host-tax-profile,
// which checks the numbers and stores them encrypted; this page only ever sees
// the masked forms (the database doesn't let the browser read the rest).

export const HOST_TAX_KEY = ["host-tax-profile"];

interface SavedTax {
  seller_type: "individual" | "entity";
  first_name: string | null;
  last_name: string | null;
  legal_name: string | null;
  date_of_birth: string | null;
  street: string;
  postal_code: string;
  city: string;
  country_code: string;
  tin_country: string | null;
  tin_masked: string | null;
  other_tin_countries: string[] | null;
  birth_place: string | null;
  vat_number: string | null;
  pe_eu: boolean | null;
  pe_countries: string[] | null;
  dac7_complete: boolean;
  updated_at: string;
}

const loadTax = async (): Promise<SavedTax | null> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userData.user.id).single();
  if (!profile) return null;
  const { data, error } = await supabase
    .from("host_tax_profiles")
    .select("seller_type, first_name, last_name, legal_name, date_of_birth, birth_place, street, postal_code, city, country_code, tin_country, tin_masked, other_tin_countries, vat_number, pe_eu, pe_countries, dac7_complete, updated_at")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (error) throw error;
  return data as SavedTax | null;
};

export const useHostTaxDetails = () => useQuery({ queryKey: HOST_TAX_KEY, queryFn: loadTax });

interface Form {
  sellerType: "individual" | "entity";
  firstName: string;
  lastName: string;
  legalName: string;
  swedishTin: boolean;
  tin: string;
  tinCountry: string;
  dateOfBirth: string;
  birthPlace: string;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  vatNumber: string;
  hasOtherTin: boolean;
  otherTinCountry: string;
  otherTin: string;
  peEu: boolean | null;
  peCountries: string;
  confirm: boolean;
}

const EMPTY: Form = {
  sellerType: "individual",
  firstName: "",
  lastName: "",
  legalName: "",
  swedishTin: true,
  tin: "",
  tinCountry: "",
  dateOfBirth: "",
  birthPlace: "",
  street: "",
  postalCode: "",
  city: "",
  countryCode: "SE",
  vatNumber: "",
  hasOtherTin: false,
  otherTinCountry: "",
  otherTin: "",
  peEu: null,
  peCountries: "",
  confirm: false,
};

/** Prefilled from what is saved, except the tax numbers, which are never sent back */
const fromSaved = (s: SavedTax): Form => ({
  ...EMPTY,
  sellerType: s.seller_type,
  firstName: s.first_name ?? "",
  lastName: s.last_name ?? "",
  legalName: s.legal_name ?? "",
  swedishTin: (s.tin_country ?? "SE") === "SE",
  tinCountry: s.tin_country && s.tin_country !== "SE" ? s.tin_country : "",
  dateOfBirth: s.date_of_birth ?? "",
  birthPlace: s.birth_place ?? "",
  hasOtherTin: (s.other_tin_countries?.length ?? 0) > 0,
  otherTinCountry: s.other_tin_countries?.[0] ?? "",
  peCountries: (s.pe_countries ?? []).join(", "),
  street: s.street,
  postalCode: s.postal_code,
  city: s.city,
  countryCode: s.country_code,
  vatNumber: s.vat_number ?? "",
  peEu: s.pe_eu,
});

const field = (id: string, label: string, input: React.ReactNode, hint?: string) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {input}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

export function HostTaxDetails() {
  const queryClient = useQueryClient();
  const { data: saved, isLoading } = useHostTaxDetails();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  // The first change starts from what is shown (the saved details, or an empty form)
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...(prev ?? (saved ? fromSaved(saved) : EMPTY)), [key]: value }));

  if (isLoading) return null;
  const editing = form !== null || !saved?.dac7_complete;
  const f = form ?? (saved ? fromSaved(saved) : EMPTY);
  const startEditing = () => setForm(saved ? fromSaved(saved) : EMPTY);
  const individual = f.sellerType === "individual";
  // A saved tax number stays unless the host types a new one (the browser never gets it back)
  const formTinCountry = f.swedishTin ? "SE" : f.tinCountry.trim().toUpperCase();
  const canKeepTin = !!saved?.tin_masked && saved.seller_type === f.sellerType && (saved.tin_country ?? "SE") === formTinCountry;
  const keepTin = canKeepTin && !f.tin.trim();
  const keepOtherTins = f.hasOtherTin && !f.otherTin.trim() && (saved?.other_tin_countries?.length ?? 0) > 0;

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("save-host-tax-profile", {
      body: {
        sellerType: f.sellerType,
        firstName: f.firstName,
        lastName: f.lastName,
        legalName: f.legalName,
        tinCountry: formTinCountry,
        tin: f.tin,
        keepTin,
        dateOfBirth: f.swedishTin ? "" : f.dateOfBirth,
        birthPlace: f.birthPlace,
        street: f.street,
        postalCode: f.postalCode,
        city: f.city,
        countryCode: f.countryCode.toUpperCase(),
        vatNumber: f.vatNumber,
        otherTins: f.hasOtherTin && !keepOtherTins ? [{ country: f.otherTinCountry.toUpperCase(), number: f.otherTin }] : [],
        keepOtherTins,
        peEu: individual ? undefined : f.peEu,
        peCountries: f.peCountries.split(/[\s,]+/).filter(Boolean),
        confirm: f.confirm,
      },
    });
    setSaving(false);
    // A 400 carries the reason in the body
    const message = (data as { error?: string } | null)?.error ?? (error ? await readError(error) : null);
    if (message) {
      toast.error(message);
      return;
    }
    toast.success("Tax details saved");
    setForm(null);
    queryClient.invalidateQueries({ queryKey: HOST_TAX_KEY });
    queryClient.invalidateQueries({ queryKey: HOST_CHECKLIST_KEY });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Tax details</CardTitle>
          {saved?.dac7_complete ? <Badge variant="secondary">Done</Badge> : <Badge variant="destructive">Needed to publish</Badge>}
        </div>
        <CardDescription>
          Under EU rules (DAC7) we must collect a few details from every host and report your rental income from Nordic
          Getaways to Skatteverket once a year. Skatteverket may share it with tax authorities in other EU countries. You
          get a copy of what we report by 31 January.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!editing && saved ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>{saved.seller_type === "entity" ? saved.legal_name : `${saved.first_name} ${saved.last_name}`}</strong>
              {saved.tin_masked && <span className="text-muted-foreground"> · {saved.tin_masked}</span>}
              {saved.date_of_birth && <span className="text-muted-foreground"> · born {saved.date_of_birth}</span>}
            </p>
            <p className="text-muted-foreground">
              {saved.street}, {saved.postal_code} {saved.city}, {saved.country_code}
              {saved.vat_number ? ` · VAT ${saved.vat_number}` : ""}
            </p>
            <Button variant="outline" onClick={startEditing}>Change</Button>
          </div>
        ) : (
          <>
            <RadioGroup value={f.sellerType} onValueChange={(v) => set("sellerType", v as Form["sellerType"])} className="space-y-2">
              <p className="text-sm font-medium">Do you rent out as a private person or through a company?</p>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="individual" id="tax-individual" />
                <Label htmlFor="tax-individual" className="font-normal">Private person</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="entity" id="tax-entity" />
                <Label htmlFor="tax-entity" className="font-normal">Company (e.g. AB)</Label>
              </div>
            </RadioGroup>

            {individual ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {field("tax-first", "First name", <Input id="tax-first" value={f.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />)}
                {field("tax-last", "Last name", <Input id="tax-last" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />)}
              </div>
            ) : (
              field("tax-legal", "Company name", <Input id="tax-legal" value={f.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="e.g. Exempel AB" />, "The full name, including AB or similar.")
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="tax-swedish" checked={f.swedishTin} onCheckedChange={(on) => set("swedishTin", on === true)} />
                <Label htmlFor="tax-swedish" className="font-normal">
                  {individual ? "I have a Swedish personnummer or samordningsnummer" : "The company is registered in Sweden"}
                </Label>
              </div>
              {f.swedishTin ? (
                field(
                  "tax-tin",
                  individual ? "Personnummer" : "Organisationsnummer",
                  <Input id="tax-tin" value={f.tin} onChange={(e) => set("tin", e.target.value)} placeholder={individual ? "YYYYMMDD-NNNN" : "NNNNNN-NNNN"} autoComplete="off" inputMode="numeric" />,
                  canKeepTin ? `Saved: ${saved?.tin_masked}. Leave empty to keep it.` : individual ? "Your date of birth is taken from it." : undefined,
                )
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {field("tax-tin-country", "Country of your tax number", <Input id="tax-tin-country" value={f.tinCountry} maxLength={2} onChange={(e) => set("tinCountry", e.target.value)} placeholder="e.g. NO" />, "Two-letter country code")}
                  {field("tax-tin-foreign", "Tax number", <Input id="tax-tin-foreign" value={f.tin} onChange={(e) => set("tin", e.target.value)} autoComplete="off" />, canKeepTin ? `Saved: ${saved?.tin_masked}. Leave empty to keep it.` : individual ? "Leave empty only if you have none." : undefined)}
                  {individual && field("tax-dob", "Date of birth", <Input id="tax-dob" type="date" value={f.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />)}
                  {individual && !f.tin.trim() && !keepTin && field("tax-birthplace", "Place of birth", <Input id="tax-birthplace" value={f.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} />, "Needed when you have no tax number")}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium">{individual ? "Home address" : "Registered address"}</p>
              {field("tax-street", "Street address", <Input id="tax-street" value={f.street} onChange={(e) => set("street", e.target.value)} autoComplete="street-address" />)}
              <div className="grid gap-4 sm:grid-cols-[9rem_1fr_6rem]">
                {field("tax-postal", "Postal code", <Input id="tax-postal" value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} autoComplete="postal-code" />)}
                {field("tax-city", "Town", <Input id="tax-city" value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />)}
                {field("tax-country", "Country", <Input id="tax-country" value={f.countryCode} maxLength={2} onChange={(e) => set("countryCode", e.target.value)} />)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="tax-other" checked={f.hasOtherTin} onCheckedChange={(on) => set("hasOtherTin", on === true)} />
                <Label htmlFor="tax-other" className="font-normal">{individual ? "I" : "The company"} also {individual ? "have" : "has"} a tax number in another country</Label>
              </div>
              {f.hasOtherTin && (
                <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                  {field("tax-other-country", "Country", <Input id="tax-other-country" value={f.otherTinCountry} maxLength={2} onChange={(e) => set("otherTinCountry", e.target.value)} placeholder="e.g. NO" />)}
                  {field("tax-other-number", "Tax number", <Input id="tax-other-number" value={f.otherTin} onChange={(e) => set("otherTin", e.target.value)} autoComplete="off" />, (saved?.other_tin_countries?.length ?? 0) > 0 ? `Saved for ${saved?.other_tin_countries?.join(", ")}. Leave empty to keep it.` : undefined)}
                </div>
              )}
            </div>

            {field("tax-vat", "VAT number (only if you have one)", <Input id="tax-vat" value={f.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="e.g. SE559477391201" />)}

            {!individual && (
              <RadioGroup value={f.peEu === null ? "" : f.peEu ? "yes" : "no"} onValueChange={(v) => set("peEu", v === "yes")} className="space-y-2">
                <p className="text-sm font-medium">Does the company rent out through a fixed place of business in another EU country?</p>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="tax-pe-no" />
                  <Label htmlFor="tax-pe-no" className="font-normal">No</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="tax-pe-yes" />
                  <Label htmlFor="tax-pe-yes" className="font-normal">Yes</Label>
                </div>
                {f.peEu && field("tax-pe-countries", "Which countries?", <Input id="tax-pe-countries" value={f.peCountries} onChange={(e) => set("peCountries", e.target.value)} placeholder="e.g. DE, FI" />)}
              </RadioGroup>
            )}

            <div className="flex items-start gap-2">
              <Checkbox id="tax-confirm" checked={f.confirm} onCheckedChange={(on) => set("confirm", on === true)} />
              <Label htmlFor="tax-confirm" className="font-normal leading-snug">
                I confirm the details are correct and will update them if anything changes.
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              We store your tax number encrypted and only ever show the last part. The full number is used only for the
              yearly report to Skatteverket, and it is deleted after the period the law requires (at least 7 years). See our{" "}
              <Link to="/privacy" className="underline">privacy policy</Link>.
            </p>
            <div className="flex justify-end gap-2">
              {form && saved?.dac7_complete && <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>}
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save tax details"}</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** The function's own error message from a non-2xx response */
async function readError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === "function") {
    const body = await context.json().catch(() => null);
    if (body?.error) return String(body.error);
  }
  return "Your tax details could not be saved. Please try again.";
}
