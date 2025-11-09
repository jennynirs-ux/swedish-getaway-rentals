import { useState, memo, useCallback, useMemo } from "react";
import { Property } from '@/hooks/useProperties';
import LazyImage from "@/components/LazyImage";
import { ImageDialog } from "@/components/ImageDialog";
import { MediaDialog } from "@/components/MediaDialog";

interface PropertyGalleryProps {
  property: Property;
}

const PropertyGalleryOptimized = memo(({ property }: PropertyGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

  // Memoized handlers to prevent unnecessary re-renders
  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleVideoClick = useCallback((index: number) => {
    setSelectedMediaIndex(index);
  }, []);

  const handleCloseImageDialog = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  const handleCloseMediaDialog = useCallback(() => {
    setSelectedMediaIndex(null);
  }, []);

  // Memoized media items to prevent recalculation
  const mediaItems = useMemo(() => {
    return [
      ...(property.gallery_images || []).map((image, index) => ({
        type: 'image' as const,
        url: image,
        alt: `${property.title} gallery image ${index + 1}`
      })),
      ...(property.video_urls || []).map((video, index) => ({
        type: 'video' as const,
        url: video,
        alt: `${property.title} video ${index + 1}`
      }))
    ];
  }, [property.gallery_images, property.video_urls, property.title]);

  if (!mediaItems.length) {
    return null;
  }

  return (
    <section id="gallery-section" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Photo Gallery</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our stunning property through these carefully curated images and videos
          </p>
        </div>

        {/* Images Grid */}
        {property.gallery_images && property.gallery_images.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              {property.gallery_images.length > 4 && (
                <button
                  onClick={() => handleImageClick(0)}
                  className="text-primary hover:text-primary/80 transition-colors font-medium ml-auto"
                >
                  View All Images ({property.gallery_images.length})
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {property.gallery_images.slice(0, 3).map((image, index) => {
                const metadata = property.gallery_metadata?.[index];
                return (
                  <div key={`image-${index}`} className="relative group overflow-hidden rounded-lg h-48">
                    <div onClick={() => handleImageClick(index)} className="relative h-full">
                      <LazyImage
                        src={image}
                        alt={metadata?.alt || `Gallery image ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end p-4">
                        {metadata?.title && (
                          <span className="text-white font-semibold text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">
                            {metadata.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {property.gallery_images[3] && (
              <div className="relative group overflow-hidden rounded-lg h-96">
                <div onClick={() => handleImageClick(3)} className="relative h-full">
                  <LazyImage
                    src={property.gallery_images[3]}
                    alt={property.gallery_metadata?.[3]?.alt || 'Gallery image 4'}
                    className="w-full h-full object-cover cursor-pointer transition-opacity group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end p-6">
                    <div className="text-white">
                      {property.gallery_metadata?.[3]?.title && (
                        <h3 className="font-bold text-2xl mb-2 drop-shadow-lg">
                          {property.gallery_metadata[3].title}
                        </h3>
                      )}
                      {property.gallery_metadata?.[3]?.description && (
                        <p className="text-sm text-white/90 drop-shadow-lg">
                          {property.gallery_metadata[3].description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Videos Grid */}
        {property.video_urls && property.video_urls.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-6 text-foreground">Videos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {property.video_urls.map((video, index) => (
                <div key={`video-${index}`} className="relative group overflow-hidden rounded-lg">
                  <video
                    src={video}
                    className="w-full h-48 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleVideoClick(index)}
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center group-hover:bg-black/70 transition-colors">
                      <svg className="w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs with optimized props */}
      <ImageDialog
        images={(property.gallery_images || []).map((image, index) => ({
          src: image,
          alt: `Gallery image ${index + 1}`,
          title: `${property.title} - Image ${index + 1}`,
          description: `Gallery image from ${property.title}`
        }))}
        isOpen={selectedImageIndex !== null}
        onClose={handleCloseImageDialog}
        initialIndex={selectedImageIndex || 0}
      />
      
      <MediaDialog
        media={(property.video_urls || []).map((video, index) => ({
          type: 'video' as const,
          url: video,
          title: `${property.title} - Video ${index + 1}`,
          alt: `Video from ${property.title}`
        }))}
        isOpen={selectedMediaIndex !== null}
        onClose={handleCloseMediaDialog}
        initialIndex={selectedMediaIndex || 0}
      />
    </section>
  );
});

PropertyGalleryOptimized.displayName = 'PropertyGalleryOptimized';

export default PropertyGalleryOptimized;