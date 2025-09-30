import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, Save, Star } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

interface GalleryMetadata {
  title: string;
  description: string;
  alt: string;
}

interface GalleryMetadataEditorProps {
  images: string[];
  metadata: GalleryMetadata[];
  heroImageUrl?: string;
  onChange: (metadata: GalleryMetadata[], images?: string[], heroUrl?: string) => void;
  onHeroChange?: (url: string) => void;
  onSave?: () => Promise<void>;
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

const SortableItem = ({
  id,
  image,
  metadata,
  index,
  isHero,
  onUpdate,
  onRemove,
  onSetHero,
}: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="p-4">
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0 flex items-center">
            <div {...attributes} {...listeners} className="cursor-grab p-2 hover:bg-accent rounded-md">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex-shrink-0 relative">
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className="w-24 h-24 object-cover rounded-md border"
            />
            {isHero && (
              <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-0.5 rounded">
                Hero
              </div>
            )}
          </div>
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
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant={isHero ? "default" : "outline"}
              size="sm"
              onClick={onSetHero}
            >
              <Star className="h-4 w-4 mr-1" />
              {isHero ? "Hero" : "Set Hero"}
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
};

export const GalleryMetadataEditor = ({
  images,
  metadata,
  heroImageUrl,
  onChange,
  onHeroChange,
  onSave,
  saving = false,
}: GalleryMetadataEditorProps) => {
  const { toast } = useToast();
  const [localImages, setLocalImages] = useState(images);
  const [localMetadata, setLocalMetadata] = useState(metadata);
  const [localHero, setLocalHero] = useState(heroImageUrl || "");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 🔹 Upload new images to Supabase
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);

    for (const file of files) {
      const filePath = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("property-gallery")
        .upload(filePath, file);

      if (error) {
        toast({ title: "Error", description: `Failed to upload ${file.name}`, variant: "destructive" });
        continue;
      }

      const url = supabase.storage.from("property-gallery").getPublicUrl(filePath).data.publicUrl;
      setLocalImages((prev) => [...prev, url]);
      setLocalMetadata((prev) => [...prev, { title: "", description: "", alt: "" }]);
      onChange([...localMetadata, { title: "", description: "", alt: "" }], [...localImages, url], localHero);
    }
  };

  const updateMetadata = (index: number, field: keyof GalleryMetadata, value: string) => {
    const newMetadata = [...localMetadata];
    newMetadata[index] = { ...newMetadata[index], [field]: value };
    setLocalMetadata(newMetadata);
    onChange(newMetadata, localImages, localHero);
  };

  const removeMetadata = (index: number) => {
    const newMetadata = localMetadata.filter((_, i) => i !== index);
    const newImages = localImages.filter((_, i) => i !== index);
    if (localHero === localImages[index]) {
      setLocalHero("");
      onHeroChange?.("");
    }
    setLocalMetadata(newMetadata);
    setLocalImages(newImages);
    onChange(newMetadata, newImages, localHero);
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
      onChange(newMetadata, newImages, localHero);
    }
  };

  const handleSetHero = (url: string) => {
    setLocalHero(url);
    onHeroChange?.(url);
    onChange(localMetadata, localImages, url);
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({ title: "Success", description: "Gallery saved successfully" });
      } catch {
        toast({ title: "Error", description: "Failed to save gallery", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Gallery</Label>
        <div className="flex gap-2">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="gallery-upload"
          />
          <Button asChild variant="outline" size="sm">
            <label htmlFor="gallery-upload" className="cursor-pointer">
              Upload Images
            </label>
          </Button>
          {onSave && (
            <Button type="button" variant="default" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      {localImages.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localImages.map((_, i) => i.toString())} strategy={verticalListSortingStrategy}>
            <div className="grid gap-4">
              {localImages.map((image, index) => {
                const meta = localMetadata[index] || { title: "", description: "", alt: "" };
                return (
                  <SortableItem
                    key={index}
                    id={index.toString()}
                    image={image}
                    metadata={meta}
                    index={index}
                    isHero={localHero === image}
                    onUpdate={(field, value) => updateMetadata(index, field, value)}
                    onRemove={() => removeMetadata(index)}
                    onSetHero={() => handleSetHero(image)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-muted-foreground text-sm">No images uploaded yet. Use the button above to add images.</p>
      )}
    </div>
  );
};
