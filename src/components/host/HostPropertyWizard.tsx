// @ts-nocheck
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, Home, MapPin, Users as UsersIcon, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (propertyId: string) => void;
}

interface WizardState {
  title: string;
  property_type: string;
  description: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  price_per_night: number;
  currency: string;
}

const PROPERTY_TYPES = [
  "Cabin",
  "Cottage",
  "Apartment",
  "House",
  "Villa",
  "Studio",
  "Loft",
  "Chalet",
];

const STEPS = [
  { id: "basics", label: "Basics", icon: Home },
  { id: "location", label: "Location", icon: MapPin },
  { id: "capacity", label: "Capacity", icon: UsersIcon },
  { id: "pricing", label: "Pricing", icon: DollarSign },
] as const;

/**
 * Guided multi-step property creation wizard.
 *
 * Replaces the bare "New Property" insert with a 4-step flow that captures
 * enough data that the property is meaningful on creation (title, location,
 * capacity, price). The property is saved as a draft (active: false) so the
 * host can continue editing in the full PropertyEditor afterwards.
 */
const HostPropertyWizard = ({ open, onOpenChange, onCreated }: Props) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<WizardState>({
    title: "",
    property_type: "Cabin",
    description: "",
    location: "",
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    price_per_night: 1500,
    currency: "SEK",
  });

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const canAdvance = () => {
    if (step === 0) return state.title.trim().length >= 3 && state.property_type;
    if (step === 1) return state.location.trim().length >= 2;
    if (step === 2) return state.bedrooms > 0 && state.bathrooms > 0 && state.max_guests > 0;
    if (step === 3) return state.price_per_night > 0;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();
      if (!profile) throw new Error("No profile");

      const { data, error } = await supabase
        .from("properties")
        .insert({
          title: state.title.trim(),
          description: state.description.trim(),
          location: state.location.trim(),
          property_type: state.property_type,
          bedrooms: state.bedrooms,
          bathrooms: state.bathrooms,
          max_guests: state.max_guests,
          price_per_night: state.price_per_night,
          currency: state.currency,
          host_id: profile.id,
          active: false, // draft — host continues in editor
          hero_image_url: "",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Draft created! Add photos and publish when ready.");
      resetWizard();
      onOpenChange(false);
      onCreated(data.id);
    } catch (e) {
      toast.error((e as Error).message || "Failed to create property");
    } finally {
      setSaving(false);
    }
  };

  const resetWizard = () => {
    setStep(0);
    setState({
      title: "",
      property_type: "Cabin",
      description: "",
      location: "",
      bedrooms: 1,
      bathrooms: 1,
      max_guests: 2,
      price_per_night: 1500,
      currency: "SEK",
    });
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const CurrentIcon = STEPS[step].icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetWizard();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CurrentIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Create a new property</DialogTitle>
              <DialogDescription>
                Step {step + 1} of {STEPS.length}: {STEPS[step].label}
              </DialogDescription>
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Step 0: Basics */}
          {step === 0 && (
            <>
              <div>
                <Label>Property title *</Label>
                <Input
                  value={state.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="e.g., Cozy Lakeside Cabin in Dalarna"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {state.title.length}/60 — Make it descriptive and location-specific
                </p>
              </div>
              <div>
                <Label>Property type *</Label>
                <Select value={state.property_type} onValueChange={(v) => update("property_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Short description</Label>
                <Textarea
                  value={state.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="What makes this place special? You can add more details later."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <>
              <div>
                <Label>City or area *</Label>
                <Input
                  value={state.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="e.g., Are, Jamtland"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You'll pin the exact location on a map in the next step (after saving).
                </p>
              </div>
            </>
          )}

          {/* Step 2: Capacity */}
          {step === 2 && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bedrooms *</Label>
                <Input
                  type="number"
                  min={1}
                  value={state.bedrooms}
                  onChange={(e) => update("bedrooms", Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div>
                <Label>Bathrooms *</Label>
                <Input
                  type="number"
                  min={1}
                  value={state.bathrooms}
                  onChange={(e) => update("bathrooms", Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div>
                <Label>Max guests *</Label>
                <Input
                  type="number"
                  min={1}
                  value={state.max_guests}
                  onChange={(e) => update("max_guests", Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
          )}

          {/* Step 3: Pricing */}
          {step === 3 && (
            <>
              <div>
                <Label>Base price per night *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={100}
                    step={50}
                    value={state.price_per_night}
                    onChange={(e) => update("price_per_night", Math.max(0, Number(e.target.value) || 0))}
                    className="flex-1"
                  />
                  <Select value={state.currency} onValueChange={(v) => update("currency", v)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEK">SEK</SelectItem>
                      <SelectItem value="NOK">NOK</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Swedish cabins typically range 1,200-3,500 SEK/night. You can add seasonal pricing later.
                </p>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Ready to create</p>
                <p className="text-muted-foreground">
                  Your property will be saved as a <strong>draft</strong>. Add photos, amenities, and
                  house rules in the editor, then publish when ready.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canAdvance()} onClick={() => setStep((s) => s + 1)}>
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button disabled={!canAdvance() || saving} onClick={handleCreate}>
              {saving ? "Creating..." : (
                <>
                  <Check className="h-4 w-4 mr-1" /> Create Draft
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostPropertyWizard;
