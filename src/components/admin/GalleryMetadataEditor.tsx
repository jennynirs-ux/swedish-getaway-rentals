import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

interface GalleryMetadata {
  title: string;
  description: string;
  alt: string;
}

interface GalleryMetadataEditorProps {
  images: string[];
  metadata: GalleryMetadata[];
  onChange: (metadata: GalleryMetadata[]) => void;
}

export const GalleryMetadataEditor = ({ images, metadata, onChange }: GalleryMetadataEditorProps) => {
  const updateMetadata = (index: number, field: keyof GalleryMetadata, value: string) => {
    const newMetadata = [...metadata];
    if (!newMetadata[index]) {
      newMetadata[index] = { title: '', description: '', alt: '' };
    }
    newMetadata[index][field] = value;
    onChange(newMetadata);
  };

  const addDefaultMetadata = () => {
    const newMetadata = [...metadata];
    while (newMetadata.length < images.length) {
      newMetadata.push({ title: '', description: '', alt: '' });
    }
    onChange(newMetadata);
  };

  const removeMetadata = (index: number) => {
    const newMetadata = metadata.filter((_, i) => i !== index);
    onChange(newMetadata);
  };

  // Ensure metadata array matches images length
  if (metadata.length < images.length) {
    addDefaultMetadata();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Galleri-bildinformation</Label>
        {images.length > metadata.length && (
          <Button type="button" variant="outline" size="sm" onClick={addDefaultMetadata}>
            <Plus className="h-4 w-4 mr-2" />
            Lägg till metadata för alla bilder
          </Button>
        )}
      </div>
      
      {images.length > 0 ? (
        <div className="grid gap-4">
          {images.map((image, index) => {
            const meta = metadata[index] || { title: '', description: '', alt: '' };
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <img 
                        src={image} 
                        alt={`Gallery image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Titel</Label>
                        <Input
                          value={meta.title}
                          onChange={(e) => updateMetadata(index, 'title', e.target.value)}
                          placeholder="Bildtitel"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Alt-text</Label>
                        <Input
                          value={meta.alt}
                          onChange={(e) => updateMetadata(index, 'alt', e.target.value)}
                          placeholder="Alt-text för tillgänglighet"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Beskrivning</Label>
                        <Textarea
                          value={meta.description}
                          onChange={(e) => updateMetadata(index, 'description', e.target.value)}
                          placeholder="Bildbeskrivning"
                          rows={2}
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeMetadata(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Lägg till galleri-bilder för att redigera metadata</p>
      )}
    </div>
  );
};