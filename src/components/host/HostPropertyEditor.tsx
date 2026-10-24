import { useState, useEffect, useRef, type ReactNode, type SyntheticEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyPreparationDays } from "@/components/admin/PropertyPreparationDays";
import AvailabilityCalendar from "@/components/admin/AvailabilityCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Sparkles, Banknote, BookOpen, Mail, MapPin, Image, KeyRound, ScrollText } from "lucide-react";
import { CheckInOutTimes } from "@/components/admin/CheckInOutTimes";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { HostBasicTab } from "./HostBasicTab";
import { HostAmenitiesTab } from "./HostAmenitiesTab";
import { HostGalleryTab } from "./HostGalleryTabEnhanced";
import { HostLocationTab } from "./HostLocationTab";
import { EmailTemplatesEditor } from "@/components/admin/EmailTemplatesEditor";
import { HostPricingCalculator } from "./HostPricingCalculator";
import { HostDiscountSettings } from "./HostDiscountSettings";
import { HostPriceSettings } from "./HostPriceSettings";
import { HostExtrasSettings } from "./HostExtrasSettings";
import { HostRulesSettings } from "./HostRulesSettings";
import { PropertySpecialPricingEnhanced } from "@/components/admin/PropertySpecialPricingEnhanced";
import CouponForm from "@/components/CouponForm";
import { PropertyCouponsList } from "@/components/PropertyCouponsList";
import { GuidebookEditor } from "@/components/admin/GuidebookEditorEnhanced";
import { AirbnbSyncManager } from "@/components/admin/AirbnbSyncManager";
import PreArrivalSettings from "@/components/admin/PreArrivalSettings";
import { ImageUploadFolder } from "@/components/admin/ImageUpload";

// In the order a host fills them in (like Airbnb's listing editor)
const EDITOR_TABS = [
  { value: "basic", label: "Detaljer", icon: FileText },
  { value: "gallery", label: "Foton", icon: Image },
  { value: "location", label: "Plats", icon: MapPin },
  { value: "pricing", label: "Priser", icon: Banknote },
  { value: "rules", label: "Regler", icon: ScrollText },
  { value: "calendar", label: "Kalender", icon: Calendar },
  { value: "amenities", label: "Bekvämligheter", icon: Sparkles },
  { value: "guide", label: "Gästguide", icon: BookOpen },
  { value: "arrival", label: "Ankomst", icon: KeyRound },
  { value: "emails", label: "Mejl", icon: Mail },
] as const;

/**
 * Parts of the editor whose edits are only kept when the host presses Save,
 * and the tab each is on. The gallery saves by itself; the calendar, pricing
 * rules, coupons and arrival settings save each change straight away.
 */
const SECTION_TAB = {
  basic: "basic",
  rules: "rules",
  amenities: "amenities",
  location: "location",
  price: "pricing",
  discounts: "pricing",
  guide: "guide",
  emails: "emails",
} as const;
type Section = keyof typeof SECTION_TAB;
/** Edits kept in this editor's own state (the guide) survive a tab change; the others are lost with the tab */
const KEPT_ACROSS_TABS: ReadonlySet<Section> = new Set<Section>(["guide"]);

// Controls that change a value without a native input event (Radix checkbox, switch, radio, select option)
const VALUE_CONTROL = '[role="checkbox"],[role="switch"],[role="radio"],[role="option"],[role="menuitemcheckbox"],[role="menuitemradio"]';

/**
 * Marks its section as edited on any change inside it: typing, file picks,
 * ticking, choosing an option, or setting a pin on a map (a click, or
 * dragging the pin). Panning or zooming a map is not an edit.
 */
const Tracked = ({ onEdit, children }: { onEdit: () => void; children: ReactNode }) => {
  const press = useRef<{ x: number; y: number; onMarker: boolean } | null>(null);
  const closest = (e: SyntheticEvent, selector: string) =>
    e.target instanceof Element ? e.target.closest(selector) : null;
  // Only the host's own actions: Radix dispatches events of its own when a
  // value is set after loading, which are not edits
  const edit = (e: SyntheticEvent) => e.nativeEvent.isTrusted && onEdit();
  return (
    <div
      onInput={edit}
      onChange={edit}
      onClick={(e) => closest(e, VALUE_CONTROL) && edit(e)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && closest(e, '[role="option"]') && edit(e)}
      onPointerDown={(e) => {
        press.current = { x: e.clientX, y: e.clientY, onMarker: !!closest(e, ".leaflet-marker-icon") };
      }}
      onPointerUp={(e) => {
        const start = press.current;
        press.current = null;
        if (closest(e, '[role="option"]')) return edit(e);
        if (!start || !closest(e, ".leaflet-container") || closest(e, ".leaflet-control")) return;
        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (moved < 6 || start.onMarker) edit(e);
      }}
    >
      {children}
    </div>
  );
};

type GuideSections = NonNullable<Parameters<typeof GuidebookEditor>[0]["sections"]>;

const toMapCenter = (row: { latitude: number | null; longitude: number | null }) =>
  row.latitude != null && row.longitude != null ? { lat: row.latitude, lng: row.longitude } : null;

