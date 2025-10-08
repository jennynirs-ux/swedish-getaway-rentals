import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Image as ImageIcon, Star } from "lucide-react";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HostGalleryTabProps {
  propertyId: string;
  onUpdate?: () => void;
}

const SortableImage = ({ id, url, isHero, onSetHero }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div {...attributes} {...listeners} className="cursor-move">
        <img src={url} alt="" className="w-full h-32 object-cover rounded-lg border" />
        {isHero && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
            <Star className="h-3 w-3 fill-current" />
            Hero
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={isHero ? "default" : "outline"}
        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onSetHero}
      >
        {isHero ? "Hero" : "Set Hero"}
      </Button>
    </div>
  );
};

export const HostGalleryTab = ({ propertyId, onUpdate }: HostGalleryTabProps) => {
  const [saving, setSaving] = useState(false);
  const [heroImage, setHeroImage] = useState("");
  const [propertyPageImages, setPropertyPageImages] = useState<string[]>([]);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadGalleryData();
  }, [propertyId]);

  const loadGalleryData = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('hero_image_url, gallery_images')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      if (data) {
        setHeroImage(data.hero_image_url || "");
        const allImages = Array.isArray(data.gallery_images) ? data.gallery_images : [];
        setPropertyPageImages(allImages.slice(0, 4));
        setGalleryImages(allImages.slice(4));
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allGalleryImages = [...propertyPageImages, ...galleryImages];

      const { error } = await supabase
        .from('properties')
        .update({
          hero_image_url: heroImage,
          gallery_images: allGalleryImages,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Gallery updated successfully'
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving gallery:', error);
      toast({
        title: 'Error',
        description: 'Failed to save gallery',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'hero' | 'property' | 'gallery') => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const filePath = `${propertyId}/${Date.now()}-${file.name}`;

    try {
      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (error) throw error;

      const url = supabase.storage.from('property-images').getPublicUrl(filePath).data.publicUrl;

      if (target === 'hero') {
        setHeroImage(url);
      } else if (target === 'property') {
        setPropertyPageImages(prev => [...prev, url].slice(0, 4));
      } else {
        setGalleryImages(prev => [...prev, url]);
      }

      toast({
        title: 'Success',
        description: 'Image uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image',
        variant: 'destructive'
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent, list: 'property' | 'gallery') => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const images = list === 'property' ? propertyPageImages : galleryImages;
      const setImages = list === 'property' ? setPropertyPageImages : setGalleryImages;

      const oldIndex = images.findIndex((_, i) => i.toString() === active.id);
      const newIndex = images.findIndex((_, i) => i.toString() === over.id);

      setImages(arrayMove(images, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hero Image</CardTitle>
          <CardDescription>Main image for property cards (not shown in gallery)</CardDescription>
        </CardHeader>
        <CardContent>
          {heroImage ? (
            <div className="relative">
              <img src={heroImage} alt="Hero" className="w-full h-64 object-cover rounded-lg border" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="hero-upload"
                onChange={(e) => handleImageUpload(e, 'hero')}
              />
              <Button
                variant="outline"
                className="absolute bottom-4 right-4"
                onClick={() => document.getElementById('hero-upload')?.click()}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Change
              </Button>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="hero-upload"
                onChange={(e) => handleImageUpload(e, 'hero')}
              />
              <Button onClick={() => document.getElementById('hero-upload')?.click()}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Upload Hero Image
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Property Page Images (4)</CardTitle>
          <CardDescription>First 4 images shown on the property page</CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, 'property')}
          >
            <SortableContext
              items={propertyPageImages.map((_, i) => i.toString())}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {propertyPageImages.map((url, index) => (
                  <SortableImage
                    key={index}
                    id={index.toString()}
                    url={url}
                    isHero={false}
                    onSetHero={() => {}}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {propertyPageImages.length < 4 && (
            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="property-upload"
                onChange={(e) => handleImageUpload(e, 'property')}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('property-upload')?.click()}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Add Image ({propertyPageImages.length}/4)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gallery Images</CardTitle>
          <CardDescription>Additional images shown when gallery is opened</CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, 'gallery')}
          >
            <SortableContext
              items={galleryImages.map((_, i) => i.toString())}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryImages.map((url, index) => (
                  <SortableImage
                    key={index}
                    id={index.toString()}
                    url={url}
                    isHero={false}
                    onSetHero={() => {}}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-4">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="gallery-upload"
              onChange={(e) => handleImageUpload(e, 'gallery')}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('gallery-upload')?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Add Gallery Image
            </Button>
          </div>
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