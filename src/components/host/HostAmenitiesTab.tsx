import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Trash2, 
  Flame, 
  Waves, 
  Mountain, 
  Sparkles, 
  Activity, 
  Palmtree, 
  Fish, 
  Wine, 
  Coffee, 
  Wifi, 
  ParkingCircle, 
  Dog, 
  Users, 
  Lock, 
  Trees, 
  Sunrise,
  Home,
  Star,
  Heart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ICON_OPTIONS = [
  { value: "Flame", label: "Fire", icon: Flame },
  { value: "Waves", label: "Water", icon: Waves },
  { value: "Mountain", label: "Mountain", icon: Mountain },
  { value: "Sparkles", label: "Sauna/Spa", icon: Sparkles },
  { value: "Activity", label: "Activity", icon: Activity },
  { value: "Palmtree", label: "Nature", icon: Palmtree },
  { value: "Fish", label: "Fishing", icon: Fish },
  { value: "Wine", label: "Wine", icon: Wine },
  { value: "Coffee", label: "Coffee", icon: Coffee },
  { value: "Wifi", label: "WiFi", icon: Wifi },
  { value: "ParkingCircle", label: "Parking", icon: ParkingCircle },
  { value: "Dog", label: "Pet Friendly", icon: Dog },
  { value: "Users", label: "Family", icon: Users },
  { value: "Lock", label: "Secure", icon: Lock },
  { value: "Trees", label: "Forest", icon: Trees },
  { value: "Sunrise", label: "View", icon: Sunrise },
  { value: "Home", label: "Home", icon: Home },
  { value: "Star", label: "Premium", icon: Star },
  { value: "Heart", label: "Special", icon: Heart },
];

interface HostAmenitiesTabProps {
  propertyId: string;
  onUpdate?: () => void;
}

const AMENITY_CATEGORIES = {
  Kitchen: [
    "Coffee Maker", "Dishwasher", "Microwave", "Oven", "Refrigerator", 
    "Stove", "Toaster", "Dining Table", "Kitchenware", "Espresso Machine"
  ],
  Bedroom: [
    "Queen Bed", "King Bed", "Single Bed", "Extra Beds", "Linens Provided", 
    "Wardrobe", "Hangers", "Bedside Lamps", "Blackout Curtains"
  ],
  "Living Room": [
    "TV", "Sofa", "Fireplace", "Board Games", "Books", "Sound System",
    "Streaming Services", "Coffee Table"
  ],
  Bathroom: [
    "Hair Dryer", "Towels Provided", "Shower", "Bathtub", "Hot Tub",
    "Sauna", "Toiletries", "Washer", "Dryer"
  ],
  Outside: [
    "Garden", "BBQ Grill", "Outdoor Furniture", "Lake Access", "Beach Access",
    "Parking", "Balcony", "Terrace", "Fire Pit", "Boat Dock"
  ],
  General: [
    "WiFi", "Heating", "Air Conditioning", "Workspace", "Iron",
    "Pet Friendly", "Family Friendly", "First Aid Kit", "Fire Extinguisher"
  ]
};

