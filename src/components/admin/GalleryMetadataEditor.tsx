import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, Save } from "lucide-react";
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

interface GalleryMetadata {
  title: string;
  description: string;
  alt: string;
}

interface GalleryMetadataEditorProps {
  images: string[];
  metadata: GalleryMetadata[];
  onChange: (metadata: GalleryMetadata[], images?: string[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

interface SortableItemProps {
  id: string;
  image: string;
  metadata: GalleryMetadata;
  index: number;
  onUpdate: (field: keyof GalleryMetadata, value: string) => void;
  onRemove: () => void;
}

const SortableItem = ({ id, image, metadata, index, onUpdate, onRemove }: SortableItemProps) => {
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
          <div className="flex-shrink-0">
            <img 
              src={image} 
              alt={`Gallery image ${index + 1}`}
              className="w-20 h-20 object-cover rounded-md"
            />
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Title</Label>
              <Input
                value={metadata.title}
                onChange={(e) => onUpdate('title', e.target.value)}
                placeholder="Image title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Alt text</Label>
              <Input
                value={metadata.alt}
                onChange={(e) => onUpdate('alt', e.target.value)}
                placeholder="Alt text for accessibility"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={metadata.description}
                onChange={(e) => onUpdate('description', e.target.value)}
                placeholder="Image description"
                rows={2}
              />
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

export const GalleryMetadataEditor = ({ 
  images, 
  metadata, 
  onChange, 
  onSave, 
  saving = false 
}: GalleryMetadataEditorProps) => {
  const { toast } = useToast();
  const [localImages, setLocalImages] = useState(images);
  const [localMetadata, setLocalMetadata] = useState(metadata);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateMetadata = (index: number, field: keyof GalleryMetadata, value: string) => {
    const newMetadata = [...localMetadata];
    if (!newMetadata[index]) {
      newMetadata[index] = { title: '', description: '', alt: '' };
    }
    newMetadata[index][field] = value;
    setLocalMetadata(newMetadata);
    onChange(newMetadata, localImages);
  };

  const addDefaultMetadata = () => {
    const newMetadata = [...localMetadata];
    while (newMetadata.length < localImages.length) {
      newMetadata.push({ title: '', description: '', alt: '' });
    }
    setLocalMetadata(newMetadata);
    onChange(newMetadata, localImages);
  };

  const removeMetadata = (index: number) => {
    const newMetadata = localMetadata.filter((_, i) => i !== index);
    const newImages = localImages.filter((_, i) => i !== index);
    setLocalMetadata(newMetadata);
    setLocalImages(newImages);
    onChange(newMetadata, newImages);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localImages.findIndex((_, i) => i.toString() === active.id);
      const newIndex = localImages.findIndex((_, i) => i.toString() === over.id);

      const newImages = arrayMove(localImages, oldIndex, newIndex);
      const newMetadata = arrayMove(localMetadata, oldIndex, newIndex);
      
      setLocalImages(newImages);
      setLocalMetadata(newMetadata);
      onChange(newMetadata, newImages);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({
          title: "Success",
          description: "Gallery metadata saved successfully"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save gallery metadata",
          variant: "destructive"
        });
      }
    }
  };

  // Sync with props when they change
  useState(() => {
    setLocalImages(images);
  });

  useState(() => {
    setLocalMetadata(metadata);
  });

  // Ensure metadata array matches images length
  if (localMetadata.length < localImages.length) {
    addDefaultMetadata();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Gallery Image Information</Label>
        <div className="flex gap-2">
          {localImages.length > localMetadata.length && (
            <Button type="button" variant="outline" size="sm" onClick={addDefaultMetadata}>
              <Plus className="h-4 w-4 mr-2" />
              Add metadata for all images
            </Button>
          )}
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
      
      {localImages.length > 0 ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={localImages.map((_, index) => index.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4">
              {localImages.map((image, index) => {
                const meta = localMetadata[index] || { title: '', description: '', alt: '' };
                return (
                  <SortableItem
                    key={index}
                    id={index.toString()}
                    image={image}
                    metadata={meta}
                    index={index}
                    onUpdate={(field, value) => updateMetadata(index, field, value)}
                    onRemove={() => removeMetadata(index)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-muted-foreground text-sm">Add gallery images to edit metadata</p>
      )}
    </div>
  );
};