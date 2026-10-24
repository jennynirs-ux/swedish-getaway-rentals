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
import { AMENITY_CATEGORIES, AMENITY_LABELS_SV, CATEGORY_LABELS_SV } from "@/content/amenities";

const ICON_OPTIONS = [
  { value: "Flame", label: "Eld", icon: Flame },
  { value: "Waves", label: "Vatten", icon: Waves },
  { value: "Mountain", label: "Berg", icon: Mountain },
  { value: "Sparkles", label: "Bastu/spa", icon: Sparkles },
  { value: "Activity", label: "Aktivitet", icon: Activity },
  { value: "Palmtree", label: "Natur", icon: Palmtree },
  { value: "Fish", label: "Fiske", icon: Fish },
  { value: "Wine", label: "Vin", icon: Wine },
  { value: "Coffee", label: "Kaffe", icon: Coffee },
  { value: "Wifi", label: "Wifi", icon: Wifi },
  { value: "ParkingCircle", label: "Parkering", icon: ParkingCircle },
  { value: "Dog", label: "Husdjur välkomna", icon: Dog },
  { value: "Users", label: "Familj", icon: Users },
  { value: "Lock", label: "Säkert", icon: Lock },
  { value: "Trees", label: "Skog", icon: Trees },
  { value: "Sunrise", label: "Utsikt", icon: Sunrise },
  { value: "Home", label: "Hem", icon: Home },
  { value: "Star", label: "Lyx", icon: Star },
  { value: "Heart", label: "Speciellt", icon: Heart },
];

interface HostAmenitiesTabProps {
  propertyId: string;
  onUpdate?: () => void;
}

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
      // Build featured amenities with full data
      const featuredAmenitiesData = featuredAmenities.map(title => {
        const amenity = customAmenities.find(a => a.title === title);
        if (amenity) {
          return {
            icon: amenity.icon || "",
            title: amenity.title || "",
            tagline: amenity.tagline || "",
            description: amenity.description || "",
            image_url: amenity.image_url || "",
            features: amenity.features || []
          };
        }
        return { title };
      });

      const { error } = await supabase
        .from('properties')
        .update({
          amenities: selectedAmenities,
          amenities_data: customAmenities,
          featured_amenities: featuredAmenitiesData,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Klart',
        description: 'Bekvämligheterna är sparade'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving amenities:', error);
      toast({
        title: 'Något gick fel',
        description: 'Det gick inte att spara bekvämligheterna',
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
          title: 'Max 3',
          description: 'Du kan välja högst 3 utvalda bekvämligheter',
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
          <CardTitle>Välj bekvämligheter</CardTitle>
          <CardDescription>Välj bland vanliga bekvämligheter</CardDescription>
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
                  <span className="font-semibold">{CATEGORY_LABELS_SV[category] ?? category}</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedAmenities.filter(a => amenities.includes(a)).length} valda
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
                      <span>{AMENITY_LABELS_SV[amenity] ?? amenity}</span>
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
          <CardTitle>Egna bekvämligheter</CardTitle>
          <CardDescription>Lägg till något extra med egen beskrivning (ändra ordning med pilarna)</CardDescription>
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
                    title="Flytta upp"
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
                    title="Flytta ned"
                  >
                    <span>↓</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeCustomAmenity(index)}
                  title="Ta bort"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Ikon</Label>
                  <Select
                    value={amenity.icon || undefined}
                    onValueChange={(v) => updateCustomAmenity(index, 'icon', v)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Välj ikon" />
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
                  <Label className="text-sm">Rubrik</Label>
                  <Input
                    value={amenity.title || ""}
                    onChange={(e) => updateCustomAmenity(index, 'title', e.target.value)}
                    placeholder="Namn"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Underrubrik</Label>
                <Input
                  value={amenity.tagline || ""}
                  onChange={(e) => updateCustomAmenity(index, 'tagline', e.target.value)}
                  placeholder="Kort beskrivning"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Beskrivning</Label>
                <Textarea
                  value={amenity.description || ""}
                  onChange={(e) => updateCustomAmenity(index, 'description', e.target.value)}
                  placeholder="Längre beskrivning"
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <ImageUpload
                  label="Bild (valfritt)"
                  value={amenity.image_url || ""}
                  onChange={(url) => updateCustomAmenity(index, 'image_url', url)}
                  onRemove={() => updateCustomAmenity(index, 'image_url', '')}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Detaljer (valfritt)</Label>
                {(amenity.features || []).map((feature: string, featureIndex: number) => (
                  <div key={featureIndex} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const updatedFeatures = [...(amenity.features || [])];
                        updatedFeatures[featureIndex] = e.target.value;
                        updateCustomAmenity(index, 'features', updatedFeatures);
                      }}
                      placeholder="Beskriv en detalj"
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => {
                        const updatedFeatures = (amenity.features || []).filter((_: string, i: number) => i !== featureIndex);
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
                  className="w-full"
                  onClick={() => {
                    const updatedFeatures = [...(amenity.features || []), ""];
                    updateCustomAmenity(index, 'features', updatedFeatures);
                  }}
                >
                  + Lägg till detalj
                </Button>
              </div>
            </div>
          ))}

          {customAmenities.length < 11 && (
            <Button onClick={addCustomAmenity} variant="outline" className="w-full">
              + Lägg till egen bekvämlighet
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utvalda bekvämligheter (max 3)</CardTitle>
          <CardDescription>Lyft fram det bästa med ditt boende</CardDescription>
        </CardHeader>
        <CardContent>
          {customAmenities.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Lägg först till egna bekvämligheter ovan och välj sedan upp till 3 här.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {customAmenities.map((amenity, index) => (
                <label key={index} className="flex items-center space-x-2 text-sm">
                  <Checkbox
                    checked={featuredAmenities.includes(amenity.title)}
                    onCheckedChange={() => toggleFeatured(amenity.title)}
                  />
                  <span>{amenity.title || `Bekvämlighet ${index + 1}`}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Sparar...' : 'Spara ändringar'}
        </Button>
      </div>
    </div>
  );
};