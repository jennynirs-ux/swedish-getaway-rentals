import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, GripVertical, Save, Star } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useToast } from "@/hooks/use-toast";
import React from "react";

interface GalleryMetadata {
  title: string;
  description: string;
  alt: string;
}

interface GalleryMetadataEditorProps {
  images: string[];
  metadata: GalleryMetadata[];
  heroImageUrl?: string;
  onChange: (metadata: GalleryMetadata[], images?: string[]) => void;
  onSave?: () => Promise<void>;
  onHeroChange?: (url: string) => void;
  saving?: boolean;
}

interface SortableItemProps {
  id: string;
  image: string;
  metadata: GalleryMetadata;
  index: number;
  isHero: boolean;
  onUpdate: (field: keyof GalleryMetadata, value: string) => void;
  onRemove: () => void;
  onSetHero: () => void;
}

const SortableItem = React.memo(
  ({ id, image, metadata, index, isHero, onUpdate, onRemove, onSetHero }: SortableItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={`border ${isHero ? "border-primary" : "border-transparent"}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Drag handle */}
            <div className="flex-shrink-0 flex items-center">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab p-2 hover:bg-accent rounded-md"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Thumbnail */}
            <div className="relative flex-shrink-0">
              <img
                src={image}
                alt={`Gallery image ${index + 1}`}
                className="w-24 h-24 object-cover rounded-md"
                loading="lazy"
              />
              {isHero && (
                <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-0.5 rounded">
                  Hero
                </div>
              )}
            </div>

            {/* Metadata inputs */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Title</Label>
                <Input
                  value={metadata.title}
                  onChange={(e) => onUpdate("title", e.target.value)}
                  placeholder="Image title"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Alt text</Label>
                <Input
                  value={metadata.alt}
                  onChange={(e) => onUpdate("alt", e.target.value)}
                  placeholder="Alt text for accessibility"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Description</Label>
                <Textarea
                  value={metadata.description}
                  onChange={(e) => onUpdate("description", e.target.value)}
                  placeholder="Image description"
                  rows={2}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 items-end">
              <Button
                type="button"
                variant={isHero ? "default" : "outline"}
                size="sm"
                onClick={onSetHero}
              >
                <Star className="h-4 w-4 mr-1" />
                {isHero ? "Hero" : "Set as Hero"}
              </Button>
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
  }
);

export const GalleryMetadataEditor = ({
  images,
  metadata,
  heroImageUrl,
  onChange,
  onSave,
  onHeroChange,
  saving = false,
}: GalleryMetadataEditorProps) => {
  const { toast } = useToast();
  const [localImages, setLocalImages] = useState(images);
  const [localMetadata, setLocalMetadata] = useState(
    metadata.length ? metadata : images.map(() => ({ title: "", description: "", alt: "" }))
  );
  const [localHero, setLocalHero] = useState(heroImageUrl || "");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateMetadata = useCallback(
    (index: number, field: keyof GalleryMetadata, value: string) => {
      setLocalMetadata((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const removeMetadata = (index: number) => {
    setLocalMetadata((prev) => prev.filter((_, i) => i !== index));
    setLocalImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localImages.findIndex((_, i) => i.toString() === active.id);
      const newIndex = localImages.findIndex((_, i) => i.toString() === over.id);

      setLocalImages((prev) => arrayMove(prev, oldIndex, newIndex));
      setLocalMetadata((prev) => arrayMove(prev, oldIndex, newIndex));
    }
  };

  const handleSave = async () => {
    try {
      onChange(localMetadata, localImages);
      if (onHeroChange) onHeroChange(localHero);
      if (onSave) await onSave();
      toast({
        title: "Saved",
        description: "Gallery metadata saved successfully",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save gallery metadata",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Gallery Image Information</Label>
        <div className="flex gap-2">
          {onSave && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
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
              {localImages.map((image, index) => (
                <SortableItem
                  key={index}
                  id={index.toString()}
                  image={image}
                  metadata={localMetadata[index] || { title: "", description: "", alt: "" }}
                  index={index}
                  isHero={localHero === image}
                  onUpdate={(field, value) => updateMetadata(index, field, value)}
                  onRemove={() => removeMetadata(index)}
                  onSetHero={() => setLocalHero(image)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-muted-foreground text-sm">Add gallery images to edit metadata</p>
      )}
    </div>
  );
};
