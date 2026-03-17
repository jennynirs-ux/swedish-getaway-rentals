import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Image as ImageIcon, Star, Trash2, Edit } from "lucide-react";
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

interface ImageMetadata {
  url: string;
  title?: string;
  description?: string;
}

const SortableImage = ({ id, image, isHero, onSetHero, onEdit, onRemove }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div {...attributes} {...listeners} className="cursor-move">
        <img src={image.url} alt={image.title || ""} loading="lazy" decoding="async" className="w-full h-32 object-cover rounded-lg border" />
        {isHero && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
            <Star className="h-3 w-3 fill-current" />
            Hero
          </div>
        )}
      </div>
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export const HostGalleryTab = ({ propertyId, onUpdate }: HostGalleryTabProps) => {
  const [saving, setSaving] = useState(false);
  const [heroImage, setHeroImage] = useState<ImageMetadata>({ url: "" });
  const [propertyPageImages, setPropertyPageImages] = useState<ImageMetadata[]>([]);
  const [galleryImages, setGalleryImages] = useState<ImageMetadata[]>([]);
  const [editingImage, setEditingImage] = useState<{ image: ImageMetadata; index: number; section: string } | null>(null);

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
        .select('hero_image_url, gallery_images, gallery_metadata')
        .eq('id', propertyId)
        .single();

      if (error) throw error;

      if (data) {
        const metadata = Array.isArray(data.gallery_metadata) ? data.gallery_metadata : [];
        const images = Array.isArray(data.gallery_images) ? data.gallery_images : [];

        setHeroImage({ url: data.hero_image_url || "", title: "Hero Image" });
        
        const enrichedImages = images.map((url: string, i: number) => {
          const meta = metadata[i] as any;
          return {
            url,
            title: meta?.title || "",
            description: meta?.description || ""
          };
        });

        setPropertyPageImages(enrichedImages.slice(0, 4));
        setGalleryImages(enrichedImages.slice(4));
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allImages = [...propertyPageImages, ...galleryImages];
      const gallery_images = allImages.map(img => img.url);
      const gallery_metadata = allImages.map(img => ({
        title: img.title || "",
        description: img.description || ""
      }));

      const { error } = await supabase
        .from('properties')
        .update({
          hero_image_url: heroImage.url,
          gallery_images,
          gallery_metadata,
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
      const newImage: ImageMetadata = { url, title: "", description: "" };

      if (target === 'hero') {
        setHeroImage(newImage);
      } else if (target === 'property') {
        setPropertyPageImages(prev => [...prev, newImage].slice(0, 4));
      } else {
        setGalleryImages(prev => [...prev, newImage]);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const allImages = [...propertyPageImages, ...galleryImages];
    const oldIndex = allImages.findIndex((_, i) => i.toString() === active.id);
    const newIndex = allImages.findIndex((_, i) => i.toString() === over.id);

    const reordered = arrayMove(allImages, oldIndex, newIndex);
    setPropertyPageImages(reordered.slice(0, 4));
    setGalleryImages(reordered.slice(4));
  };

  const handleRemoveImage = (index: number, section: 'property' | 'gallery') => {
    if (section === 'property') {
      const newProperty = propertyPageImages.filter((_, i) => i !== index);
      if (galleryImages.length > 0) {
        newProperty.push(galleryImages[0]);
        setGalleryImages(galleryImages.slice(1));
      }
      setPropertyPageImages(newProperty);
    } else {
      setGalleryImages(galleryImages.filter((_, i) => i !== index));
    }
  };

  const handleEditImage = (image: ImageMetadata, index: number, section: string) => {
    setEditingImage({ image: { ...image }, index, section });
  };

  const saveEditedImage = () => {
    if (!editingImage) return;

    const { image, index, section } = editingImage;
    if (section === 'property') {
      const updated = [...propertyPageImages];
      updated[index] = image;
      setPropertyPageImages(updated);
    } else if (section === 'gallery') {
      const updated = [...galleryImages];
      updated[index] = image;
      setGalleryImages(updated);
    }
    setEditingImage(null);
  };

  const allImages = [...propertyPageImages, ...galleryImages];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hero Image</CardTitle>
          <CardDescription>Main image for property cards (not shown in gallery)</CardDescription>
        </CardHeader>
        <CardContent>
          {heroImage.url ? (
            <div className="relative">
              <img src={heroImage.url} alt="Hero" loading="lazy" decoding="async" className="w-full h-64 object-cover rounded-lg border" />
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
          <CardTitle>All Gallery Images</CardTitle>
          <CardDescription>Drag to reorder between Property Page (first 4) and Gallery. Click to edit or remove.</CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allImages.map((_, i) => i.toString())}
              strategy={rectSortingStrategy}
            >
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Property Page Images (first 4)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {propertyPageImages.map((img, index) => (
                      <SortableImage
                        key={index}
                        id={index.toString()}
                        image={img}
                        isHero={false}
                        onSetHero={() => {}}
                        onEdit={() => handleEditImage(img, index, 'property')}
                        onRemove={() => handleRemoveImage(index, 'property')}
                      />
                    ))}
                  </div>
                </div>

                {galleryImages.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Gallery Images</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {galleryImages.map((img, index) => (
                        <SortableImage
                          key={propertyPageImages.length + index}
                          id={(propertyPageImages.length + index).toString()}
                          image={img}
                          isHero={false}
                          onSetHero={() => {}}
                          onEdit={() => handleEditImage(img, index, 'gallery')}
                          onRemove={() => handleRemoveImage(index, 'gallery')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-4">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="gallery-upload"
              onChange={(e) => handleImageUpload(e, propertyPageImages.length < 4 ? 'property' : 'gallery')}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('gallery-upload')?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-2" />
              Add Image
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image</DialogTitle>
          </DialogHeader>
          {editingImage && (
            <div className="space-y-4">
              <img src={editingImage.image.url} alt="" loading="lazy" decoding="async" className="w-full h-48 object-cover rounded" />
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editingImage.image.title || ""}
                  onChange={(e) => setEditingImage({
                    ...editingImage,
                    image: { ...editingImage.image, title: e.target.value }
                  })}
                  placeholder="Image title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingImage.image.description || ""}
                  onChange={(e) => setEditingImage({
                    ...editingImage,
                    image: { ...editingImage.image, description: e.target.value }
                  })}
                  placeholder="Image description"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingImage(null)}>Cancel</Button>
                <Button onClick={saveEditedImage}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
