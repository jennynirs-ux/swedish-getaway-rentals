import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, Save, Image as ImageIcon, Download, Share } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  Wifi, MapPin, Phone, LogOut, Shield, Heart, Home, Calendar,
  Coffee, Car, Utensils, Info, Clock, Key
} from "lucide-react";

interface GuidebookSection {
  id?: string;
  icon?: string;
  title: string;
  content: string;
  image_url?: string;
  is_prefilled?: boolean;
  data?: any;
}

interface GuidebookEditorProps {
  sections: GuidebookSection[];
  onChange: (sections: GuidebookSection[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
  propertyTitle?: string;
}

interface SortableGuidebookSectionProps {
  id: string;
  section: GuidebookSection;
  index: number;
  onUpdate: (field: keyof GuidebookSection, value: any) => void;
  onRemove: () => void;
  onImageUpload: (file: File) => Promise<string>;
}

const iconOptions = [
  { value: 'wifi', label: 'WiFi', icon: Wifi },
  { value: 'location', label: 'Location', icon: MapPin },
  { value: 'contact', label: 'Contact', icon: Phone },
  { value: 'checkout', label: 'Check-out', icon: LogOut },
  { value: 'rules', label: 'House Rules', icon: Shield },
  { value: 'thanks', label: 'Thank You', icon: Heart },
  { value: 'home', label: 'General', icon: Home },
  { value: 'calendar', label: 'Schedule', icon: Calendar },
  { value: 'coffee', label: 'Kitchen/Coffee', icon: Coffee },
  { value: 'parking', label: 'Parking', icon: Car },
  { value: 'dining', label: 'Dining', icon: Utensils },
  { value: 'info', label: 'Information', icon: Info },
  { value: 'time', label: 'Times', icon: Clock },
  { value: 'keys', label: 'Keys/Access', icon: Key },
];

const prefilledSections: GuidebookSection[] = [
  {
    id: 'wifi',
    icon: 'wifi',
    title: 'WiFi Information',
    content: 'Network Name: [SSID]\nPassword: [PASSWORD]',
    is_prefilled: true,
    data: { ssid: '', password: '' }
  },
  {
    id: 'location',
    icon: 'location',
    title: 'Location & Directions',
    content: 'Property address and directions for easy arrival.',
    is_prefilled: true,
    data: { address: '', directions: '', map_link: '' }
  },
  {
    id: 'contact',
    icon: 'contact',
    title: 'Contact Information',
    content: 'How to reach us during your stay.',
    is_prefilled: true,
    data: { phone: '', email: '', whatsapp: '' }
  },
  {
    id: 'checkout',
    icon: 'checkout',
    title: 'Check-out Instructions',
    content: 'Please follow these steps when leaving.',
    is_prefilled: true
  },
  {
    id: 'rules',
    icon: 'rules',
    title: 'House Rules',
    content: 'To ensure everyone enjoys their stay.',
    is_prefilled: true
  },
  {
    id: 'thanks',
    icon: 'thanks',
    title: 'Thank you for taking care of our home!',
    content: 'We appreciate your respect for our property.',
    is_prefilled: true
  }
];

const SortableGuidebookSection = ({ 
  id, 
  section, 
  index, 
  onUpdate, 
  onRemove, 
  onImageUpload 
}: SortableGuidebookSectionProps) => {
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

  const selectedIcon = iconOptions.find(opt => opt.value === section.icon);

  const renderDataFields = () => {
    if (!section.is_prefilled || !section.data) return null;

    switch (section.id) {
      case 'wifi':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Network Name (SSID)</Label>
              <Input
                value={section.data.ssid || ''}
                onChange={(e) => onUpdate('data', { ...section.data, ssid: e.target.value })}
                placeholder="WiFi network name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Password</Label>
              <Input
                value={section.data.password || ''}
                onChange={(e) => onUpdate('data', { ...section.data, password: e.target.value })}
                placeholder="WiFi password"
              />
            </div>
          </div>
        );
      case 'location':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Address</Label>
              <Input
                value={section.data.address || ''}
                onChange={(e) => onUpdate('data', { ...section.data, address: e.target.value })}
                placeholder="Full address"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Map Link (Optional)</Label>
              <Input
                value={section.data.map_link || ''}
                onChange={(e) => onUpdate('data', { ...section.data, map_link: e.target.value })}
                placeholder="Google Maps or similar link"
              />
            </div>
          </div>
        );
      case 'contact':
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Phone</Label>
              <Input
                value={section.data.phone || ''}
                onChange={(e) => onUpdate('data', { ...section.data, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Email</Label>
              <Input
                value={section.data.email || ''}
                onChange={(e) => onUpdate('data', { ...section.data, email: e.target.value })}
                placeholder="Contact email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">WhatsApp (Optional)</Label>
              <Input
                value={section.data.whatsapp || ''}
                onChange={(e) => onUpdate('data', { ...section.data, whatsapp: e.target.value })}
                placeholder="WhatsApp number"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Icon Selection */}
              <div className="space-y-2">
                <Label className="text-sm">Icon</Label>
                <Select value={section.icon} onValueChange={(value) => onUpdate('icon', value)}>
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
                  value={section.title}
                  onChange={(e) => onUpdate('title', e.target.value)}
                  placeholder="Section title"
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
                    onClick={() => document.getElementById(`section-image-${index}`)?.click()}
                    disabled={uploading}
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                  <input
                    id={`section-image-${index}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                </div>
                {section.image_url && (
                  <img 
                    src={section.image_url} 
                    alt={section.title}
                    className="w-16 h-16 object-cover rounded-md"
                  />
                )}
              </div>
            </div>

            {/* Special data fields for prefilled sections */}
            {renderDataFields()}

            {/* Content */}
            <div className="space-y-2">
              <Label className="text-sm">Content</Label>
              <Textarea
                value={section.content}
                onChange={(e) => onUpdate('content', e.target.value)}
                placeholder="Section content and instructions"
                rows={4}
              />
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col gap-2">
            {section.is_prefilled && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Pre-filled
              </span>
            )}
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

export const GuidebookEditor = ({ 
  sections, 
  onChange, 
  onSave, 
  saving = false,
  propertyTitle = 'Property'
}: GuidebookEditorProps) => {
  const { toast } = useToast();
  const [localSections, setLocalSections] = useState(sections);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateSection = (index: number, field: keyof GuidebookSection, value: any) => {
    const newSections = [...localSections];
    newSections[index] = { ...newSections[index], [field]: value };
    setLocalSections(newSections);
    onChange(newSections);
  };

  const addCustomSection = () => {
    const newSection: GuidebookSection = {
      icon: 'info',
      title: '',
      content: '',
      is_prefilled: false
    };
    const newSections = [...localSections, newSection];
    setLocalSections(newSections);
    onChange(newSections);
  };

  const addPrefilledSection = (sectionId: string) => {
    const template = prefilledSections.find(s => s.id === sectionId);
    if (template && !localSections.find(s => s.id === sectionId)) {
      const newSections = [...localSections, { ...template }];
      setLocalSections(newSections);
      onChange(newSections);
    }
  };

  const removeSection = (index: number) => {
    const newSections = localSections.filter((_, i) => i !== index);
    setLocalSections(newSections);
    onChange(newSections);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localSections.findIndex((_, i) => i.toString() === active.id);
      const newIndex = localSections.findIndex((_, i) => i.toString() === over.id);

      const newSections = arrayMove(localSections, oldIndex, newIndex);
      setLocalSections(newSections);
      onChange(newSections);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({
          title: "Success",
          description: "Guest guide saved successfully"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save guest guide",
          variant: "destructive"
        });
      }
    }
  };

  const generateShareableLink = () => {
    // Generate a shareable link for the guest guide
    const baseUrl = window.location.origin;
    const guideId = `guide-${Date.now()}`;
    const shareUrl = `${baseUrl}/guide/${guideId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Shareable guest guide link copied to clipboard"
      });
    });
  };

  const exportToPDF = () => {
    // Export guest guide as PDF
    toast({
      title: "PDF Export",
      description: "PDF export functionality will be implemented"
    });
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    // This would typically upload to Supabase storage
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const availablePrefilledSections = prefilledSections.filter(
    ps => !localSections.find(s => s.id === ps.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-medium">Guest Guide for {propertyTitle}</Label>
          <p className="text-sm text-muted-foreground">Create comprehensive information for your guests</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={generateShareableLink}>
            <Share className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
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

      {/* Quick Add Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Add Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addCustomSection}>
              <Plus className="h-4 w-4 mr-2" />
              Custom Section
            </Button>
            {availablePrefilledSections.map(section => (
              <Button
                key={section.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addPrefilledSection(section.id!)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {section.title}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {localSections.length > 0 ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={localSections.map((_, index) => index.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {localSections.map((section, index) => (
                <SortableGuidebookSection
                  key={index}
                  id={index.toString()}
                  section={section}
                  index={index}
                  onUpdate={(field, value) => updateSection(index, field, value)}
                  onRemove={() => removeSection(index)}
                  onImageUpload={handleImageUpload}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No guide sections added yet. Use the quick add buttons above to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};