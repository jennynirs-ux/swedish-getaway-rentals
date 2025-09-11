import { useState } from "react";
import lakehouseInteriorImage from "@/assets/lakehouse-interior.jpg";
import lakehouseBedroomImage from "@/assets/lakehouse-bedroom.jpg";
import lakehouseLakeImage from "@/assets/lakehouse-lake.jpg";
import lakehouseHeroImage from "@/assets/lakehouse-hero.jpg";
import { ImageDialog } from "@/components/ImageDialog";
import { Property } from "@/hooks/useProperties";

interface LakehouseGalleryProps {
  property?: Property;
}

const LakehouseGallery = ({ property }: LakehouseGalleryProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Use property gallery images if available, otherwise fallback to static images
  const defaultImages = [
    {
      src: lakehouseHeroImage,
      alt: "Lakehouse exterior with lake view",
      title: "Lakehouse Exterior",
      description: "Beautiful lakehouse nestled by the crystal clear waters, surrounded by pristine Swedish forest. The perfect retreat for nature lovers seeking tranquility and adventure."
    },
    {
      src: lakehouseInteriorImage,
      alt: "Lakehouse interior with fireplace",
      title: "Cozy Interior",
      description: "Warm and welcoming living space featuring a traditional stone fireplace, comfortable seating, and large windows offering stunning lake views. The perfect place to relax after a day of outdoor activities."
    },
    {
      src: lakehouseBedroomImage,
      alt: "Comfortable bedroom with lake view",
      title: "Peaceful Bedrooms",
      description: "Comfortable bedrooms with high-quality linens and breathtaking lake views. Wake up to the gentle sounds of nature and the sparkling water right outside your window."
    },
    {
      src: lakehouseLakeImage,
      alt: "Private lake access with dock",
      title: "Private Lake Access",
      description: "Your own private dock provides direct access to the crystal clear lake. Perfect for swimming, fishing, kayaking, or simply enjoying the peaceful water views."
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

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsDialogOpen(true);
  };
  const openDialog = (index: number) => {
    setSelectedImageIndex(index);
    setIsDialogOpen(true);
  };

  return (
    <section id="lakehouse-gallery" className="villa-section bg-card">
      <div className="villa-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Discover Your Lakeside Retreat
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Immerse yourself in the beauty of Swedish nature with comfortable accommodations and stunning lake views.
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
          <div className="mt-16 relative overflow-hidden rounded-xl h-64 md:h-80 lg:h-[500px] group cursor-pointer" onClick={() => openDialog(3)}>
            <img 
              src={images[3].src} 
              alt={images[3].alt} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-center justify-center md:justify-start">
              <div className="text-white p-6 md:p-12 lg:p-16 max-w-2xl text-center md:text-left">
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold mb-2 md:mb-4">
                  Where Tranquil Waters Meet Swedish Nature
                </h3>
                <p className="text-base md:text-lg lg:text-xl opacity-90 leading-relaxed">
                  Discover the perfect balance between lakeside serenity and modern comfort in the heart of pristine Swedish wilderness.
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

export default LakehouseGallery;