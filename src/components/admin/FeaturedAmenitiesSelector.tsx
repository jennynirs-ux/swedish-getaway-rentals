// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Wifi, Car, Coffee, Utensils, Waves, TreePine, Mountain, Home, 
  Bed, Bath, Users, Flame, UtensilsCrossed, Thermometer, Shield, 
  Tv, Dumbbell, PawPrint, Snowflake
} from "lucide-react";

interface AmenityData {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  image_url?: string;
  features?: string[];
}

interface FeaturedAmenitiesSelectorProps {
  amenities: AmenityData[];
  featuredAmenities: AmenityData[];
  onChange: (featured: AmenityData[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

const getAmenityIcon = (iconName: string) => {
  switch (iconName?.toLowerCase()) {
    case 'wifi': return Wifi;
    case 'parking': return Car;
    case 'coffee': return Coffee;
    case 'dining': return Utensils;
    case 'sauna': return Waves;
    case 'nature': return TreePine;
    case 'view': return Mountain;
    case 'home': return Home;
    case 'bed': return Bed;
    case 'bath': return Bath;
    case 'guests': return Users;
    case 'fire': return Flame;
    case 'kitchen': return UtensilsCrossed;
    case 'heating': return Thermometer;
    case 'security': return Shield;
    case 'tv': return Tv;
    case 'fitness': return Dumbbell;
    case 'pets': return PawPrint;
    case 'cooling': return Snowflake;
    default: return Home;
  }
};

export const FeaturedAmenitiesSelector = ({
  amenities,
  featuredAmenities,
  onChange,
  onSave,
  saving = false
}: FeaturedAmenitiesSelectorProps) => {
  const { toast } = useToast();
  const [localFeatured, setLocalFeatured] = useState<AmenityData[]>(featuredAmenities);

  const toggleAmenity = (amenity: AmenityData) => {
    const isSelected = localFeatured.some(f => f.title === amenity.title);
    
    if (isSelected) {
      // Remove if already selected
      const newFeatured = localFeatured.filter(f => f.title !== amenity.title);
      setLocalFeatured(newFeatured);
      onChange(newFeatured);
    } else {
      // Add if less than 3 selected
      if (localFeatured.length < 3) {
        const newFeatured = [...localFeatured, amenity];
        setLocalFeatured(newFeatured);
        onChange(newFeatured);
      } else {
        toast({
          title: "Maximum reached",
          description: "You can only select up to 3 featured amenities",
          variant: "destructive"
        });
      }
    }
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({
          title: "Success",
          description: "Featured amenities updated successfully"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save featured amenities",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Featured Amenities</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select up to 3 amenities to highlight in the "What Makes Special" section
            </p>
          </div>
          {onSave && (
            <Button 
              onClick={handleSave}
              disabled={saving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary">
            {localFeatured.length}/3 selected
          </Badge>
        </div>

        {amenities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No amenities available. Add amenities first to select featured ones.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {amenities.map((amenity, index) => {
              const IconComponent = getAmenityIcon(amenity.icon);
              const isSelected = localFeatured.some(f => f.title === amenity.title);
              
              return (
                <Card 
                  key={index} 
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                  onClick={() => toggleAmenity(amenity)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={isSelected}
                        onChange={() => {}} // Handled by card click
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">{amenity.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {amenity.tagline}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {amenity.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};