interface HostPropertyEditorProps {
  propertyId: string;
  propertyTitle: string;
  preparationDays: number;
  basePrice: number;
  currency: string;
  /** The tab to open on, e.g. "location" when publishing still needs a pin */
  initialTab?: string;
  onUpdate?: () => void;
  /** Whether any tab has edits that are not saved yet, so the dashboard can ask before closing */
  onDirtyChange?: (dirty: boolean) => void;
}

export const HostPropertyEditor = ({ 
  propertyId, 
  propertyTitle, 
  preparationDays,
  basePrice,
  currency,
  initialTab = "basic",
  onUpdate,
  onDirtyChange,
}: HostPropertyEditorProps) => {
  const [tab, setTab] = useState(initialTab);
  // Sections with edits that are not saved yet
  const [dirty, setDirty] = useState<ReadonlySet<Section>>(new Set());
  const markDirty = (section: Section) => () =>
    setDirty((prev) => (prev.has(section) ? prev : new Set(prev).add(section)));
  const clearDirty = (sections: Section[]) =>
    setDirty((prev) => {
      if (!sections.some((section) => prev.has(section))) return prev;
      const next = new Set(prev);
      sections.forEach((section) => next.delete(section));
      return next;
    });
  /** A section's onUpdate: its edits are saved now */
  const saved = (section: Section) => () => {
    clearDirty([section]);
    onUpdate?.();
  };

  const anyDirty = dirty.size > 0;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    onDirtyChangeRef.current?.(anyDirty);
    if (!anyDirty) return;
    // Closing or reloading the page would drop the edits too
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);
  // Closed: nothing unsaved is left behind
  useEffect(() => () => onDirtyChangeRef.current?.(false), []);

  // Inactive tabs are unmounted, so leaving a tab drops its unsaved edits: ask first
  const changeTab = (next: string) => {
    const lost = (Object.keys(SECTION_TAB) as Section[]).filter(
      (s) => SECTION_TAB[s] === tab && dirty.has(s) && !KEPT_ACROSS_TABS.has(s),
    );
    if (lost.length) {
      const label = EDITOR_TABS.find((t) => t.value === tab)?.label ?? tab;
      if (!window.confirm(`Du har ändringar som inte är sparade under fliken ${label}. Vill du lämna utan att spara?`)) return;
      clearDirty(lost);
    }
    setTab(next);
  };

  const [guidebookSections, setGuidebookSections] = useState<GuideSections>([]);
  // The property's map pin: where new guide pins start
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [emailTemplates, setEmailTemplates] = useState({});
  const [saving, setSaving] = useState(false);
  // The nightly price as typed, for the calculator; its key reloads the
  // calculator's fees after the prices are saved
  const [nightlyPrice, setNightlyPrice] = useState<number>(basePrice);
  const [pricesSaved, setPricesSaved] = useState(0);

  useEffect(() => {
    loadPropertyData();
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('guidebook_sections, email_templates, latitude, longitude')
        .eq('id', propertyId)
        .single();

      if (error) throw error;
      setMapCenter(toMapCenter(data));
      if (data?.guidebook_sections) {
        setGuidebookSections(
          Array.isArray(data.guidebook_sections)
            ? (data.guidebook_sections as unknown as GuideSections)
            : [],
        );
      }
      if (data?.email_templates) {
        setEmailTemplates(data.email_templates);
      }
    } catch (error) {
      console.error('Error loading property data:', error);
    }
  };

  // After a Location save, so new guide pins start at the new pin. Only the
  // coordinates: reloading the guide would drop its unsaved edits
  const refreshMapCenter = async () => {
    const { data } = await supabase
      .from('properties')
      .select('latitude, longitude')
      .eq('id', propertyId)
      .single();
    if (data) setMapCenter(toMapCenter(data));
  };

   const handleSaveGuidebook = async () => {
     setSaving(true);
     try {
       const { error } = await supabase
         .from('properties')
         .update({
           guidebook_sections: guidebookSections as unknown as Json,
           updated_at: new Date().toISOString()
         })
         .eq('id', propertyId);
 
       if (error) throw error;
 
       toast({
         title: 'Sparat',
         description: 'Gästguiden är uppdaterad'
       });
        saved("guide")();
      } catch (error) {
        console.error('Error saving guidebook:', error);
        toast({
          title: 'Något gick fel',
          description: 'Det gick inte att spara gästguiden',
          variant: 'destructive'
        });
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={changeTab} className="w-full">
        {/* Labels on every screen and one icon per tab: on phones the bar wraps
            into three rows instead of spilling over the heading */}
        <TabsList className="grid h-auto w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-1 mb-2">
          {EDITOR_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-1.5 px-2 text-xs sm:text-sm">
              <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="basic" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{propertyTitle}</h2>
            <p className="text-muted-foreground">Namn, beskrivning, gäster och rum</p>
          </div>
          <Tracked onEdit={markDirty("basic")}>
            <HostBasicTab propertyId={propertyId} onUpdate={saved("basic")} />
          </Tracked>
        </TabsContent>

        <TabsContent value="amenities" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Bekvämligheter</h2>
            <p className="text-muted-foreground">Vad boendet har och vad som gör det speciellt</p>
          </div>
          {/* Hosts may only upload into their listing's own folder (storage policy) */}
          <ImageUploadFolder.Provider value={`${propertyId}/amenities`}>
            <Tracked onEdit={markDirty("amenities")}>
              <HostAmenitiesTab propertyId={propertyId} onUpdate={saved("amenities")} />
            </Tracked>
          </ImageUploadFolder.Provider>
        </TabsContent>

        <TabsContent value="gallery" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Foton</h2>
            <p className="text-muted-foreground">Gästerna väljer efter fotona, så lägg ditt bästa först</p>
          </div>
          <HostGalleryTab propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="location" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Plats</h2>
            <p className="text-muted-foreground">Var boendet ligger och vad som finns i närheten</p>
          </div>
          <Tracked onEdit={markDirty("location")}>
            <HostLocationTab
              propertyId={propertyId}
              onUpdate={() => {
                refreshMapCenter();
                saved("location")();
              }}
            />
          </Tracked>
        </TabsContent>

        <TabsContent value="rules" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Regler</h2>
            <p className="text-muted-foreground">Din avbokningsregel och dina husregler</p>
          </div>
          <Tracked onEdit={markDirty("rules")}>
            <HostRulesSettings propertyId={propertyId} onSaved={saved("rules")} />
          </Tracked>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Kalender</h2>
            <p className="text-muted-foreground">Vilka datum som går att boka</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Tillgänglighet</CardTitle>
              <CardDescription>Blockera datum eller ändra tillgängligheten (synkade datum går inte att ändra här)</CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar defaultPropertyId={propertyId} />
            </CardContent>
          </Card>

          <AirbnbSyncManager propertyId={propertyId} propertyTitle={propertyTitle} />

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Förberedelsedagar</CardTitle>
              <CardDescription>Hur många dagar du behöver mellan bokningar</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyPreparationDays 
                propertyId={propertyId} 
                currentPreparationDays={preparationDays}
                onUpdate={onUpdate}
              />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Tider för incheckning och utcheckning</CardTitle>
              <CardDescription>När gästerna kan checka in och ska checka ut</CardDescription>
            </CardHeader>
            <CardContent>
              <CheckInOutTimes propertyId={propertyId} onUpdate={onUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Priser</h2>
            <p className="text-muted-foreground">Ditt pris per natt, extra gäster och städning, sedan rabatter och särskilda priser</p>
          </div>

          <Tracked onEdit={markDirty("price")}>
            <HostPriceSettings
              propertyId={propertyId}
              onPriceChange={setNightlyPrice}
              onSaved={() => {
                saved("price")();
                setPricesSaved((n) => n + 1);
              }}
            />
          </Tracked>

          <HostExtrasSettings propertyId={propertyId} />

          {/* The price typed above, so the host sees its effect before saving */}
          <HostPricingCalculator
            key={pricesSaved}
            propertyId={propertyId}
            basePrice={nightlyPrice}
            currency={currency}
          />

          <Tracked onEdit={markDirty("discounts")}>
            <HostDiscountSettings propertyId={propertyId} onUpdate={saved("discounts")} />
          </Tracked>

          <PropertySpecialPricingEnhanced
            propertyId={propertyId}
            basePrice={basePrice}
            currency={currency}
          />

          <Card>
            <CardHeader>
              <CardTitle>Rabattkoder</CardTitle>
              <CardDescription>Skapa rabattkoder till dina gäster</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display existing coupons */}
              <PropertyCouponsList propertyId={propertyId} onUpdate={onUpdate} />
              
              {/* Create new coupon */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Ny rabattkod</h3>
                <CouponForm onSubmitted={onUpdate} propertyId={propertyId} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Gästguide</h2>
            <p className="text-muted-foreground">Bra att veta för dina gäster</p>
            <p className="text-sm text-muted-foreground mt-1">
              Alla kan läsa gästguiden, så lägg dörrkoder och wifi-lösenord under fliken Ankomst. Bara gäster med
              en bokning får dem.
            </p>
          </div>
          <ImageUploadFolder.Provider value={`${propertyId}/guide`}>
            <Tracked onEdit={markDirty("guide")}>
              <GuidebookEditor
                sections={guidebookSections}
                onChange={setGuidebookSections}
                onSave={handleSaveGuidebook}
                saving={saving}
                propertyTitle={propertyTitle}
                center={mapCenter}
              />
            </Tracked>
          </ImageUploadFolder.Provider>
        </TabsContent>

        <TabsContent value="arrival" className="mt-6 space-y-4">
          <PreArrivalSettings propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="emails" className="mt-6 space-y-4">
          <Tracked onEdit={markDirty("emails")}>
            <EmailTemplatesEditor
              propertyId={propertyId}
              templates={emailTemplates}
              onUpdate={() => {
                loadPropertyData();
                saved("emails")();
              }}
            />
          </Tracked>
        </TabsContent>

        {/* Smart lock (Yale) tab removed: the integration only generated random codes */}
      </Tabs>
    </div>
  );
};