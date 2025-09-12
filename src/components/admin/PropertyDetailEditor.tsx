import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Plus, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [uploading, setUploading] = useState(false);
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
    amenities_descriptions: {} as Record<string, string>,
    hero_image_url: "",
    gallery_images: [] as string[],
    gallery_metadata: [] as { title: string; description: string; alt: string }[],
    guidebook_sections: [] as { title: string; content: string; image_url?: string }[],
    active: true,
  });
  const [newAmenity, setNewAmenity] = useState("");

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

      // Convert gallery_metadata safely
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
        amenities_descriptions: data.amenities_descriptions || {},
        hero_image_url: data.hero_image_url || "",
        gallery_images: data.gallery_images || [],
        gallery_metadata: galleryMetadata,
        guidebook_sections: data.guidebook_sections || [],
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

  const handleImageUpload = async (file: File, type: 'hero' | 'gallery') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `property-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      if (type === 'hero') {
        setForm(prev => ({ ...prev, hero_image_url: publicUrl }));
      } else {
        setForm(prev => ({ 
          ...prev, 
          gallery_images: [...prev.gallery_images, publicUrl],
          gallery_metadata: [
            ...prev.gallery_metadata, 
            { title: "", description: "", alt: `Gallery image ${prev.gallery_images.length + 1}` }
          ]
        }));
      }

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index),
      gallery_metadata: prev.gallery_metadata.filter((_, i) => i !== index),
    }));
  };

  const updateGalleryMetadata = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      gallery_metadata: prev.gallery_metadata.map((meta, i) => 
        i === index ? { ...meta, [field]: value } : meta
      ),
    }));
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !form.amenities.includes(newAmenity.trim())) {
      const amenity = newAmenity.trim();
      setForm(prev => ({ 
        ...prev, 
        amenities: [...prev.amenities, amenity],
        amenities_descriptions: { ...prev.amenities_descriptions, [amenity]: "" }
      }));
      setNewAmenity("");
    }
  };

  const removeAmenity = (amenity: string) => {
    setForm(prev => {
      const newDescriptions = { ...prev.amenities_descriptions };
      delete newDescriptions[amenity];
      return {
        ...prev, 
        amenities: prev.amenities.filter(a => a !== amenity),
        amenities_descriptions: newDescriptions
      };
    });
  };

  const updateAmenityDescription = (amenity: string, description: string) => {
    setForm(prev => ({
      ...prev,
      amenities_descriptions: {
        ...prev.amenities_descriptions,
        [amenity]: description
      }
    }));
  };

  const addGuidebookSection = () => {
    setForm(prev => ({
      ...prev,
      guidebook_sections: [...prev.guidebook_sections, { title: "", content: "", image_url: "" }]
    }));
  };

  const updateGuidebookSection = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      guidebook_sections: prev.guidebook_sections.map((section, i) => 
        i === index ? { ...section, [field]: value } : section
      )
    }));
  };

  const removeGuidebookSection = (index: number) => {
    setForm(prev => ({
      ...prev,
      guidebook_sections: prev.guidebook_sections.filter((_, i) => i !== index)
    }));
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
        amenities_descriptions: form.amenities_descriptions,
        hero_image_url: form.hero_image_url,
        gallery_images: form.gallery_images,
        gallery_metadata: form.gallery_metadata,
        guidebook_sections: form.guidebook_sections,
        active: form.active,
      };

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property updated successfully",
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Property: {property?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
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

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  placeholder="Add amenity..."
                  onKeyPress={(e) => e.key === 'Enter' && addAmenity()}
                />
                <Button onClick={addAmenity} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {form.amenities.map((amenity, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{amenity}</Badge>
                      <button onClick={() => removeAmenity(amenity)}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Textarea
                      placeholder="Amenity description..."
                      value={form.amenities_descriptions[amenity] || ""}
                      onChange={(e) => updateAmenityDescription(amenity, e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Hero Image */}
          <Card>
            <CardHeader>
              <CardTitle>Hero Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.hero_image_url && (
                <img
                  src={form.hero_image_url}
                  alt="Hero image"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div className="flex gap-2">
                <Input
                  value={form.hero_image_url}
                  onChange={(e) => setForm(prev => ({ ...prev, hero_image_url: e.target.value }))}
                  placeholder="Hero image URL..."
                />
                <Button
                  onClick={() => document.getElementById('hero-upload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <input
                  id="hero-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'hero');
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Gallery Images */}
          <Card>
            <CardHeader>
              <CardTitle>Gallery Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => document.getElementById('gallery-upload')?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add Gallery Image
              </Button>
              <input
                id="gallery-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file, 'gallery');
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.gallery_images.map((image, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="relative">
                      <img
                        src={image}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => removeGalleryImage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Image title..."
                        value={form.gallery_metadata[index]?.title || ""}
                        onChange={(e) => updateGalleryMetadata(index, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="Alt text..."
                        value={form.gallery_metadata[index]?.alt || ""}
                        onChange={(e) => updateGalleryMetadata(index, 'alt', e.target.value)}
                      />
                      <Textarea
                        placeholder="Image description..."
                        value={form.gallery_metadata[index]?.description || ""}
                        onChange={(e) => updateGalleryMetadata(index, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Guidebook Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Guidebook Content
                <Button onClick={addGuidebookSection} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.guidebook_sections.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No guidebook sections yet. Add sections to help guests understand your property.
                </p>
              ) : (
                <div className="space-y-4">
                  {form.guidebook_sections.map((section, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Section {index + 1}</h4>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => removeGuidebookSection(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          placeholder="Section title..."
                          value={section.title}
                          onChange={(e) => updateGuidebookSection(index, 'title', e.target.value)}
                        />
                        <Input
                          placeholder="Section image URL (optional)..."
                          value={section.image_url || ""}
                          onChange={(e) => updateGuidebookSection(index, 'image_url', e.target.value)}
                        />
                      </div>
                      <Textarea
                        placeholder="Section content..."
                        value={section.content}
                        onChange={(e) => updateGuidebookSection(index, 'content', e.target.value)}
                        rows={4}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailEditor;