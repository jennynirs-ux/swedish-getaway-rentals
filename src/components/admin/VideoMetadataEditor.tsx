// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, Save, Play } from "lucide-react";
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

interface VideoMetadata {
  title: string;
  description: string;
  thumbnail?: string;
}

interface VideoMetadataEditorProps {
  videos: string[];
  metadata: VideoMetadata[];
  onChange: (metadata: VideoMetadata[], videos?: string[]) => void;
  onSave?: () => Promise<void>;
  saving?: boolean;
}

interface SortableItemProps {
  id: string;
  video: string;
  metadata: VideoMetadata;
  index: number;
  onUpdate: (field: keyof VideoMetadata, value: string) => void;
  onRemove: () => void;
}

const SortableItem = ({ id, video, metadata, index, onUpdate, onRemove }: SortableItemProps) => {
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
            <div className="relative w-32 h-20 bg-gray-100 rounded-md overflow-hidden">
              <video 
                src={video} 
                className="w-full h-full object-cover"
                controls={false}
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <Play className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Title</Label>
              <Input
                value={metadata.title}
                onChange={(e) => onUpdate('title', e.target.value)}
                placeholder="Video title"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={metadata.description}
                onChange={(e) => onUpdate('description', e.target.value)}
                placeholder="Video description"
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

export const VideoMetadataEditor = ({ 
  videos, 
  metadata, 
  onChange, 
  onSave, 
  saving = false 
}: VideoMetadataEditorProps) => {
  const { toast } = useToast();
  const [localVideos, setLocalVideos] = useState(videos);
  const [localMetadata, setLocalMetadata] = useState(metadata);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateMetadata = (index: number, field: keyof VideoMetadata, value: string) => {
    const newMetadata = [...localMetadata];
    if (!newMetadata[index]) {
      newMetadata[index] = { title: '', description: '' };
    }
    newMetadata[index][field] = value;
    setLocalMetadata(newMetadata);
    onChange(newMetadata, localVideos);
  };

  const addDefaultMetadata = () => {
    const newMetadata = [...localMetadata];
    while (newMetadata.length < localVideos.length) {
      newMetadata.push({ title: '', description: '' });
    }
    setLocalMetadata(newMetadata);
    onChange(newMetadata, localVideos);
  };

  const removeMetadata = (index: number) => {
    const newMetadata = localMetadata.filter((_, i) => i !== index);
    const newVideos = localVideos.filter((_, i) => i !== index);
    setLocalMetadata(newMetadata);
    setLocalVideos(newVideos);
    onChange(newMetadata, newVideos);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localVideos.findIndex((_, i) => i.toString() === active.id);
      const newIndex = localVideos.findIndex((_, i) => i.toString() === over.id);

      const newVideos = arrayMove(localVideos, oldIndex, newIndex);
      const newMetadata = arrayMove(localMetadata, oldIndex, newIndex);
      
      setLocalVideos(newVideos);
      setLocalMetadata(newMetadata);
      onChange(newMetadata, newVideos);
    }
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast({
          title: "Framgång",
          description: "Video metadata sparades"
        });
      } catch (error) {
        toast({
          title: "Fel",
          description: "Kunde inte spara video metadata",
          variant: "destructive"
        });
      }
    }
  };

  // Sync with props when they change
  useState(() => {
    setLocalVideos(videos);
  });

  useState(() => {
    setLocalMetadata(metadata);
  });

  // Ensure metadata array matches videos length
  if (localMetadata.length < localVideos.length) {
    addDefaultMetadata();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Video Information</Label>
        <div className="flex gap-2">
          {localVideos.length > localMetadata.length && (
            <Button type="button" variant="outline" size="sm" onClick={addDefaultMetadata}>
              <Plus className="h-4 w-4 mr-2" />
              Lägg till metadata för alla videor
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
              {saving ? 'Sparar...' : 'Spara ändringar'}
            </Button>
          )}
        </div>
      </div>
      
      {localVideos.length > 0 ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={localVideos.map((_, index) => index.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4">
              {localVideos.map((video, index) => {
                const meta = localMetadata[index] || { title: '', description: '' };
                return (
                  <SortableItem
                    key={index}
                    id={index.toString()}
                    video={video}
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
        <p className="text-muted-foreground text-sm">Lägg till videor för att redigera metadata</p>
      )}
    </div>
  );
};