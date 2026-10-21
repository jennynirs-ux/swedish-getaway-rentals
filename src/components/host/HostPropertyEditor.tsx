import { useState, useEffect, useRef, type ReactNode, type SyntheticEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyPreparationDays } from "@/components/admin/PropertyPreparationDays";
import AvailabilityCalendar from "@/components/admin/AvailabilityCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileText, Sparkles, Banknote, BookOpen, Mail, MapPin, Image, KeyRound } from "lucide-react";
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
import PropertyPricingRules from "@/components/PropertyPricingRules";
import { PropertySpecialPricingEnhanced } from "@/components/admin/PropertySpecialPricingEnhanced";
import CouponForm from "@/components/CouponForm";
import { PropertyCouponsList } from "@/components/PropertyCouponsList";
import { GuidebookEditor } from "@/components/admin/GuidebookEditorEnhanced";
import { AirbnbSyncManager } from "@/components/admin/AirbnbSyncManager";
import PreArrivalSettings from "@/components/admin/PreArrivalSettings";
import { ImageUploadFolder } from "@/components/admin/ImageUpload";

const EDITOR_TABS = [
  { value: "basic", label: "Basic", icon: FileText },
  { value: "amenities", label: "Amenities", icon: Sparkles },
  { value: "gallery", label: "Gallery", icon: Image },
  { value: "location", label: "Location", icon: MapPin },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "pricing", label: "Pricing", icon: Banknote },
  { value: "guide", label: "Guide", icon: BookOpen },
  { value: "arrival", label: "Arrival", icon: KeyRound },
  { value: "emails", label: "Emails", icon: Mail },
] as const;

/**
 * Parts of the editor whose edits are only kept when the host presses Save,
 * and the tab each is on. The gallery saves by itself; the calendar, pricing
 * rules, coupons and arrival settings save each change straight away.
 */
