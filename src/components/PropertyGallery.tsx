import { useState } from "react";
import { Property } from "@/hooks/useProperties";
import { MediaDialog } from "@/components/MediaDialog";

interface PropertyGalleryProps {
  property: Property;
}

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  title?: string;
  description?: string;
  alt?: string;
}

const PropertyGallery = ({ property }: PropertyGalleryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // Prepare media items from property data
  const mediaItems: MediaItem[] = [
    ...(property.gallery_images || []).map((url, index) => ({
      type: 'image' as const,
      url,
      title: property.gallery_metadata?.[index]?.title || `Image ${index + 1}`,
      description: property.gallery_metadata?.[index]?.description,
      alt: property.gallery_metadata?.[index]?.alt || `${property.title} photo ${index + 1}`
    })),
    ...(property.video_urls || []).map((url, index) => ({
      type: 'video' as const,
      url,
      title: property.video_metadata?.[index]?.title || `Video ${index + 1}`,
      description: property.video_metadata?.[index]?.description,
      alt: `${property.title} video ${index + 1}`
    }))
  ];

  const openDialog = (index: number) => {
    setSelectedMediaIndex(index);
    setIsDialogOpen(true);
  };

  if (!mediaItems.length) {
    return null;
  }

  return (
    <section id="gallery-section" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Discover your getaway
            </h2>
            <p className="text-lg text-muted-foreground">
              Every moment has been carefully designed to give you the perfect balance
              of comfort and Nordic nature.
            </p>
          </div>

          {/* First 3 images as thumbnails */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {mediaItems.slice(0, 3).map((media, index) => (
              <div 
                key={index} 
                className="group relative overflow-hidden rounded-lg aspect-[4/3] cursor-pointer"
                onClick={() => openDialog(index)}
              >
                <img 
                  src={media.url} 
                  alt={media.alt || media.title} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-lg font-semibold">{media.title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 4th image displayed larger with title and description */}
          {mediaItems.length > 3 && (
            <div 
              className="relative overflow-hidden rounded-lg h-[400px] cursor-pointer group"
              onClick={() => openDialog(3)}
            >
              <img 
                src={mediaItems[3].url} 
                alt={mediaItems[3].alt || mediaItems[3].title} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-center">
                <div className="text-white p-8 max-w-2xl">
                  <h3 className="text-3xl md:text-4xl font-bold mb-4">
                    {mediaItems[3].title}
                  </h3>
                  {mediaItems[3].description && (
                    <p className="text-lg opacity-90 leading-relaxed">
                      {mediaItems[3].description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Show gallery count if more than 4 images */}
          {mediaItems.length > 4 && (
            <div className="text-center mt-6">
              <button 
                onClick={() => openDialog(0)}
                className="text-primary hover:underline font-medium"
              >
                View all {mediaItems.length} photos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Media Dialog */}
      <MediaDialog
        media={mediaItems}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        initialIndex={selectedMediaIndex}
      />
    </section>
  );
};

export default PropertyGallery;
