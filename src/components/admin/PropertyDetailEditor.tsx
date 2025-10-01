import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Settings, Image, Star, BookOpen, Calendar, Upload } from "lucide-react";
import { GalleryMetadataEditor } from "./GalleryMetadataEditor";
import { ImageUpload } from "./ImageUpload";
import { AmenitiesEditor } from "./AmenitiesEditor";
import { FeaturedAmenitiesSelector } from "./FeaturedAmenitiesSelector";
import { GuidebookEditor } from "./GuidebookEditor";
import { PropertyCalendarWidget } from "./PropertyCalendarWidget";
import { AirbnbSyncManager } from "./AirbnbSyncManager";
import PropertyPricingRules from "@/components/PropertyPricingRules";
import PropertySpecialPricing from "./PropertySpecialPricing";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  amenities: string[];
  hero_image_url: string;
  gallery_images: string[];
  gallery_metadata: { title: string; description: string; alt: string }[];
  active: boolean;
}

interface PropertyDetailEditorProps {
  propertyId: string;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
}

/** Förslagslista för amenities (trimma vid behov) */
const AMENITY_SUGGESTIONS: string[] = [
  "Arkadspel","Båt","Standup Paddle Boards","Babyvakt","Badbalja","Badkar","Badtunna",
  "Bagageavlämning tillåts","Bakgård","Bakmaskin","Bakplåtspapper","Balsam",
  "Barnböcker och leksaker","Barncyklar","Barnservis","Barnstol","Bastu",
  "Basutrustning för matlagning","Betald parkering på tomten","Betald parkering utanför fastigheten",
  "Bidé","Biljardbord","Biograf","Boende på ett plan","Bowlinghall","Brandsläckare","Brandvarnare",
  "Brädspel","Brödrost","Bärbara fläktar","Båtplats","Böcker och läsmaterial","Cyklar",
  "Dedikerad arbetsyta","Diskmaskin","Duschgel","Duschtvål","Egen entré","Eget vardagsrum",
  "Ethernet-anslutning","Extra kuddar och filtar","Frukost","Frys","Fönstersäkring","Förbandslåda",
  "Galgar","Gratis parkering inkluderad","Gratis parkering på gatan","Grillplats","Grillredskap","Gym",
  "Hiss","Hockeyrink","Hängmatta","Hårtork","Hörnskydd för bord","Intill vattnet","Kaffe","Kaffebryggare",
  "Kajak","Kassaskåp","Klädförvaring","Klättervägg","Kokvrå","Kolmonoxidlarm","Komprimator för skräp",
  "Kylskåp","Kök","Laddare för elbil","Lasergame","Lekplats utomhus","Lekrum för barn","Ljudanläggning",
  "Luftkonditionering","Långtidsvistelser tillåtna","Matbord","Matplats utomhus","Mikrovågsugn",
  "Minigolf","Minikyl","Mixer","Myggnät","Mörkläggningsgardin","Nära pisten","Petsäkra kontakter",
  "Piano","Pingisbord","Pool","Porslin och bestick","Portabel wifi","Rekommendationer gällande barnvakt",
  "Rengöringsprodukter","Resesäng","Riskokare","Schampo","Skateboardramp","Skivspelare","Skydd för öppen spis",
  "Skötbord","Slagbur","Solstolar","Spel i naturlig storlek","Spelkonsol","Spis","Spjälsäng",
  "Strandleksaker","Strykjärn","Städning tillgänglig under vistelsen","Säkerhetsgrindar för barn","Sängkläder",
  "Takfläkt","Temarum","Tillgång till semesteranläggning","Tillgång till sjön","Tillgång till strand",
  "Torkställ för kläder","Torktumlare","Träningsredskap","TV","Tvättmaskin","Tvättomat i närheten","Ugn",
  "Uppvärmning","Utedusch","Utemöbler","Uteplats eller balkong","Utomhuskök","Varmvatten","Varmvattenkokare",
  "Vinglas","Väsentligheter","Wifi","Öppen eld utomhus","Öppen spis",
  // Tillgänglighet:
  "Parkeringsplats för rörelsehindrade","Upplyst gångväg till gästentrén","Åtkomst utan nivåskillnad",
  "Gästentrén är bredare än 81 centimeter","Lyftanordning för pool eller badtunna",
  "Takhiss eller mobil lyftanordning"
];