const SECTION_TAB = {
  basic: "basic",
  amenities: "amenities",
  location: "location",
  price: "pricing",
  discounts: "pricing",
  guide: "guide",
  emails: "emails",
} as const;
type Section = keyof typeof SECTION_TAB;
/** Edits kept in this editor's own state (nightly price, guide) survive a tab change; the others are lost with the tab */
const KEPT_ACROSS_TABS: ReadonlySet<Section> = new Set<Section>(["price", "guide"]);

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
      if (!window.confirm(`You have unsaved changes on the ${label} tab. Leave without saving them?`)) return;
      clearDirty(lost);
    }
    setTab(next);
  };

  const [guidebookSections, setGuidebookSections] = useState<GuideSections>([]);
  // The property's map pin: where new guide pins start
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [emailTemplates, setEmailTemplates] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [nightlyPrice, setNightlyPrice] = useState<number>(basePrice);
  const [priceCurrency, setPriceCurrency] = useState<string>(currency || "SEK");

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
         title: 'Success',
         description: 'Guest guide updated successfully'
       });
        saved("guide")();
      } catch (error) {
        console.error('Error saving guidebook:', error);
        toast({
          title: 'Error',
          description: 'Failed to save guest guide',
          variant: 'destructive'
        });
      } finally {
        setSaving(false);
      }
    };

   const handleSaveNightlyPrice = async () => {
     setSavingPrice(true);
     try {
       const { error } = await supabase
         .from('properties')
         .update({
           price_per_night: nightlyPrice,
           currency: priceCurrency,
           updated_at: new Date().toISOString()
         })
         .eq('id', propertyId);
       if (error) throw error;
       // Extra fees are charged in the property's currency; keep their label in step
       if (priceCurrency !== currency) {
         await supabase.from('properties_pricing_rules').update({ currency: priceCurrency }).eq('property_id', propertyId);
       }
       toast({ title: 'Success', description: 'Nightly price updated' });
       saved("price")();
     } catch (error) {
       console.error('Error updating nightly price:', error);
       toast({ title: 'Error', description: 'Failed to update nightly price', variant: 'destructive' });
     } finally {
       setSavingPrice(false);
     }
   };

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={changeTab} className="w-full">
        {/* Labels on every screen and one icon per tab: on phones the bar wraps
            into three rows instead of spilling over the heading */}
        <TabsList className="grid h-auto w-full grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1 mb-2">
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
            <p className="text-muted-foreground">Basic property information and settings</p>
          </div>
          <Tracked onEdit={markDirty("basic")}>
            <HostBasicTab propertyId={propertyId} onUpdate={saved("basic")} />
          </Tracked>
        </TabsContent>

        <TabsContent value="amenities" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Amenities</h2>
            <p className="text-muted-foreground">Configure property features and highlights</p>
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
            <h2 className="text-2xl font-bold mb-1">Gallery</h2>
            <p className="text-muted-foreground">Manage property images and photos</p>
          </div>
          <HostGalleryTab propertyId={propertyId} onUpdate={onUpdate} />
        </TabsContent>

        <TabsContent value="location" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Location</h2>
            <p className="text-muted-foreground">Set location and nearby points of interest</p>
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

        <TabsContent value="calendar" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Calendar</h2>
            <p className="text-muted-foreground">Manage availability and booking dates</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
              <CardDescription>Block dates or adjust availability (synced dates are read-only)</CardDescription>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar defaultPropertyId={propertyId} />
            </CardContent>
          </Card>

          <AirbnbSyncManager propertyId={propertyId} propertyTitle={propertyTitle} />

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Preparation Days</CardTitle>
              <CardDescription>Set days needed between bookings</CardDescription>
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
              <CardTitle>Check-in / Check-out Times</CardTitle>
              <CardDescription>Set your property's check-in and check-out times</CardDescription>
            </CardHeader>
            <CardContent>
              <CheckInOutTimes propertyId={propertyId} onUpdate={onUpdate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Pricing</h2>
            <p className="text-muted-foreground">Configure pricing rules and special rates</p>
          </div>

          <Tracked onEdit={markDirty("price")}>
          <Card>
            <CardHeader>
              <CardTitle>Nightly Base Price</CardTitle>
              <CardDescription>Set your standard nightly rate</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nightly-price">Price per night</Label>
                <Input id="nightly-price" type="number" value={nightlyPrice}
                  onChange={(e) => setNightlyPrice(parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-currency">Currency</Label>
                <Select value={priceCurrency} onValueChange={setPriceCurrency}>
                  <SelectTrigger id="price-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEK">SEK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveNightlyPrice} disabled={savingPrice}>
                  {savingPrice ? 'Saving...' : 'Save'}
                </Button>
              </div>
          </CardContent>
          </Card>
          </Tracked>

          <Tracked onEdit={markDirty("discounts")}>
            <HostDiscountSettings propertyId={propertyId} onUpdate={saved("discounts")} />
          </Tracked>

          <PropertyPricingRules propertyId={propertyId} />

          <PropertySpecialPricingEnhanced
            propertyId={propertyId}
            basePrice={basePrice}
            currency={currency}
          />

          <Card>
            <CardHeader>
              <CardTitle>Coupons</CardTitle>
              <CardDescription>Create discount coupons for your guests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Display existing coupons */}
              <PropertyCouponsList propertyId={propertyId} onUpdate={onUpdate} />
              
              {/* Create new coupon */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Create New Coupon</h3>
                <CouponForm onSubmitted={onUpdate} propertyId={propertyId} />
              </div>
            </CardContent>
          </Card>

          {/* The price typed above, so the host sees its effect before saving */}
          <HostPricingCalculator
            propertyId={propertyId}
            basePrice={nightlyPrice}
            currency={priceCurrency}
          />
        </TabsContent>

        <TabsContent value="guide" className="mt-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Guest Guide</h2>
            <p className="text-muted-foreground">Create helpful information for your guests</p>
            <p className="text-sm text-muted-foreground mt-1">
              Anyone can read the guide, so keep door codes and the Wi-Fi password in the Arrival tab: only booked
              guests get those.
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