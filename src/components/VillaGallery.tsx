import { useState } from "react";
import villaInteriorImage from "@/assets/villa-interior.jpg";
import villaBedroomImage from "@/assets/villa-bedroom.jpg";
import villaSaunaImage from "@/assets/villa-sauna.jpg";
import villaHeroImage from "@/assets/villa-hero.jpg";
import { MediaDialog } from "@/components/MediaDialog";
import { Property } from "@/hooks/useProperties";
import { Play } from "lucide-react";

interface VillaGalleryProps {
  property?: Property;
}

const VillaGallery = ({ property }: VillaGalleryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // Use property gallery images if available, otherwise fallback to static images
  const defaultMedia = [
    {
      type: 'image' as const,
      url: villaInteriorImage,
      alt: "Luxurious living room with fireplace",
      title: "Cozy Living Space",
      description: "Open living area with fireplace and heritage furniture"
    },
    {
      type: 'image' as const,
      url: villaBedroomImage,
      alt: "Master bedroom with forest views",
      title: "Peaceful Bedrooms",
      description: "Comfortable sleeping area with natural materials"
    },
    {
      type: 'image' as const,
      url: villaSaunaImage,
      alt: "Outdoor sauna and hot tub",
      title: "Wellness & Relaxation",
      description: "Authentic Swedish sauna experience"
    },
    {
      type: 'image' as const,
      url: villaHeroImage,
      alt: "Villa Häcken surrounded by forest",
      title: "Modern Luxury in Nature",
      description: "Where contemporary design meets the breathtaking Swedish wilderness"
    }
  ];

  // Combine images and videos from property or use defaults
  const getMediaItems = () => {
    const mediaItems = [];
    
    // Add gallery images
    if (property?.gallery_images?.length > 0) {
      property.gallery_images.forEach((imageUrl: string, index: number) => {
        const metadata = (property as any).gallery_metadata?.[index] || {};
        mediaItems.push({
          type: 'image' as const,
          url: imageUrl,
          title: metadata.title || `Image ${index + 1}`,
          description: metadata.description || '',
          alt: metadata.alt || `Gallery image ${index + 1}`
        });
      });
    }
    
    // Add videos
    if ((property as any)?.video_urls?.length > 0) {
      (property as any).video_urls.forEach((videoUrl: string, index: number) => {
        const metadata = (property as any).video_metadata?.[index] || {};
        mediaItems.push({
          type: 'video' as const,
          url: videoUrl,
          title: metadata.title || `Video ${index + 1}`,
          description: metadata.description || '',
        });
      });
    }
    
    // Use default images if no property media
    return mediaItems.length > 0 ? mediaItems : defaultMedia;
  };

  const mediaItems = getMediaItems();

  const openDialog = (index: number) => {
    setSelectedMediaIndex(index);
    setIsDialogOpen(true);
  };

  return (
    <section id="villa-gallery" className="villa-section bg-card">
      <div className="villa-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Discover Your Retreat
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every corner of Villa Häcken has been thoughtfully designed to provide the ultimate combination of luxury, comfort, and connection with nature.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mediaItems.slice(0, 3).map((media, index) => (
            <div 
              key={index} 
              className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer"
              onClick={() => openDialog(index)}
            >
              {media.type === 'image' ? (
                <img 
                  src={media.url} 
                  alt={media.alt || media.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={media.url}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-xl font-display font-semibold">{media.title}</h3>
                </div>
              </div>
              {index === 2 && mediaItems.length > 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-white text-lg font-semibold">+{mediaItems.length - 3} mer</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Large featured media with text overlay */}
        {mediaItems.length > 3 && (
          <div className="mt-16 relative overflow-hidden rounded-xl h-[500px] group cursor-pointer" onClick={() => openDialog(3)}>
            {mediaItems[3].type === 'image' ? (
              <img 
                src={mediaItems[3].url} 
                alt={mediaItems[3].alt || mediaItems[3].title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
            ) : (
              <div className="relative w-full h-full">
                <video
                  src={mediaItems[3].url}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <Play className="h-16 w-16 text-white" />
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-center">
              <div className="text-white p-12 md:p-16 max-w-2xl">
                <h3 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  {mediaItems[3].title}
                </h3>
                <p className="text-lg md:text-xl opacity-90 leading-relaxed">
                  {mediaItems[3].description}
                </p>
              </div>
            </div>
          </div>
        )}

        <MediaDialog
          media={mediaItems}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          initialIndex={selectedMediaIndex}
        />
      </div>
    </section>
  );
};

export default VillaGallery;