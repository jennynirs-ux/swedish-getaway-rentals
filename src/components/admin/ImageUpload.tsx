import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  label: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  onRemove,
  label,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
            alt="Uploaded image"
            loading="lazy"
            decoding="async"
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
            id={`image-upload-${label}`}
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
                htmlFor={`image-upload-${label}`}
                className="cursor-pointer text-primary hover:text-primary/80"
              >
                Click to upload
              </label>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
            
            <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;