export const HostAmenitiesTab = ({ propertyId, onUpdate }: HostAmenitiesTabProps) => {
  const [saving, setSaving] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenities, setCustomAmenities] = useState<any[]>([]);
  const [featuredAmenities, setFeaturedAmenities] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Kitchen"]);

  useEffect(() => {
    loadPropertyAmenities();
  }, [propertyId]);

  const loadPropertyAmenities = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('amenities, amenities_data, featured_amenities')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedAmenities(Array.isArray(data.amenities) ? data.amenities : []);
        setCustomAmenities(Array.isArray(data.amenities_data) ? data.amenities_data : []);
        setFeaturedAmenities(
          Array.isArray(data.featured_amenities) 
            ? data.featured_amenities.map((fa: any) => fa.title || fa)
            : []
        );
      }
    } catch (error) {
      console.error('Error loading amenities:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          amenities: selectedAmenities,
          amenities_data: customAmenities,
          featured_amenities: featuredAmenities.map(title => ({ title })),
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Amenities updated successfully'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving amenities:', error);
      toast({
        title: 'Error',
        description: 'Failed to save amenities',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const toggleFeatured = (title: string) => {
    setFeaturedAmenities(prev => {
      if (prev.includes(title)) {
        return prev.filter(a => a !== title);
      } else if (prev.length < 3) {
        return [...prev, title];
      } else {
        toast({
          title: 'Limit reached',
          description: 'You can only select up to 3 special amenities',
          variant: 'destructive'
        });
        return prev;
      }
    });
  };

  const addCustomAmenity = () => {
    setCustomAmenities(prev => [...prev, {
      icon: "",
      title: "",
      tagline: "",
      description: "",
      image_url: "",
      features: []
    }]);
  };

  const removeCustomAmenity = (index: number) => {
    setCustomAmenities(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomAmenity = (index: number, field: string, value: any) => {
    setCustomAmenities(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Amenities</CardTitle>
          <CardDescription>Choose from standard amenities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(AMENITY_CATEGORIES).map(([category, amenities]) => (
            <Collapsible
              key={category}
              open={expandedCategories.includes(category)}
              onOpenChange={(isOpen) => {
                setExpandedCategories(prev =>
                  isOpen
                    ? [...prev, category]
                    : prev.filter(c => c !== category)
                );
              }}
            >
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="font-semibold">{category}</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedAmenities.filter(a => amenities.includes(a)).length} selected
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 border rounded-md">
                  {amenities.map(amenity => (
                    <label key={amenity} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={selectedAmenities.includes(amenity)}
                        onCheckedChange={() => toggleAmenity(amenity)}
                      />
                      <span>{amenity}</span>
                    </label>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Amenities</CardTitle>
          <CardDescription>Add unique amenities with details (use arrows to reorder)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customAmenities.map((amenity, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3 relative bg-card hover:bg-muted/30 transition-colors">
              <div className="absolute top-2 right-2 flex items-center gap-1">
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const updated = [...customAmenities];
                      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                      setCustomAmenities(updated);
                    }}
                    title="Move up"
                  >
                    <span>↑</span>
                  </Button>
                )}
                {index < customAmenities.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const updated = [...customAmenities];
                      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                      setCustomAmenities(updated);
                    }}
                    title="Move down"
                  >
                    <span>↓</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeCustomAmenity(index)}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Icon</Label>
                  <Select
                    value={amenity.icon || undefined}
                    onValueChange={(v) => updateCustomAmenity(index, 'icon', v)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Choose icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex-1">
                  <Label className="text-sm">Title</Label>
                  <Input
                    value={amenity.title || ""}
                    onChange={(e) => updateCustomAmenity(index, 'title', e.target.value)}
                    placeholder="Amenity name"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Tagline</Label>
                <Input
                  value={amenity.tagline || ""}
                  onChange={(e) => updateCustomAmenity(index, 'tagline', e.target.value)}
                  placeholder="Short description"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={amenity.description || ""}
                  onChange={(e) => updateCustomAmenity(index, 'description', e.target.value)}
                  placeholder="Full description"
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Features (optional)</Label>
                <div className="space-y-2">
                  {(amenity.features || []).map((feature: string, fIndex: number) => (
                    <div key={fIndex} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const updatedFeatures = [...(amenity.features || [])];
                          updatedFeatures[fIndex] = e.target.value;
                          updateCustomAmenity(index, 'features', updatedFeatures);
                        }}
                        placeholder="Feature description"
                        className="text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => {
                          const updatedFeatures = (amenity.features || []).filter((_: any, i: number) => i !== fIndex);
                          updateCustomAmenity(index, 'features', updatedFeatures);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updatedFeatures = [...(amenity.features || []), ''];
                      updateCustomAmenity(index, 'features', updatedFeatures);
                    }}
                    className="w-full text-xs"
                  >
                    + Add Feature
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <ImageUpload
                  label="Amenity Image (optional)"
                  value={amenity.image_url || ""}
                  onChange={(url) => updateCustomAmenity(index, 'image_url', url)}
                  onRemove={() => updateCustomAmenity(index, 'image_url', '')}
                />
              </div>
            </div>
          ))}

          {customAmenities.length < 11 && (
            <Button onClick={addCustomAmenity} variant="outline" className="w-full">
              + Add Custom Amenity
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Special Amenities (max 3)</CardTitle>
          <CardDescription>Highlight your best amenities</CardDescription>
        </CardHeader>
        <CardContent>
          {customAmenities.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Add custom amenities above first, then select up to 3 here.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {customAmenities.map((amenity, index) => (
                <label key={index} className="flex items-center space-x-2 text-sm">
                  <Checkbox
                    checked={featuredAmenities.includes(amenity.title)}
                    onCheckedChange={() => toggleFeatured(amenity.title)}
                  />
                  <span>{amenity.title || `Amenity ${index + 1}`}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};