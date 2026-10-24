import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Image as ImageIcon, Star, Trash2, Edit, Loader2, Check, AlertCircle, Upload } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { imageStorageKeys, prepareImage } from "@/lib/imageResize";

interface HostGalleryTabProps {
  propertyId: string;
  onUpdate?: () => void;
}

interface ImageMetadata {
  url: string;
  title?: string;
  description?: string;
}

interface GalleryState {
  hero: ImageMetadata;
  /** The first 4 show on the property page, the rest in the gallery */
  images: ImageMetadata[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

const BUCKET = "property-images";

const SortableImage = ({ id, image, onSetHero, onEdit, onRemove }: {
  id: string;
  image: ImageMetadata;
  onSetHero: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div {...attributes} {...listeners} className="cursor-move">
        <img src={image.url} alt={image.title || ""} loading="lazy" className="w-full h-32 object-cover rounded-lg border" />
      </div>
      {/* Always visible on touch screens, which have no hover */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <Button size="sm" variant="outline" onClick={onSetHero} title="Använd som huvudbild" aria-label="Använd som huvudbild">
          <Star className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit} title="Ändra rubrik och beskrivning" aria-label="Ändra">
          <Edit className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="destructive" onClick={onRemove} title="Ta bort" aria-label="Ta bort">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

/**
 * Photos of a listing. Every change (upload, reorder, remove, main photo,
 * captions) is saved straight away: uploads used to be kept only until the
 * host clicked "Save Changes", and switching tab lost them.
 */
export const HostGalleryTab = ({ propertyId, onUpdate }: HostGalleryTabProps) => {
  const [hero, setHero] = useState<ImageMetadata>({ url: "" });
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [editingImage, setEditingImage] = useState<{ image: ImageMetadata; index: number } | null>(null);
  // The latest state, for saves that run after several awaits (a batch upload)
  const latest = useRef<GalleryState>({ hero: { url: "" }, images: [] });
  // Saves run one after another, so an older save can never overwrite a newer one
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Press and hold to drag on phones, so a swipe still scrolls the page
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadGalleryData();
  }, [propertyId]);

  const show = (next: GalleryState) => {
    latest.current = next;
    setHero(next.hero);
    setImages(next.images);
  };

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
        const urls = Array.isArray(data.gallery_images) ? data.gallery_images : [];
        show({
          hero: { url: data.hero_image_url || "", title: "Hero Image" },
          images: urls.map((url: string, i: number) => {
            const meta = metadata[i] as { title?: string; description?: string } | undefined;
            return { url, title: meta?.title || "", description: meta?.description || "" };
          }),
        });
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast({
        title: 'Det gick inte att hämta fotona',
        description: error instanceof Error ? error.message : 'Ladda om sidan.',
        variant: 'destructive',
      });
    }
  };

  const writeGallery = async (next: GalleryState) => {
    const { error } = await supabase
      .from('properties')
      .update({
        hero_image_url: next.hero.url,
        gallery_images: next.images.map((img) => img.url),
        gallery_metadata: next.images.map((img) => ({
          title: img.title || "",
          description: img.description || "",
        })),
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId);
    return error;
  };

  /** Show the new state and save it; false when saving failed (the error is shown) */
  const persist = (next: GalleryState, notify = true): Promise<boolean> => {
    show(next);
    setSaveState("saving");
    const run = saveChain.current.then(async () => {
      const error = await writeGallery(next).catch((e: unknown) => ({
        message: e instanceof Error ? e.message : "Nätverksfel",
      }));
      if (error) {
        console.error('Error saving gallery:', error);
        setSaveState("error");
        setSaveError(error.message);
        toast({ title: 'Det gick inte att spara fotona', description: error.message, variant: 'destructive' });
        return false;
      }
      setSaveState("saved");
      setSaveError(null);
      if (notify) onUpdate?.();
      return true;
    });
    saveChain.current = run.catch(() => false);
    return run;
  };

  /** Shrink, upload under a random name in the listing's folder, and return the public URL */
  const uploadOne = async (file: File) => {
    const image = await prepareImage(file, true);
    const keys = imageStorageKeys(propertyId, image.ext);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(keys.full, image.full, { contentType: image.contentType, cacheControl: '31536000' });
    if (error) throw new Error(error.message);
    if (keys.small && image.small) {
      // Best effort: without the small copy, phones simply get the 1600 px photo
      await supabase.storage
        .from(BUCKET)
        .upload(keys.small, image.small, { contentType: image.contentType, cacheControl: '31536000' })
        .catch(() => undefined);
    }
    return supabase.storage.from(BUCKET).getPublicUrl(keys.full).data.publicUrl;
  };

  const handleFiles = async (fileList: FileList | File[] | null, target: 'hero' | 'gallery') => {
    const files = Array.from(fileList ?? []).filter((f) => !f.type || f.type.startsWith('image/'));
    if (files.length === 0 || uploading) return;

    const problems: string[] = [];
    let saved = 0;
    setUploading({ done: 0, total: files.length });
    for (const [i, file] of files.entries()) {
      try {
        const url = await uploadOne(file);
        const current = latest.current;
        const added: ImageMetadata = { url, title: "", description: "" };
        const next: GalleryState =
          target === 'hero'
            ? { ...current, hero: { url, title: "Hero Image" } }
            : {
                // Without a main photo yet, the first one becomes it (the listing card needs one)
                hero: current.hero.url ? current.hero : { url, title: "Hero Image" },
                images: [...current.images, added],
              };
        if (await persist(next, false)) saved++;
        else problems.push(`${file.name}: uppladdad men inte sparad`);
      } catch (error) {
        problems.push(error instanceof Error ? error.message : `${file.name}: uppladdningen misslyckades`);
      }
      setUploading({ done: i + 1, total: files.length });
    }
    setUploading(null);

    if (saved > 0) {
      onUpdate?.();
      toast({ title: saved === 1 ? 'Fotot är sparat' : `${saved} foton sparade` });
    }
    if (problems.length > 0) {
      toast({
        title: problems.length === 1 ? 'Ett foto kunde inte läggas till' : `${problems.length} foton kunde inte läggas till`,
        description: problems.slice(0, 4).join(' ') + (problems.length > 4 ? ' …' : ''),
        variant: 'destructive',
      });
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>, target: 'hero' | 'gallery') => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    // Let the same file be picked again after an error
    e.target.value = "";
    handleFiles(files, target);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    persist({ ...latest.current, images: arrayMove(latest.current.images, oldIndex, newIndex) });
  };

  const handleRemoveImage = (index: number) => {
    persist({ ...latest.current, images: latest.current.images.filter((_, i) => i !== index) });
  };

  const handleSetHero = (index: number) => {
    const image = latest.current.images[index];
    if (!image) return;
    persist({ ...latest.current, hero: { url: image.url, title: "Hero Image" } });
  };

  const saveEditedImage = () => {
    if (!editingImage) return;
    const { image, index } = editingImage;
    const updated = [...latest.current.images];
    updated[index] = image;
    setEditingImage(null);
    persist({ ...latest.current, images: updated });
  };

  const propertyPageImages = images.slice(0, 4);
  const galleryImages = images.slice(4);
  const busy = !!uploading;

  const renderImage = (img: ImageMetadata, index: number) => (
    <SortableImage
      key={index}
      id={index.toString()}
      image={img}
      onSetHero={() => handleSetHero(index)}
      onEdit={() => setEditingImage({ image: { ...img }, index })}
      onRemove={() => handleRemoveImage(index)}
    />
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Huvudbild</CardTitle>
          <CardDescription>
            Visas på annonskorten och högst upp på din sida. Tips: stjärnan på ett foto nedan gör det till huvudbild.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id="hero-upload"
            disabled={busy}
            onChange={(e) => onPick(e, 'hero')}
          />
          {hero.url ? (
            <div className="relative">
              <img src={hero.url} alt="Huvudbild" className="w-full h-64 object-cover rounded-lg border" />
              <Button
                variant="outline"
                className="absolute bottom-4 right-4"
                disabled={busy}
                onClick={() => document.getElementById('hero-upload')?.click()}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Byt
              </Button>
            </div>
          ) : (
            <Button disabled={busy} onClick={() => document.getElementById('hero-upload')?.click()}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Ladda upp huvudbild
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alla foton</CardTitle>
          <CardDescription>
            De 4 första visas på sidan för ditt boende. Dra för att ändra ordning (på mobilen: håll inne). Fotona
            görs mindre så att de laddas snabbt. Allt sparas automatiskt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((_, i) => i.toString())}
              strategy={rectSortingStrategy}
            >
              <div className="space-y-4">
                {propertyPageImages.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Sidan för boendet (de 4 första)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {propertyPageImages.map((img, index) => renderImage(img, index))}
                    </div>
                  </div>
                )}

                {galleryImages.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Galleri</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {galleryImages.map((img, i) => renderImage(img, propertyPageImages.length + i))}
                    </div>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>

          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="gallery-upload"
            disabled={busy}
            onChange={(e) => onPick(e, 'gallery')}
          />
          <div
            className={`mt-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files, 'gallery');
            }}
          >
            {uploading ? (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Laddar upp {Math.min(uploading.done + 1, uploading.total)} av {uploading.total}…
                </p>
                <Progress value={(uploading.done / uploading.total) * 100} className="h-2" />
              </div>
            ) : (
              <>
                <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  Dra hit foton eller välj flera på en gång. JPG, PNG eller WebP, högst 15 MB per foto.
                </p>
                <Button variant="outline" onClick={() => document.getElementById('gallery-upload')?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Lägg till foton
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex min-h-9 items-center justify-end gap-2 text-sm text-muted-foreground" aria-live="polite">
        {saveState === "saving" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sparar…
          </>
        )}
        {saveState === "saved" && (
          <>
            <Check className="h-4 w-4 text-emerald-600" /> Alla ändringar är sparade
          </>
        )}
        {saveState === "error" && (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive">Inte sparat: {saveError}</span>
            <Button size="sm" variant="outline" onClick={() => persist(latest.current)}>
              Försök igen
            </Button>
          </>
        )}
        {saveState === "idle" && <span>Ändringar sparas automatiskt.</span>}
      </div>

      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ändra foto</DialogTitle>
          </DialogHeader>
          {editingImage && (
            <div className="space-y-4">
              <img src={editingImage.image.url} alt="" className="w-full h-48 object-cover rounded" />
              <div className="space-y-2">
                <Label>Rubrik</Label>
                <Input
                  value={editingImage.image.title || ""}
                  onChange={(e) => setEditingImage({
                    ...editingImage,
                    image: { ...editingImage.image, title: e.target.value }
                  })}
                  placeholder="Rubrik för fotot"
                />
              </div>
              <div className="space-y-2">
                <Label>Beskrivning</Label>
                <Textarea
                  value={editingImage.image.description || ""}
                  onChange={(e) => setEditingImage({
                    ...editingImage,
                    image: { ...editingImage.image, description: e.target.value }
                  })}
                  placeholder="Beskrivning av fotot"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingImage(null)}>Avbryt</Button>
                <Button onClick={saveEditedImage}>Spara</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
