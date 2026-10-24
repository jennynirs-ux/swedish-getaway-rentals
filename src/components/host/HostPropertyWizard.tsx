import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Building, Building2, Castle, Check, Fence, Home, Hotel, Mountain, TreePine } from "lucide-react";
import { toast } from "sonner";
import { LocationEditor } from "@/components/LocationEditor";
import { savePropertyPrivateDetails } from "@/lib/propertyPrivateDetails";
import { CountySelect, publicAreaFrom } from "./CountySelect";
import { PROPERTY_TYPE_LABELS } from "./HostBasicTab";
import { TRANSLATION_HINT } from "@/lib/hostDashboard";
import { emptyPriceDraft, parseKronor, PriceFields, priceDraftProblem, savePriceDraft, Stepper, type PriceDraft } from "./listingPrices";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The new draft, and the editor tab to continue on */
  onCreated: (propertyId: string, nextTab: string) => void;
}

interface Place {
  street: string;
  postal_code: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

const PROPERTY_TYPES = [
  { value: "Cabin", icon: TreePine },
  { value: "Cottage", icon: Fence },
  { value: "House", icon: Home },
  { value: "Villa", icon: Castle },
  { value: "Apartment", icon: Building2 },
  { value: "Studio", icon: Hotel },
  { value: "Chalet", icon: Mountain },
  { value: "Loft", icon: Building },
] as const;

const STEPS = [
  { id: "type", title: "Vilket av de här passar bäst in på ditt boende?" },
  { id: "location", title: "Var ligger ditt boende?" },
  { id: "basics", title: "Hur många gäster, sovrum och badrum?" },
  { id: "title", title: "Ge ditt boende ett namn" },
  { id: "price", title: "Sätt ditt pris" },
] as const;

const EMPTY_PLACE: Place = { street: "", postal_code: "", city: "", country: "Sweden", latitude: null, longitude: null };

/**
 * New listing in five short steps, one question each (like Airbnb): type,
 * location (country, county, address and a map pin), guests and rooms, name
 * and description, and price. Saved as a draft; the editor then opens on
 * Photos (or on Location if the pin is still missing, since publishing needs it).
 */
const HostPropertyWizard = ({ open, onOpenChange, onCreated }: Props) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [propertyType, setPropertyType] = useState("");
  const [place, setPlace] = useState<Place>(EMPTY_PLACE);
  const [county, setCounty] = useState("");
  const [guests, setGuests] = useState(4);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<PriceDraft>(emptyPriceDraft(4));

  const hasPin = place.latitude !== null && place.longitude !== null;

  const problem = (): string | null => {
    switch (STEPS[step].id) {
      case "type":
        return propertyType ? null : "Välj den typ som passar bäst.";
      case "location":
        if (!county) return "Välj län.";
        if (place.city.trim().length < 2) return "Skriv in ort.";
        return null;
      case "basics":
        return null;
      case "title":
        return title.trim().length >= 3 ? null : "Ge ditt boende ett namn (minst 3 tecken).";
      case "price":
        return priceDraftProblem(price, guests);
      default:
        return null;
    }
  };

