import React, { useState } from 'react';
import { Upload, X, Video, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label: string;
  maxVideos?: number;
  className?: string;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  value = [],
  onChange,
  label,
  maxVideos = 5,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadVideos = async (files: FileList) => {
    try {
      setIsUploading(true);
      const uploadPromises = [];
      
      for (let i = 0; i < files.length && value.length + uploadPromises.length < maxVideos; i++) {
        const file = files[i];
        if (file.type.startsWith('video/')) {
          // Check file size (100MB limit)
          if (file.size > 100 * 1024 * 1024) {
            toast({
              title: "Fel",
              description: `Filen ${file.name} är för stor. Max 100MB per video.`,
              variant: "destructive",
            });
            continue;
          }
          uploadPromises.push(uploadSingleVideo(file));
        }
      }

      const uploadedUrls = await Promise.all(uploadPromises);
      const newUrls = [...value, ...uploadedUrls.filter(url => url)];
      onChange(newUrls);
      
      toast({
        title: "Framgång",
        description: `${uploadedUrls.length} video(r) uppladdade`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda upp videor",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSingleVideo = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `properties/videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('property-videos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('property-videos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadVideos(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadVideos(files);
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

  const removeVideo = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const canAddMore = value.length < maxVideos;

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="text-sm font-medium">{label}</label>
      
      {/* Existing Videos Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {value.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative w-full h-48 bg-gray-100 rounded-lg border overflow-hidden">
                <video 
                  src={url} 
                  className="w-full h-full object-cover"
                  controls={false}
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <Play className="h-8 w-8 text-white" />
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeVideo(index)}
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
            accept="video/mp4,video/webm,video/mov,video/avi"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id={`video-upload-${label}`}
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center space-y-2">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            ) : (
              <Video className="h-8 w-8 text-gray-400" />
            )}
            
            <div>
              <label
                htmlFor={`video-upload-${label}`}
                className="cursor-pointer text-primary hover:text-primary/80"
              >
                Klicka för att ladda upp videor
              </label>
              <p className="text-sm text-gray-500">eller dra och släpp flera videor</p>
            </div>
            
            <p className="text-xs text-gray-400">
              {value.length}/{maxVideos} videor • MP4, WebM, MOV upp till 100MB var
            </p>
          </div>
        </div>
      )}
      
      {!canAddMore && (
        <p className="text-sm text-gray-500 text-center">
          Maximum {maxVideos} videor uppnått
        </p>
      )}
    </div>
  );
};
