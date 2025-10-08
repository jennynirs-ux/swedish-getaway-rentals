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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { GalleryMetadataEditor } from "./GalleryMetadataEditor";
import { GuidebookEditor } from "./GuidebookEditor";
import { PropertyCalendarWidget } from "./PropertyCalendarWidget";
import { AirbnbSyncManager } from "./AirbnbSyncManager";
import PropertyPricingRules from "@/components/PropertyPricingRules";
import PropertySpecialPricing from "./PropertySpecialPricing";
import { PricingCalculator } from "./PricingCalculator";
import { BankAccountSetup } from "./BankAccountSetup";
import { CancellationPolicyDisplay } from "../CancellationPolicyDisplay";
import { LocationEditor } from "../LocationEditor";

// Standard-amenities som host klickar i (sparas i kolumnen `amenities`)
const AMENITY_SUGGESTIONS: string[] = [
  "Arkadspel","Båt","Standup Paddle Boards","Babyvakt","Badbalja","Badkar","Badtunna",
  "Bakgård","Barnböcker och leksaker","Barncyklar","Barnstol","Bastu",
  "Basutrustning för matlagning","Betald parkering på tomten","Betald parkering utanför fastigheten",
  "Bidé","Biljardbord","Boende på ett plan","Brandsläckare","Brandvarnare",
  "Brädspel","Brödrost","Båtplats","Böcker och läsmaterial","Cyklar",
  "Dedikerad arbetsyta","Diskmaskin","Egen entré","Frys","Förbandslåda",
  "Gratis parkering","Grillplats","Gym","Hiss","Hängmatta","Hårtork",
  "Intill vattnet","Kaffe","Kaffebryggare","Kajak","Kylskåp","Kök",
  "Lekplats","Ljudanläggning","Luftkonditionering","Matbord","Mikrovågsugn",
  "Pool","Porslin och bestick","TV","Tvättmaskin","Torktumlare",
  "Utemöbler","Uteplats eller balkong","Utomhuskök","Varmvatten","Wifi","Öppen spis"
];

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
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    location: "",
    price_per_night: "",
    currency: "SEK",
    bedrooms: "1",
    bathrooms: "1",
    max_guests: "4",
    // sparas som textsträngar i kolumnen `amenities`
    amenities: [] as string[],
    // egna (custom) amenities-objekt [{title: string}], sparas i `amenities_data`
    amenities_data: [] as { title: string }[],
    // upp till 3 special amenities [{title:string}], sparas i `featured_amenities`
    featured_amenities: [] as { title: string }[],
    hero_image_url: "",
    gallery_images: [] as string[],
    gallery_metadata: [] as any[],
    guidebook_sections: [] as any[],
    tagline_line1: "",
    tagline_line2: "",
    review_rating: "5.0",
    review_count: "0",
    property_type: "Property",
    active: true,
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

      setForm((prev: any) => ({
        ...prev,
        title: data.title || "",
        description: data.description || "",
        location: data.location || "",
        price_per_night: data.price_per_night?.toString() || "",
        currency: data.currency || "SEK",
        bedrooms: data.bedrooms?.toString() || "1",
        bathrooms: data.bathrooms?.toString() || "1",
        max_guests: data.max_guests?.toString() || "4",
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        amenities_data: Array.isArray(data.amenities_data)
          ? data.amenities_data.map((a: any) => ({
              title: a?.title || a?.name || "",
            }))
          : [],
        featured_amenities: Array.isArray(data.featured_amenities)
          ? data.featured_amenities.map((fa: any) => ({ title: fa?.title || fa?.name || "" }))
          : [],
        hero_image_url: data.hero_image_url || "",
        gallery_images: Array.isArray(data.gallery_images) ? data.gallery_images : [],
        gallery_metadata: Array.isArray(data.gallery_metadata) ? data.gallery_metadata : [],
        guidebook_sections: Array.isArray(data.guidebook_sections) ? data.guidebook_sections : [],
        tagline_line1: data.tagline_line1 || "",
        tagline_line2: data.tagline_line2 || "",
        review_rating: (data.review_rating ?? 5.0).toString(),
        review_count: (data.review_count ?? 0).toString(),
        property_type: data.property_type || "Property",
        active: data.active ?? true,
        weekly_discount_percentage: (data.weekly_discount_percentage ?? 0).toString(),
        monthly_discount_percentage: (data.monthly_discount_percentage ?? 0).toString(),
        cancellation_policy: (data.cancellation_policy as "flexible" | "moderate" | "strict") || "moderate",
        street: data.street || "",
        postal_code: data.postal_code || "",
        city: data.city || "",
        country: data.country || "Sweden",
        latitude: (data.latitude ?? null) as number | null,
        longitude: (data.longitude ?? null) as number | null,
      }));
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

  const sanitizeAmenitiesData = (arr: any[]) =>
    (Array.isArray(arr) ? arr : [])
      .map((item) => ({
        title: (item?.title || item?.name || "").toString().trim(),
      }))
      .filter((i) => i.title.length > 0);

  const sanitizeFeatured = (arr: any[]) =>
    (Array.isArray(arr) ? arr : [])
      .map((item) => ({
        title: (item?.title || item?.name || "").toString().trim(),
      }))
      .filter((i) => i.title.length > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        price_per_night: parseInt(form.price_per_night) || 0,
        currency: form.currency,
        bedrooms: parseInt(form.bedrooms) || 1,
        bathrooms: parseInt(form.bathrooms) || 1,
        max_guests: parseInt(form.max_guests) || 4,
        amenities: Array.isArray(form.amenities) ? form.amenities : [],
        amenities_data: (form.amenities_data || []).map((item: any) => ({
          icon: item.icon?.trim() || "",
          title: item.title?.trim() || "",
          tagline: item.tagline?.trim() || "",
          description: item.description?.trim() || "",
          image_url:
            typeof item.image_url === "string" && item.image_url.startsWith("data:")
              ? null
              : item.image_url || "",
          features: Array.isArray(item.features)
            ? item.features.filter((f) => f && f.trim().length > 0)
            : [],
        })),
        featured_amenities: sanitizeFeatured(form.featured_amenities).slice(0, 3),
        hero_image_url:
          typeof form.hero_image_url === "string" && form.hero_image_url.startsWith("data:")
            ? null
            : form.hero_image_url || null,
        gallery_images: Array.isArray(form.gallery_images) ? form.gallery_images.filter((img: string) => !img.startsWith("data:")) : [],
        gallery_metadata: Array.isArray(form.gallery_metadata) ? form.gallery_metadata : [],
        guidebook_sections: Array.isArray(form.guidebook_sections) ? form.guidebook_sections : [],
        tagline_line1: form.tagline_line1,
        tagline_line2: form.tagline_line2,
        review_rating: parseFloat(form.review_rating) || 5.0,
        review_count: parseInt(form.review_count) || 0,
        property_type: form.property_type,
        active: !!form.active,
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

      // broadcast (om du använder realtime)
      try {
        const channel = supabase.channel("admin-property-updates");
        await channel.send({
          type: "broadcast",
          event: "property_updated",
          payload: { propertyId, timestamp: new Date().toISOString() },
        });
      } catch {
        // no-op om channel inte finns
      }

      toast({
        title: "Success",
        description: "Property updated successfully",
      });

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property: {form.title || "Untitled"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic"><Settings className="h-4 w-4 mr-2" />Basic</TabsTrigger>
            <TabsTrigger value="location"><MapPin className="h-4 w-4 mr-2" />Location</TabsTrigger>
            <TabsTrigger value="gallery"><Image className="h-4 w-4 mr-2" />Gallery</TabsTrigger>
            <TabsTrigger value="amenities"><Star className="h-4 w-4 mr-2" />Amenities</TabsTrigger>
            <TabsTrigger value="guide"><BookOpen className="h-4 w-4 mr-2" />Guide</TabsTrigger>
            <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-2" />Calendar & Pricing</TabsTrigger>
          </TabsList>

          {/* BASIC */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((p: any) => ({ ...p, title: e.target.value }))}
                      placeholder="Property title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm((p: any) => ({ ...p, location: e.target.value }))}
                      placeholder="Property location..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
                    placeholder="Detailed property description..."
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Price per night ({form.currency})</Label>
                    <Input
                      type="number"
                      value={form.price_per_night}
                      onChange={(e) => setForm((p: any) => ({ ...p, price_per_night: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input
                      type="number"
                      value={form.bedrooms}
                      onChange={(e) => setForm((p: any) => ({ ...p, bedrooms: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input
                      type="number"
                      value={form.bathrooms}
                      onChange={(e) => setForm((p: any) => ({ ...p, bathrooms: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max guests</Label>
                    <Input
                      type="number"
                      value={form.max_guests}
                      onChange={(e) => setForm((p: any) => ({ ...p, max_guests: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select
                    value={form.property_type}
                    onValueChange={(value) => setForm((p: any) => ({ ...p, property_type: value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {["Villa","Lakehouse","Cabin","Apartment","House","Cottage","Chalet","Lodge","Farmhouse","Treehouse","Houseboat","RV","Boat","Tiny House","Glamping","Property"]
                        .map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!!form.active}
                    onCheckedChange={(checked) => setForm((p: any) => ({ ...p, active: checked }))}
                  />
                  <Label>Property is active and visible</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
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
              onChange={(loc) =>
                setForm((p: any) => ({
                  ...p,
                  street: loc.street || "",
                  postal_code: loc.postal_code || "",
                  city: loc.city || "",
                  country: loc.country || "Sweden",
                  latitude: loc.latitude ?? null,
                  longitude: loc.longitude ?? null
                }))
              }
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </TabsContent>

          {/* GALLERY */}
          <TabsContent value="gallery">
            <Card>
              <CardHeader>
                <CardTitle>Gallery</CardTitle>
                <CardDescription>
                  Markera din bästa bild som <strong>Hero</strong> i galleriet — den används på Property Card & Property Page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GalleryMetadataEditor
                  images={form.gallery_images}
                  metadata={form.gallery_metadata}
                  onChange={(metadata, images) =>
                    setForm((p: any) => ({
                      ...p,
                      gallery_metadata: metadata,
                      gallery_images: images || p.gallery_images
                    }))
                  }
                  onSave={handleSave}
                  saving={saving}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AMENITIES */}
          <TabsContent value="amenities" className="space-y-6">
            {/* Checkbox-lista -> kolumn `amenities` */}
            <Card>
              <CardHeader>
                <CardTitle>Select Amenities</CardTitle>
                <CardDescription>Allmänt tillgängliga bekvämligheter. Sparas i <code>amenities</code>.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllAmenities((prev) => !prev)}
                  >
                    {showAllAmenities ? "Show fewer" : "Show all"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {(showAllAmenities ? AMENITY_SUGGESTIONS : AMENITY_SUGGESTIONS.slice(0, 24)).map(
                    (amenity) => (
                      <label key={amenity} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={form.amenities.includes(amenity)}
                          onChange={(e) => {
                            const selected = e.target.checked
                              ? [...form.amenities, amenity]
                              : form.amenities.filter((a: string) => a !== amenity);
                            setForm((p: any) => ({ ...p, amenities: selected }));
                          }}
                        />
                        <span>{amenity}</span>
                      </label>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2️⃣ Custom Amenities – Full structured version */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Amenities (up to 11)</CardTitle>
                <CardDescription>
                  Add unique amenities that make your property stand out. Each amenity can include an icon, title, tagline, description, features, and image.
                </CardDescription>
              </CardHeader>
            
              <CardContent>
                {form.amenities_data.map((a: any, index: number) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 mb-4 bg-muted/30 relative space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Icon</Label>
                        <Input
                          value={a.icon || ""}
                          onChange={(e) => {
                            const updated = [...form.amenities_data];
                            updated[index].icon = e.target.value;
                            setForm((p: any) => ({ ...p, amenities_data: updated }));
                          }}
                          placeholder="e.g. sauna, wifi, nature, fire"
                        />
                      </div>
            
                      <div>
                        <Label>Title</Label>
                        <Input
                          value={a.title || ""}
                          onChange={(e) => {
                            const updated = [...form.amenities_data];
                            updated[index].title = e.target.value;
                            setForm((p: any) => ({ ...p, amenities_data: updated }));
                          }}
                          placeholder="e.g. Lake Access"
                        />
                      </div>
            
                      <div>
                        <Label>Tagline</Label>
                        <Input
                          value={a.tagline || ""}
                          onChange={(e) => {
                            const updated = [...form.amenities_data];
                            updated[index].tagline = e.target.value;
                            setForm((p: any) => ({ ...p, amenities_data: updated }));
                          }}
                          placeholder="e.g. Enjoy lake access during your stay"
                        />
                      </div>
                    </div>
            
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        rows={2}
                        value={a.description || ""}
                        onChange={(e) => {
                          const updated = [...form.amenities_data];
                          updated[index].description = e.target.value;
                          setForm((p: any) => ({ ...p, amenities_data: updated }));
                        }}
                        placeholder="Describe this amenity..."
                      />
                    </div>
            
                    <div>
                      <Label>Image URL</Label>
                      <Input
                        value={a.image_url || ""}
                        onChange={(e) => {
                          const updated = [...form.amenities_data];
                          updated[index].image_url = e.target.value;
                          setForm((p: any) => ({ ...p, amenities_data: updated }));
                        }}
                        placeholder="Paste an image URL"
                      />
                      {a.image_url && (
                        <img
                          src={a.image_url}
                          alt={a.title || "amenity"}
                          className="w-24 h-24 object-cover rounded-md mt-2 border"
                        />
                      )}
                    </div>
            
                    <div>
                      <Label>Features</Label>
                      <div className="space-y-2">
                        {(a.features || []).map((f: string, fi: number) => (
                          <div key={fi} className="flex gap-2 items-center">
                            <Input
                              value={f}
                              onChange={(e) => {
                                const updated = [...form.amenities_data];
                                const feats = [...(a.features || [])];
                                feats[fi] = e.target.value;
                                updated[index].features = feats;
                                setForm((p: any) => ({ ...p, amenities_data: updated }));
                              }}
                              placeholder="e.g. Private Dock"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                const updated = [...form.amenities_data];
                                updated[index].features = (a.features || []).filter(
                                  (_: any, i: number) => i !== fi
                                );
                                setForm((p: any) => ({ ...p, amenities_data: updated }));
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const updated = [...form.amenities_data];
                            const feats = [...(a.features || []), ""];
                            updated[index].features = feats;
                            setForm((p: any) => ({ ...p, amenities_data: updated }));
                          }}
                        >
                          + Add Feature
                        </Button>
                      </div>
                    </div>
            
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() =>
                        setForm((p: any) => ({
                          ...p,
                          amenities_data: p.amenities_data.filter(
                            (_: any, i: number) => i !== index
                          ),
                        }))
                      }
                    >
                      Remove Amenity
                    </Button>
                  </div>
                ))}
            
                {form.amenities_data.length < 11 && (
                  <Button
                    onClick={() =>
                      setForm((p: any) => ({
                        ...p,
                        amenities_data: [
                          ...p.amenities_data,
                          {
                            icon: "",
                            title: "",
                            tagline: "",
                            description: "",
                            image_url: "",
                            features: [],
                          },
                        ],
                      }))
                    }
                  >
                    + Add Amenity
                  </Button>
                )}
              </CardContent>
            </Card>


            {/* Special (featured) amenities -> kolumn `featured_amenities` */}
            <Card>
              <CardHeader>
                <CardTitle>Special Amenities (max 3)</CardTitle>
                <CardDescription>Select 3 that best represent “What makes it special”.</CardDescription>
              </CardHeader>
              <CardContent>
                {form.amenities_data.length === 0 && (
                  <p className="text-xs text-muted-foreground italic mb-4">
                    First add “Custom Amenities” above, then 3 here.
                  </p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {form.amenities_data.map((a: any) => (
                    <label key={a.title} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={form.featured_amenities.some((f: any) => f.title === a.title)}
                        onChange={(e) => {
                          let updated = [...form.featured_amenities];
                          if (e.target.checked) {
                            if (updated.length < 3) {
                              updated.push({ title: a.title });
                            } else {
                              toast({
                                title: "Limit reached",
                                description: "You can only select up to 3 special amenities.",
                                variant: "destructive",
                              });
                              return;
                            }
                          } else {
                            updated = updated.filter((f: any) => f.title !== a.title);
                          }
                          setForm((p: any) => ({ ...p, featured_amenities: updated }));
                        }}
                      />
                      <span>{a.title}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* GUIDEBOOK */}
          <TabsContent value="guide">
            <Card>
              <CardHeader>
                <CardTitle>Host Guidebook</CardTitle>
                <CardDescription>Hantera sektioner, house rules m.m.</CardDescription>
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

          {/* CALENDAR & PRICING */}
          <TabsContent value="calendar" className="space-y-6">
            {/* Pricing & Discounts */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Discounts</CardTitle>
                <CardDescription>
                  Sätt ditt baspris samt vecko- och månadsrabatter.
                </CardDescription>
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
                      onChange={(e) => setForm((p: any) => ({ ...p, price_per_night: e.target.value }))}
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
                      onChange={(e) => setForm((p: any) => ({ ...p, weekly_discount_percentage: e.target.value }))}
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
                      onChange={(e) => setForm((p: any) => ({ ...p, monthly_discount_percentage: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Applied to 30+ nights</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Kalkylator */}
            <PricingCalculator
              basePrice={parseInt(form.price_per_night) || 0}
              weeklyDiscount={parseFloat(form.weekly_discount_percentage || "0")}
              monthlyDiscount={parseFloat(form.monthly_discount_percentage || "0")}
              currency={form.currency || "SEK"}
            />

            {/* Cancellation Policy */}
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Policy</CardTitle>
                <CardDescription>Välj hur flexibel du vill vara.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="cancellation_policy">Policy Type</Label>
                <Select
                  value={form.cancellation_policy || "moderate"}
                  onValueChange={(value: "flexible" | "moderate" | "strict") =>
                    setForm((p: any) => ({ ...p, cancellation_policy: value }))
                  }
                >
                  <SelectTrigger id="cancellation_policy"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible — Full refund up to 1 day before</SelectItem>
                    <SelectItem value="moderate">Moderate — Full refund up to 5 days before</SelectItem>
                    <SelectItem value="strict">Strict — 50% refund up to 7 days before</SelectItem>
                  </SelectContent>
                </Select>
                <CancellationPolicyDisplay policy={form.cancellation_policy || "moderate"} />
              </CardContent>
            </Card>

            {/* Bankkonto/Stripe */}
            <BankAccountSetup />

            {/* Pricing Rules (min stays, prep days etc.) */}
            <PropertyPricingRules propertyId={propertyId} />

            {/* Special Pricing (datumintervall) */}
            <PropertySpecialPricing
              propertyId={propertyId}
              basePrice={parseInt(form.price_per_night) || 0}
              currency={form.currency || "SEK"}
            />

            {/* Kalender */}
            <PropertyCalendarWidget
              propertyId={propertyId}
              basePrice={parseInt(form.price_per_night) || 0}
              currency={form.currency || "SEK"}
              mode="admin"
            />

            {/* iCal Sync */}
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailEditor;
