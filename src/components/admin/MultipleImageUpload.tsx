import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2 } from "lucide-react";

interface ImageData {
  url: string;
  title: string;
  alt: string;
  description: string;
}

interface MultipleImageUploadProps {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  bucket: string;
  folder: string;
  title?: string;
}

const MultipleImageUpload = ({ 
  images, 
  onImagesChange, 
  bucket, 
  folder, 
  title = "Images" 
}: MultipleImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const newImage: ImageData = {
        url: publicUrl,
        title: "",
        alt: `${title} image ${images.length + 1}`,
        description: ""
      };

      onImagesChange([...images, newImage]);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const updateImageMetadata = (index: number, field: string, value: string) => {
    const updatedImages = images.map((img, i) => 
      i === index ? { ...img, [field]: value } : img
    );
    onImagesChange(updatedImages);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <Button
            onClick={() => document.getElementById(`${folder}-upload`)?.click()}
            disabled={uploading}
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Add Image
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          id={`${folder}-upload`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />

        {images.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">No images uploaded yet</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="relative">
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-48 object-cover rounded"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => removeImage(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    placeholder="Image title..."
                    value={image.title}
                    onChange={(e) => updateImageMetadata(index, 'title', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Alt Text</Label>
                  <Input
                    placeholder="Alt text for accessibility..."
                    value={image.alt}
                    onChange={(e) => updateImageMetadata(index, 'alt', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    placeholder="Image description..."
                    value={image.description}
                    onChange={(e) => updateImageMetadata(index, 'description', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MultipleImageUpload;