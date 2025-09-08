import React, { useState } from 'react';
import { Upload, X, Plus, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MultipleImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label: string;
  maxImages?: number;
  className?: string;
}

export const MultipleImageUpload: React.FC<MultipleImageUploadProps> = ({
  value = [],
  onChange,
  label,
  maxImages = 10,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadImages = async (files: FileList) => {
    try {
      setIsUploading(true);
      const uploadPromises = [];
      
      for (let i = 0; i < files.length && value.length + uploadPromises.length < maxImages; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          uploadPromises.push(uploadSingleImage(file));
        }
      }

      const uploadedUrls = await Promise.all(uploadPromises);
      const newUrls = [...value, ...uploadedUrls.filter(url => url)];
      onChange(newUrls);
      
      toast({
        title: "Success",
        description: `${uploadedUrls.length} image(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload some images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSingleImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `properties/gallery/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('property-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadImages(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadImages(files);
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

  const removeImage = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const canAddMore = value.length < maxImages;

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="text-sm font-medium">{label}</label>
      
      {/* Existing Images Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Gallery image ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
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
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id={`multiple-image-upload-${label}`}
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
                htmlFor={`multiple-image-upload-${label}`}
                className="cursor-pointer text-primary hover:text-primary/80"
              >
                Click to upload images
              </label>
              <p className="text-sm text-gray-500">or drag and drop multiple images</p>
            </div>
            
            <p className="text-xs text-gray-400">
              {value.length}/{maxImages} images • PNG, JPG, WEBP up to 10MB each
            </p>
          </div>
        </div>
      )}
      
      {!canAddMore && (
        <p className="text-sm text-gray-500 text-center">
          Maximum of {maxImages} images reached
        </p>
      )}
    </div>
  );
};
