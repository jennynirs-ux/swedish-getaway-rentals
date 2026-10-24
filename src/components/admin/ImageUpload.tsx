import React, { createContext, useContext, useId, useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { imageStorageKeys, prepareImage } from '@/lib/imageResize';

/**
 * The storage folder for uploads below it. Hosts may only upload into their
 * own listing's folder ("<propertyId>/..."), so the host editor sets
 * "<propertyId>/amenities" or "<propertyId>/guide" around the tabs that use
 * this component; without it, uploads go to the admin-only "properties/".
 */
export const ImageUploadFolder = createContext<string | null>(null);

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  label: string;
  className?: string;
  /** Overrides ImageUploadFolder, e.g. "<propertyId>/amenities" */
  folder?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onRemove,
  label,
  className = '',
  folder,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const contextFolder = useContext(ImageUploadFolder);
  const targetFolder = folder || contextFolder || 'properties';
  const inputId = `image-upload-${useId()}`;

  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true);

      // Shrunk to 1600 px in the browser, under a random ASCII name
      // (storage rejects names with å/ä/ö)
      const image = await prepareImage(file, false);
      const { full: filePath } = imageStorageKeys(targetFolder, image.ext);

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, image.full, { contentType: image.contentType, cacheControl: '31536000' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      onChange(data.publicUrl);

      toast({
        title: "Bilden är uppladdad",
        description: "Glöm inte att spara.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Det gick inte att ladda upp bilden",
        description: error instanceof Error && error.message ? error.message : "Försök igen.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Let the same file be picked again after an error
    e.target.value = '';
    if (file) {
      uploadImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium">{label}</label>

      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Uppladdad bild"
            className="w-full h-48 object-cover rounded-lg border"
          />
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={inputId}
            disabled={isUploading}
          />

          <div className="flex flex-col items-center space-y-2">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <ImageIcon className="h-8 w-8 text-gray-400" />
            )}

            <div>
              <label
                htmlFor={inputId}
                className="cursor-pointer text-primary hover:text-primary/80"
              >
                Klicka för att ladda upp
              </label>
              <p className="text-sm text-gray-500">eller dra och släpp här</p>
            </div>

            <p className="text-xs text-gray-400">JPG, PNG eller WEBP, högst 15 MB</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