const PropertyDetailEditor = ({ propertyId, open, onClose, onSave }: PropertyDetailEditorProps) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    price_per_night: "",
    currency: "SEK",
    bedrooms: "1",
    bathrooms: "1",
    max_guests: "4",
    amenities: [] as string[],
    amenities_data: [] as any[],
    hero_image_url: "",
    gallery_images: [] as string[],
    gallery_metadata: [] as { title: string; description: string; alt: string }[],
    guidebook_sections: [] as any[],
    featured_amenities: [] as any[],
    tagline_line1: "",
    tagline_line2: "",
    review_rating: "5.0",
    review_count: "0",
    property_type: "Property",
    active: true,
  });

  // Quick-add Amenity (läggs överst)
  const [quickAmenity, setQuickAmenity] = useState("");

  useEffect(() => {
    if (open && propertyId) {
      loadProperty();
    }
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

      const galleryMetadata = Array.isArray(data.gallery_metadata)
        ? data.gallery_metadata.map((meta: any) => ({
            title: meta?.title || "",
            description: meta?.description || "",
            alt: meta?.alt || "",
          }))
        : [];

      const propertyData: Property = {
        id: data.id,
        title: data.title || "",
        description: data.description || "",
        location: data.location || "",
        price_per_night: data.price_per_night || 0,
        currency: data.currency || "SEK",
        bedrooms: data.bedrooms || 1,
        bathrooms: data.bathrooms || 1,
        max_guests: data.max_guests || 4,
        amenities: data.amenities || [],
        hero_image_url: data.hero_image_url || "",
        gallery_images: data.gallery_images || [],
        gallery_metadata: galleryMetadata,
        active: data.active || false,
      };

      setProperty(propertyData);
      setForm({
        title: data.title || "",
        description: data.description || "",
        location: data.location || "",
        price_per_night: data.price_per_night?.toString() || "",
        currency: data.currency || "SEK",
        bedrooms: data.bedrooms?.toString() || "1",
        bathrooms: data.bathrooms?.toString() || "1",
        max_guests: data.max_guests?.toString() || "4",
        amenities: data.amenities || [],
        amenities_data: (data as any).amenities_data || [],
        hero_image_url: data.hero_image_url || "",
        gallery_images: data.gallery_images || [],
        gallery_metadata: galleryMetadata,
        guidebook_sections: (data as any).guidebook_sections || [],
        featured_amenities: (data as any).featured_amenities || [],
        tagline_line1: (data as any).tagline_line1 || "",
        tagline_line2: (data as any).tagline_line2 || "",
        review_rating: ((data as any).review_rating || 5.0).toString(),
        review_count: ((data as any).review_count || 0).toString(),
        property_type: (data as any).property_type || "Property",
        active: data.active,
      });
    } catch (error) {
      console.error("Error loading property:", error);
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
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        price_per_night: parseInt(form.price_per_night) || 0,
        currency: form.currency,
        bedrooms: parseInt(form.bedrooms) || 1,
        bathrooms: parseInt(form.bathrooms) || 1,
        max_guests: parseInt(form.max_guests) || 4,
        amenities: form.amenities,
        amenities_data: form.amenities_data,
        featured_amenities: form.featured_amenities,
        hero_image_url: form.hero_image_url,
        gallery_images: form.gallery_images,
        gallery_metadata: form.gallery_metadata,
        guidebook_sections: form.guidebook_sections,
        tagline_line1: form.tagline_line1,
        tagline_line2: form.tagline_line2,
        review_rating: parseFloat(form.review_rating) || 5.0,
        review_count: parseInt(form.review_count) || 0,
        property_type: form.property_type,
        active: form.active,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("properties")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", propertyId)
        .select("id")
        .single();

      if (error) throw error;

      const channel = supabase.channel("admin-property-updates");
      await channel.send({
        type: "broadcast",
        event: "property_updated",
        payload: { propertyId, timestamp: new Date().toISOString() },
      });

      toast({
        title: "Success",
        description:
          "Property updated successfully - changes will appear on the property page immediately",
      });

      onSave?.();
      onClose();
    } catch (error) {
      console.error("Error saving property:", error);
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Quick add amenity överst
  const addAmenityTop = () => {
    const value = quickAmenity.trim();
    if (!value) return;
    const next = [{ name: value }, ...form.amenities_data]; // antar shape {name:string}; justera vid behov
    setForm((prev) => ({ ...prev, amenities_data: next }));
    setQuickAmenity("");
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property: {property?.title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          {/* 5 flikar (Sync är flyttad till Calendar & Pricing) */}
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">
              <Settings className="h-4 w-4 mr-2" />
              Basic
            </TabsTrigger>
            <TabsTrigger value="gallery">
              <Image className="h-4 w-4 mr-2" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="amenities">
              <Star className="h-4 w-4 mr-2" />
              Amenities
            </TabsTrigger>
            <TabsTrigger value="guide">
              <BookOpen className="h-4 w-4 mr-2" />
              Guide
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar & Pricing
            </TabsTrigger>
          </TabsList>

          {/* BASIC */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Property title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={form.location}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="Property location..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hero Image</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a hero image for your property. This will be displayed on the property card, property page header, and first tab in guidebook.
                  </p>
                  <div className="space-y-2">
                    {form.hero_image_url && (
                      <div className="relative w-full h-48">
                        <img
                          src={form.hero_image_url}
                          alt="Hero"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <Input
                      type="url"
                      placeholder="Enter image URL or upload below..."
                      value={form.hero_image_url}
                      onChange={(e) => setForm((prev) => ({ ...prev, hero_image_url: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select
                    value={form.property_type}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, property_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Lakehouse">Lakehouse</SelectItem>
                      <SelectItem value="Cabin">Cabin</SelectItem>
                      <SelectItem value="Apartment">Apartment</SelectItem>
                      <SelectItem value="House">House</SelectItem>
                      <SelectItem value="Cottage">Cottage</SelectItem>
                      <SelectItem value="Chalet">Chalet</SelectItem>
                      <SelectItem value="Lodge">Lodge</SelectItem>
                      <SelectItem value="Farmhouse">Farmhouse</SelectItem>
                      <SelectItem value="Treehouse">Treehouse</SelectItem>
                      <SelectItem value="Houseboat">Houseboat</SelectItem>
                      <SelectItem value="RV">RV</SelectItem>
                      <SelectItem value="Boat">Boat</SelectItem>
                      <SelectItem value="Tiny House">Tiny House</SelectItem>
                      <SelectItem value="Glamping">Glamping</SelectItem>
                      <SelectItem value="Property">Property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Detailed property description..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Price per night (SEK)</Label>
                    <Input
                      type="number"
                      value={form.price_per_night}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, price_per_night: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input
                      type="number"
                      value={form.bedrooms}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bedrooms: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input
                      type="number"
                      value={form.bathrooms}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bathrooms: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max guests</Label>
                    <Input
                      type="number"
                      value={form.max_guests}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, max_guests: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, active: checked }))
                    }
                  />
                  <Label>Property is active and visible</Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* GALLERY */}
          <TabsContent value="gallery">
            <GalleryMetadataEditor
              images={form.gallery_images}
              metadata={form.gallery_metadata}
              onChange={(metadata, images) => {
                setForm((prev) => ({
                  ...prev,
                  gallery_metadata: metadata,
                  gallery_images: images || prev.gallery_images,
                }));
              }}
              onSave={handleSave}
              saving={saving}
            />
          </TabsContent>

          {/* AMENITIES */}
          <TabsContent value="amenities" className="space-y-6">
            {/* Quick add överst */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Add Amenity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={quickAmenity}
                    onChange={(e) => setQuickAmenity(e.target.value)}
                    placeholder="Add amenity (e.g. Badtunna, Bastu, Grillplats...)"
                    list="amenities-suggestions"
                  />
                  <Button onClick={addAmenityTop}>Add</Button>
                </div>
                <datalist id="amenities-suggestions">
                  {AMENITY_SUGGESTIONS.map((s) => (
                    <option value={s} key={s} />
                  ))}
                </datalist>
              </CardContent>
            </Card>

            <AmenitiesEditor
              amenities={form.amenities_data}
              onChange={(amenities) => {
                setForm((prev) => ({ ...prev, amenities_data: amenities }));
              }}
              onSave={handleSave}
              saving={saving}
              // Om din komponent stödjer props för att dölja text vid ikoner/ändra ordning,
              // kan du lägga till t.ex. insertAtTop / hideIconLabels här.
            />

            <FeaturedAmenitiesSelector
              amenities={form.amenities_data}
              featuredAmenities={form.featured_amenities || []}
              onChange={(featured) => {
                setForm((prev) => ({ ...prev, featured_amenities: featured }));
              }}
              onSave={handleSave}
              saving={saving}
            />
          </TabsContent>

          {/* GUIDEBOOK */}
          <TabsContent value="guide">
            <GuidebookEditor
              sections={form.guidebook_sections}
              onChange={(sections) => {
                setForm((prev) => ({ ...prev, guidebook_sections: sections }));
              }}
              onSave={handleSave}
              saving={saving}
              propertyTitle={form.title}
            />
          </TabsContent>

          {/* CALENDAR & PRICING (inkl. Sync flyttad hit) */}
          <TabsContent value="calendar" className="space-y-6">
            <PropertyPricingRules propertyId={propertyId} />

            <PropertySpecialPricing
              propertyId={propertyId}
              basePrice={property?.price_per_night || 0}
              currency={property?.currency || "SEK"}
            />

            {property && (
              <PropertyCalendarWidget
                propertyId={property.id}
                basePrice={parseInt(form.price_per_night) || 0}
                currency={form.currency}
                mode="admin"
              />
            )}

            {/* Sync flyttad hit */}
            {property && (
              <Card>
                <CardHeader>
                  <CardTitle>Sync with other calendars</CardTitle>
                </CardHeader>
                <CardContent>
                  <AirbnbSyncManager
                    propertyId={property.id}
                    propertyTitle={form.title}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailEditor;
