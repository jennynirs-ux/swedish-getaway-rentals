import { useState } from "react";
import villaInteriorImage from "@/assets/villa-interior.jpg";
import villaBedroomImage from "@/assets/villa-bedroom.jpg";
import villaSaunaImage from "@/assets/villa-sauna.jpg";
import villaHeroImage from "@/assets/villa-hero.jpg";
import { ImageDialog } from "@/components/ImageDialog";
import { Property } from "@/hooks/useProperties";

interface VillaGalleryProps {
  property?: Property;
}

const VillaGallery = ({ property }: VillaGalleryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Use property gallery images if available, otherwise fallback to static images
  const defaultImages = [
    {
      src: villaInteriorImage,
      alt: "Luxurious living room with fireplace",
      title: "Cozy Living Space",
      description: "Open living area with fireplace and heritage furniture"
    },
    {
      src: villaBedroomImage,
      alt: "Master bedroom with forest views",
      title: "Peaceful Bedrooms",
      description: "Comfortable sleeping area with natural materials"
    },
    {
      src: villaSaunaImage,
      alt: "Outdoor sauna and hot tub",
      title: "Wellness & Relaxation",
      description: "Authentic Swedish sauna experience"
    },
    {
      src: villaHeroImage,
      alt: "Villa Häcken surrounded by forest",
      title: "Modern Luxury in Nature",
      description: "Where contemporary design meets the breathtaking Swedish wilderness"
    }
  ];

  const propertyImages = property?.gallery_images && property.gallery_images.length > 0
    ? property.gallery_images.map((src, index) => {
        const metadata = (property as any).gallery_metadata?.[index] || {};
        return {
          src,
          alt: metadata.alt || `Gallery image ${index + 1}`,
          title: metadata.title || `Image ${index + 1}`,
          description: metadata.description || ""
        };
      })
    : defaultImages;

  const images = propertyImages;

  const openDialog = (index: number) => {
    setSelectedImageIndex(index);
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
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-center">
              <div className="text-white p-12 md:p-16 max-w-2xl">
                <h3 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  {images[3].title}
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

export default VillaGallery;