  const reset = () => {
    setStep(0);
    setPropertyType("");
    setPlace(EMPTY_PLACE);
    setCounty("");
    setGuests(4);
    setBedrooms(2);
    setBathrooms(1);
    setTitle("");
    setDescription("");
    setPrice(emptyPriceDraft(4));
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Logga in igen.");
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", userData.user.id).single();
      if (!profile) throw new Error("Vi hittade inte din värdprofil.");

      const { data, error } = await supabase
        .from("properties")
        .insert({
          title: title.trim(),
          description: description.trim(),
          property_type: propertyType,
          // Guests see the area; the street address is private
          location: publicAreaFrom(place.city, place.country),
          city: place.city.trim().toLowerCase(),
          country: place.country,
          county,
          latitude: place.latitude,
          longitude: place.longitude,
          bedrooms,
          bathrooms,
          max_guests: guests,
          price_per_night: parseKronor(price.nightly, 1) ?? 0,
          currency: "SEK",
          host_id: profile.id,
          active: false, // a draft until the host publishes it
          hero_image_url: "",
        })
        .select("id")
        .single();
      if (error) throw error;

      // The draft exists now; what fails below can be fixed in the editor
      const followUps = await Promise.allSettled([
        place.street.trim() || place.postal_code.trim()
          ? savePropertyPrivateDetails(data.id, { street: place.street.trim() || null, postal_code: place.postal_code.trim() || null })
          : Promise.resolve(),
        savePriceDraft(data.id, price, guests),
      ]);
      if (followUps.some((r) => r.status === "rejected")) {
        toast.warning("Utkastet är sparat, men kontrollera adressen och priserna i redigeraren.");
      } else {
        toast.success(hasPin ? "Utkastet är sparat! Lägg nu till foton." : "Utkastet är sparat! Markera nu ditt boende på kartan.");
      }
      reset();
      onOpenChange(false);
      onCreated(data.id, hasPin ? "gallery" : "location");
    } catch (e) {
      toast.error((e as { message?: string })?.message || "Det gick inte att skapa din annons");
    } finally {
      setSaving(false);
    }
  };

  const current = STEPS[step];
  const blocked = problem();
  const last = step === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogDescription>
            Steg {step + 1} av {STEPS.length}
          </DialogDescription>
          <DialogTitle className="text-2xl">{current.title}</DialogTitle>
          <Progress value={((step + 1) / STEPS.length) * 100} className="mt-2 h-1.5" />
        </DialogHeader>

        <div className="pt-2">
          {current.id === "type" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PROPERTY_TYPES.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPropertyType(value)}
                  aria-pressed={propertyType === value}
                  className={`flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors hover:border-foreground/60 ${
                    propertyType === value ? "border-foreground bg-muted" : "border-border"
                  }`}
                >
                  <Icon className="h-7 w-7" />
                  <span className="font-medium">{PROPERTY_TYPE_LABELS[value] ?? value}</span>
                </button>
              ))}
            </div>
          )}

          {current.id === "location" && (
            <LocationEditor
              bare
              mapHeightClass="h-[280px]"
              value={place}
              onChange={(data) =>
                setPlace({
                  street: data.street ?? "",
                  postal_code: data.postal_code ?? "",
                  city: data.city ?? "",
                  country: data.country || "Sweden",
                  latitude: Number.isFinite(data.latitude) ? (data.latitude as number) : null,
                  longitude: Number.isFinite(data.longitude) ? (data.longitude as number) : null,
                })
              }
            >
              <CountySelect value={county} onChange={setCounty} />
            </LocationEditor>
          )}

          {current.id === "basics" && (
            <div className="divide-y">
              <Stepper id="wizard-guests" label="Gäster" hint="Så många som mest kan bo här" value={guests} min={1} max={30} onChange={(n) => {
                setGuests(n);
                setPrice((p) => ({ ...p, guestsIncluded: Math.min(p.guestsIncluded, Math.max(1, n - 1)) }));
              }} />
              <Stepper id="wizard-bedrooms" label="Sovrum" hint="0 för en studio" value={bedrooms} min={0} max={20} onChange={setBedrooms} />
              <Stepper id="wizard-bathrooms" label="Badrum" hint="Ett halvt: toalett utan dusch" value={bathrooms} min={0} max={10} step={0.5} onChange={setBathrooms} />
            </div>
          )}

          {current.id === "title" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="wizard-title">Namn</Label>
                <Input
                  id="wizard-title"
                  value={title}
                  maxLength={60}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="t.ex. Stuga vid sjön med bastu i Dalarna"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">{title.length}/60. Kort och konkret fungerar bäst.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wizard-description">Beskrivning <span className="font-normal text-muted-foreground">(valfritt just nu)</span></Label>
                <Textarea
                  id="wizard-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Vad gör ditt boende speciellt? Du kan skriva mer senare."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{TRANSLATION_HINT}</p>
              </div>
            </div>
          )}

          {current.id === "price" && <PriceFields value={price} onChange={setPrice} maxGuests={guests} />}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button variant="ghost" disabled={step === 0 || saving} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
          </Button>
          <div className="flex items-center gap-3">
            {blocked && <span className="hidden text-xs text-muted-foreground sm:inline">{blocked}</span>}
            {!last ? (
              <Button disabled={!!blocked} onClick={() => setStep((s) => s + 1)}>
                Nästa <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button disabled={!!blocked || saving} onClick={handleCreate}>
                {saving ? "Sparar…" : (
                  <>
                    <Check className="h-4 w-4 mr-1" /> Spara utkast
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        {blocked && <p className="text-xs text-muted-foreground sm:hidden">{blocked}</p>}
        {current.id === "location" && !hasPin && (
          <p className="text-xs text-muted-foreground">Du kan också sätta ut nålen senare, men ditt boende kan inte publiceras utan den.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HostPropertyWizard;
