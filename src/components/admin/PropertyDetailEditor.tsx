import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Settings, Image, Star, BookOpen, Calendar, Upload } from "lucide-react";
import { GalleryMetadataEditor } from "./GalleryMetadataEditor";
import { AmenitiesEditor } from "./AmenitiesEditor";
import { GuidebookEditor } from "./GuidebookEditor";
import { PropertyCalendarWidget } from "./PropertyCalendarWidget";
import { AirbnbSyncManager } from "./AirbnbSyncManager";

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
    tagline_line1: "",
    tagline_line2: "",
    review_rating: "5.0",
    review_count: "0",
    active: true,
  });

  useEffect(() => {
    if (open && propertyId) {
      loadProperty();
    }
  }, [open, propertyId]);

  const loadProperty = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      const galleryMetadata = Array.isArray(data.gallery_metadata) 
        ? data.gallery_metadata.map((meta: any) => ({
            title: meta?.title || "",
            description: meta?.description || "",
            alt: meta?.alt || ""
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
        tagline_line1: (data as any).tagline_line1 || "",
        tagline_line2: (data as any).tagline_line2 || "",
        review_rating: ((data as any).review_rating || 5.0).toString(),
        review_count: ((data as any).review_count || 0).toString(),
        active: data.active,
      });
    } catch (error) {
      console.error('Error loading property:', error);
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
        hero_image_url: form.hero_image_url,
        gallery_images: form.gallery_images,
        gallery_metadata: form.gallery_metadata,
        guidebook_sections: form.guidebook_sections,
        tagline_line1: form.tagline_line1,
        tagline_line2: form.tagline_line2,
        review_rating: parseFloat(form.review_rating) || 5.0,
        review_count: parseInt(form.review_count) || 0,
        active: form.active,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property updated successfully - changes will appear on the property page immediately",
      });

      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
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
          <TabsList className="grid w-full grid-cols-6">
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
              Calendar
            </TabsTrigger>
            <TabsTrigger value="sync">
              <Upload className="h-4 w-4 mr-2" />
              Sync
            </TabsTrigger>
          </TabsList>

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
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Property title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Property location..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
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
                      onChange={(e) => setForm(prev => ({ ...prev, price_per_night: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input
                      type="number"
                      value={form.bedrooms}
                      onChange={(e) => setForm(prev => ({ ...prev, bedrooms: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input
                      type="number"
                      value={form.bathrooms}
                      onChange={(e) => setForm(prev => ({ ...prev, bathrooms: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max guests</Label>
                    <Input
                      type="number"
                      value={form.max_guests}
                      onChange={(e) => setForm(prev => ({ ...prev, max_guests: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={form.active}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, active: checked }))}
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

          <TabsContent value="gallery">
            <GalleryMetadataEditor
              images={form.gallery_images}
              metadata={form.gallery_metadata}
              onChange={(metadata, images) => {
                setForm(prev => ({
                  ...prev,
                  gallery_metadata: metadata,
                  gallery_images: images || prev.gallery_images
                }));
              }}
              onSave={handleSave}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="amenities">
            <AmenitiesEditor
              amenities={form.amenities_data}
              onChange={(amenities) => {
                setForm(prev => ({ ...prev, amenities_data: amenities }));
              }}
              onSave={handleSave}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="guide">
            <GuidebookEditor
              sections={form.guidebook_sections}
              onChange={(sections) => {
                setForm(prev => ({ ...prev, guidebook_sections: sections }));
              }}
              onSave={handleSave}
              saving={saving}
              propertyTitle={form.title}
            />
          </TabsContent>

          <TabsContent value="calendar">
            {property && (
              <PropertyCalendarWidget
                propertyId={property.id}
                basePrice={parseInt(form.price_per_night) || 0}
                currency={form.currency}
                mode="admin"
              />
            )}
          </TabsContent>

          <TabsContent value="sync">
            {property && (
              <AirbnbSyncManager
                propertyId={property.id}
                propertyTitle={form.title}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailEditor;