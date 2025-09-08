import { useState } from "react";
import { ImageDialog } from "@/components/ImageDialog";
import { Property } from "@/hooks/useProperties";

interface PropertyGalleryProps {
  property?: Property;
}

const PropertyGallery = ({ property }: PropertyGalleryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Use property gallery images if available, otherwise show a placeholder
  const images = property?.gallery_images && property.gallery_images.length > 0
    ? property.gallery_images.map((src, index) => {
        const metadata = (property as any).gallery_metadata?.[index] || {};
        return {
          src,
          alt: metadata.alt || `Gallery image ${index + 1}`,
          title: metadata.title || `Image ${index + 1}`,
          description: metadata.description || ""
        };
      })
    : [
        {
          src: property?.hero_image_url || '/placeholder.svg',
          alt: property?.title || 'Property image',
          title: property?.title || 'Property',
          description: property?.description || ''
        }
      ];

  const openDialog = (index: number) => {
    setSelectedImageIndex(index);
    setIsDialogOpen(true);
  };

  return (
    <section id="property-gallery" className="villa-section bg-card">
      <div className="villa-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Discover Your Retreat
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every corner has been thoughtfully designed to provide the ultimate combination of luxury, comfort, and connection with nature.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {images.slice(0, 3).map((image, index) => (
            <div 
              key={index} 
              className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer"
              onClick={() => openDialog(index)}
            >
              <img 
                src={image.src} 
                alt={image.alt} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-xl font-display font-semibold">{image.title}</h3>
                </div>
              </div>
              {index === 2 && images.length > 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-white text-lg font-semibold">+{images.length - 3} mer</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Large featured image with text overlay */}
        {images.length > 3 && (
          <div className="mt-16 relative overflow-hidden rounded-xl h-[500px] group cursor-pointer" onClick={() => openDialog(3)}>
            <img 
              src={images[3].src} 
              alt={images[3].alt} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-center justify-center">
              <div className="text-white text-center max-w-2xl px-6">
                <h3 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  Where Modern Luxury Meets Nature
                </h3>
                <p className="text-lg md:text-xl opacity-90 leading-relaxed">
                  Experience the perfect harmony between contemporary design and the breathtaking Swedish wilderness.
                </p>
              </div>
            </div>
          </div>
        )}

        <ImageDialog
          images={images}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          initialIndex={selectedImageIndex}
        />
      </div>
    </section>
  );
};

export default PropertyGallery;