// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, Save, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

interface AmenitiesEditorProps {
  amenities: AmenityData[];
  onChange: (amenities: AmenityData[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

interface SortableAmenityProps {
  id: string;
  amenity: AmenityData;
  index: number;
  onUpdate: (field: keyof AmenityData, value: any) => void;
  onRemove: () => void;
  onImageUpload: (file: File) => Promise<string>;
}

const iconOptions = [
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'parking', label: 'Parking', icon: Car },
  { value: 'coffee', label: 'Coffee/Kitchen', icon: Coffee },
  { value: 'dining', label: 'Dining', icon: Utensils },
  { value: 'sauna', label: 'Sauna/Spa', icon: Waves },
  { value: 'nature', label: 'Nature', icon: TreePine },
  { value: 'view', label: 'View', icon: Mountain },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'bed', label: 'Bedroom', icon: Bed },
  { value: 'bath', label: 'Bathroom', icon: Bath },
  { value: 'guests', label: 'Guests', icon: Users },
  { value: 'fire', label: 'Fireplace', icon: Flame },
  { value: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed },
  { value: 'heating', label: 'Heating', icon: Thermometer },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'tv', label: 'TV/Entertainment', icon: Tv },
  { value: 'fitness', label: 'Fitness', icon: Dumbbell },
  { value: 'pets', label: 'Pet Friendly', icon: PawPrint },
  { value: 'cooling', label: 'Air Conditioning', icon: Snowflake },
];

const SortableAmenity = ({ id, amenity, index, onUpdate, onRemove, onImageUpload }: SortableAmenityProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const imageUrl = await onImageUpload(file);
      onUpdate('image_url', imageUrl);
    } finally {
      setUploading(false);
    }
  };

  const addFeature = (feature: string) => {
    if (feature.trim()) {
      const currentFeatures = amenity.features || [];
      onUpdate('features', [...currentFeatures, feature.trim()]);
    }
  };

  const removeFeature = (index: number) => {
    const currentFeatures = amenity.features || [];
    onUpdate('features', currentFeatures.filter((_, i) => i !== index));
  };

  const selectedIcon = iconOptions.find(opt => opt.value === amenity.icon);

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0 flex items-center">
            <div 
              {...attributes} 
              {...listeners}
              className="cursor-grab p-2 hover:bg-accent rounded-md"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Icon Selection */}
              <div className="space-y-2">
                <Label className="text-sm">Icon</Label>
                <Select value={amenity.icon} onValueChange={(value) => onUpdate('icon', value)}>
                  <SelectTrigger>
                    <SelectValue>
                      {selectedIcon ? (
                        <div className="flex items-center gap-2">
                          <selectedIcon.icon className="h-4 w-4" />
                          {selectedIcon.label}
                        </div>
                      ) : 'Select icon'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm">Title</Label>
                <Input
                  value={amenity.title}
                  onChange={(e) => onUpdate('title', e.target.value)}
                  placeholder="Amenity title"
                />
              </div>

              {/* Tagline */}
              <div className="space-y-2">
                <Label className="text-sm">Tagline</Label>
                <Input
                  value={amenity.tagline}
                  onChange={(e) => onUpdate('tagline', e.target.value)}
                  placeholder="Short tagline"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm">Image (Optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById(`amenity-image-${index}`)?.click()}
                    disabled={uploading}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <input
                    id={`amenity-image-${index}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </div>
                {amenity.image_url && (
                  <img
                    src={amenity.image_url}
                    alt={amenity.title}
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 object-cover rounded-md"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={amenity.description}
                onChange={(e) => onUpdate('description', e.target.value)}
                placeholder="Full description of the amenity"
                rows={3}
              />
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label className="text-sm">Features (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a feature..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFeature(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    addFeature(input.value);
                    input.value = '';
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {amenity.features && amenity.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {amenity.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
                      <span>{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeFeature(featureIndex)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AmenitiesEditor = ({ 
  amenities, 
  onChange, 
  onSave, 
  saving = false 
}: AmenitiesEditorProps) => {
  const { toast } = useToast();
  const [localAmenities, setLocalAmenities] = useState(amenities);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateAmenity = (index: number, field: keyof AmenityData, value: any) => {
    const newAmenities = [...localAmenities];
    newAmenities[index] = { ...newAmenities[index], [field]: value };
    setLocalAmenities(newAmenities);
    onChange(newAmenities);
  };

  const addAmenity = () => {
    const newAmenity: AmenityData = {
      icon: 'home',
      title: '',
      tagline: '',
      description: '',
      features: []
    };
    const newAmenities = [...localAmenities, newAmenity];
    setLocalAmenities(newAmenities);
    onChange(newAmenities);
  };

  const removeAmenity = (index: number) => {
    const newAmenities = localAmenities.filter((_, i) => i !== index);
    setLocalAmenities(newAmenities);
    onChange(newAmenities);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localAmenities.findIndex((_, i) => i.toString() === active.id);
      const newIndex = localAmenities.findIndex((_, i) => i.toString() === over.id);

      const newAmenities = arrayMove(localAmenities, oldIndex, newIndex);
      setLocalAmenities(newAmenities);
      onChange(newAmenities);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({
          title: "Success",
          description: "Amenities saved successfully"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save amenities",
          variant: "destructive"
        });
      }
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    // This would typically upload to Supabase storage
    // For now, return a placeholder URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Amenities</Label>
          <p className="text-sm text-muted-foreground">Manage property amenities and features</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addAmenity}>
            <Plus className="h-4 w-4 mr-2" />
            Add Amenity
          </Button>
          {onSave && (
            <Button 
              type="button" 
              variant="default" 
              size="sm" 
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>
      
      {localAmenities.length > 0 ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={localAmenities.map((_, index) => index.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {localAmenities.map((amenity, index) => (
                <SortableAmenity
                  key={index}
                  id={index.toString()}
                  amenity={amenity}
                  index={index}
                  onUpdate={(field, value) => updateAmenity(index, field, value)}
                  onRemove={() => removeAmenity(index)}
                  onImageUpload={handleImageUpload}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No amenities added yet. Click "Add Amenity" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};