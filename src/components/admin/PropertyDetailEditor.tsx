// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Settings,
  Image,
  Star,
  BookOpen,
  Calendar,
  MapPin,
  DollarSign,
} from "lucide-react";
import { GuidebookEditor } from "./GuidebookEditorEnhanced";
import { PropertyCalendarWidget } from "./PropertyCalendarWidget";
import { AirbnbSyncManager } from "./AirbnbSyncManager";
import PropertyPricingRules from "@/components/PropertyPricingRules";
import { PropertySpecialPricingEnhanced } from "./PropertySpecialPricingEnhanced";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { CancellationPolicyDisplay } from "../CancellationPolicyDisplay";
import { LocationEditor } from "../LocationEditor";
import { HostBasicTab } from "../host/HostBasicTab";
import { HostAmenitiesTab } from "../host/HostAmenitiesTab";
import { HostGalleryTab } from "../host/HostGalleryTabEnhanced";

interface PropertyDetailEditorProps {
  propertyId: string;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const PropertyDetailEditor = ({
  propertyId,
  open,
  onClose,
  onSave,
}: PropertyDetailEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [originalForm, setOriginalForm] = useState<any>(null);

  const [form, setForm] = useState<any>({
    title: "",
    price_per_night: "",
    currency: "SEK",
    guidebook_sections: [] as any[],
    weekly_discount_percentage: "0",
    monthly_discount_percentage: "0",
    cancellation_policy: "moderate" as "flexible" | "moderate" | "strict",
    street: "",
    postal_code: "",
    city: "",
    country: "Sweden",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  useEffect(() => {
    if (open && propertyId) {
      loadProperty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, propertyId]);

  const loadProperty = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (error) throw error;

      const loadedForm = {
        title: data.title || "",
        price_per_night: data.price_per_night?.toString() || "",
        currency: data.currency || "SEK",
        guidebook_sections: Array.isArray(data.guidebook_sections) ? data.guidebook_sections : [],
        weekly_discount_percentage: (data.weekly_discount_percentage ?? 0).toString(),
        monthly_discount_percentage: (data.monthly_discount_percentage ?? 0).toString(),
        cancellation_policy: (data.cancellation_policy as "flexible" | "moderate" | "strict") || "moderate",
        street: data.street || "",
        postal_code: data.postal_code || "",
        city: data.city || "",
        country: data.country || "Sweden",
        latitude: (data.latitude ?? null) as number | null,
        longitude: (data.longitude ?? null) as number | null,
      };

      setForm((prev: any) => ({
        ...prev,
        ...loadedForm,
      }));

      setOriginalForm(loadedForm);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Error loading property:", err);
      toast({
        title: "Error",
        description: "Failed to load property details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        guidebook_sections: Array.isArray(form.guidebook_sections) ? form.guidebook_sections : [],
        street: form.street,
        postal_code: form.postal_code,
        city: form.city ? form.city.toLowerCase() : null,
        country: form.country,
        latitude: typeof form.latitude === "number" ? form.latitude : (form.latitude ? Number(form.latitude) : null),
        longitude: typeof form.longitude === "number" ? form.longitude : (form.longitude ? Number(form.longitude) : null),
        weekly_discount_percentage: parseFloat(form.weekly_discount_percentage) || 0,
        monthly_discount_percentage: parseFloat(form.monthly_discount_percentage) || 0,
        cancellation_policy: form.cancellation_policy || "moderate",
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("properties")
        .update(updateData)
        .eq("id", propertyId);

      if (error) throw error;

      try {
        const channel = supabase.channel("admin-property-updates");
        await channel.send({
          type: "broadcast",
          event: "property_updated",
          payload: { propertyId, timestamp: new Date().toISOString() },
        });
      } catch {
        // no-op
      }

      toast({
        title: "Success",
        description: "Property updated successfully",
      });

      setHasUnsavedChanges(false);
      onSave?.();
      onClose();
    } catch (err) {
      console.error("Error saving property:", err);
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseWithCheck = () => {
    if (hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowConfirmClose(false);
    setHasUnsavedChanges(false);
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleCloseWithCheck}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property: {form.title || "Untitled"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full flex flex-wrap gap-1 h-auto p-2">
            <TabsTrigger value="basic" className="flex items-center gap-1 text-xs sm:text-sm">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Basic</span>
            </TabsTrigger>
            <TabsTrigger value="amenities" className="flex items-center gap-1 text-xs sm:text-sm">
              <Star className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Amenities</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-1 text-xs sm:text-sm">
              <Image className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Gallery</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-1 text-xs sm:text-sm">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Location</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-1 text-xs sm:text-sm">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Pricing</span>
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-1 text-xs sm:text-sm">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Guide</span>
            </TabsTrigger>
          </TabsList>

          {/* BASIC */}
          <TabsContent value="basic" className="space-y-6">
            <HostBasicTab 
              propertyId={propertyId}
              onUpdate={() => {
                loadProperty();
                onSave?.();
              }}
            />
          </TabsContent>

          {/* AMENITIES */}
          <TabsContent value="amenities" className="space-y-6">
            <HostAmenitiesTab 
              propertyId={propertyId}
              onUpdate={() => {
                loadProperty();
                onSave?.();
              }}
            />
          </TabsContent>

          {/* GALLERY */}
          <TabsContent value="gallery" className="space-y-6">
            <HostGalleryTab 
              propertyId={propertyId}
              onUpdate={() => {
                loadProperty();
                onSave?.();
              }}
            />
          </TabsContent>

          {/* LOCATION */}
          <TabsContent value="location" className="space-y-6">
            <LocationEditor
              value={{
                street: form.street,
                postal_code: form.postal_code,
                city: form.city,
                country: form.country,
                latitude: form.latitude,
                longitude: form.longitude
              }}
              onChange={(loc) => {
                setForm((p: any) => ({
                  ...p,
                  street: loc.street || "",
                  postal_code: loc.postal_code || "",
                  city: loc.city || "",
                  country: loc.country || "Sweden",
                  latitude: loc.latitude ?? null,
                  longitude: loc.longitude ?? null
                }));
                setHasUnsavedChanges(true);
              }}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseWithCheck}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </TabsContent>

          {/* GUIDEBOOK */}
          <TabsContent value="guide">
            <Card>
              <CardHeader>
                <CardTitle>Host Guidebook</CardTitle>
                <CardDescription>Manage sections, house rules, and more.</CardDescription>
              </CardHeader>
              <CardContent>
                <GuidebookEditor
                  sections={form.guidebook_sections}
                  onChange={(sections) =>
                    setForm((p: any) => ({ ...p, guidebook_sections: sections }))
                  }
                  onSave={handleSave}
                  saving={saving}
                  propertyTitle={form.title}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* CALENDAR */}
          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Availability Management</CardTitle>
                <CardDescription>
                  Set dates as available or unavailable to prevent double bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvailabilityCalendar defaultPropertyId={propertyId} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync with other calendars (iCal)</CardTitle>
              </CardHeader>
              <CardContent>
                <AirbnbSyncManager propertyId={propertyId} propertyTitle={form.title} />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* PRICING */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Discounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_per_night">Nightly Price ({form.currency})</Label>
                    <Input
                      id="price_per_night"
                      type="number"
                      min="0"
                      value={form.price_per_night || ""}
                      onChange={(e) => {
                        setForm((p: any) => ({ ...p, price_per_night: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekly_discount">Weekly Discount (%)</Label>
                    <Input
                      id="weekly_discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.weekly_discount_percentage || ""}
                      onChange={(e) => {
                        setForm((p: any) => ({ ...p, weekly_discount_percentage: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Applied to 7+ nights</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_discount">Monthly Discount (%)</Label>
                    <Input
                      id="monthly_discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.monthly_discount_percentage || ""}
                      onChange={(e) => {
                        setForm((p: any) => ({ ...p, monthly_discount_percentage: e.target.value }));
                        setHasUnsavedChanges(true);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Applied to 30+ nights</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cancellation Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="cancellation_policy">Policy Type</Label>
                <Select
                  value={form.cancellation_policy || "moderate"}
                  onValueChange={(value: "flexible" | "moderate" | "strict") => {
                    setForm((p: any) => ({ ...p, cancellation_policy: value }));
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger id="cancellation_policy"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible — Full refund up to 1 day before</SelectItem>
                    <SelectItem value="moderate">Moderate — Full refund up to 5 days before</SelectItem>
                    <SelectItem value="strict">Strict — 50% refund up to 7 days before</SelectItem>
                  </SelectContent>
                </Select>
                <CancellationPolicyDisplay />
              </CardContent>
            </Card>

            <PropertyPricingRules 
              propertyId={propertyId} 
            />

            <PropertySpecialPricingEnhanced
              propertyId={propertyId}
              basePrice={parseInt(form.price_per_night) || 0}
              currency={form.currency || "SEK"}
              weeklyDiscount={parseFloat(form.weekly_discount_percentage || "0")}
              monthlyDiscount={parseFloat(form.monthly_discount_percentage || "0")}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseWithCheck}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continue editing</AlertDialogCancel>
          <AlertDialogAction onClick={confirmClose}>
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default PropertyDetailEditor;
