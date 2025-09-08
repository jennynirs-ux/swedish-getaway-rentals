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
  return (
    <section className="lakehouse-section">
      <div className="lakehouse-container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Discover Your Lakeside Retreat
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Immerse yourself in the beauty of Swedish nature with comfortable accommodations and stunning lake views.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {images.slice(1).map((image, index) => (
            <div 
              key={index} 
              className="lakehouse-card group cursor-pointer overflow-hidden"
              onClick={() => handleImageClick(index + 1)}
            >
              <div className="relative h-80 overflow-hidden">
                <img 
                  src={image.src} 
                  alt={image.alt} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-xl font-display font-semibold mb-2">{image.title}</h3>
                  <p className="text-sm opacity-90 max-w-xs">{image.description.split('.')[0]}.</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Hero Feature Section */}
        <div className="lakehouse-card overflow-hidden mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
            <div 
              className="relative cursor-pointer group"
              onClick={() => handleImageClick(0)}
            >
              <img 
                src={images[0].src} 
                alt={images[0].alt} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"></div>
            </div>
            <div className="bg-warm-gradient p-8 md:p-12 text-white flex items-center">
              <div>
                <h3 className="text-3xl md:text-4xl font-display font-bold mb-6">
                  A Perfect Lakeside Escape
                </h3>
                <p className="text-white/90 mb-8 text-lg leading-relaxed">
                  Experience the magic of Swedish summers at our charming lakehouse. With direct lake access, 
                  a private dock, and surrounded by pristine forest, this is where memories are made.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="font-medium">Direct lake access</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="font-medium">Kayaks included</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="font-medium">Fishing equipment</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="font-medium">Outdoor fire pit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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