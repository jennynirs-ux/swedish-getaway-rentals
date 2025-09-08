import { useState } from "react";
import villaInteriorImage from "@/assets/villa-interior.jpg";
import villaBedroomImage from "@/assets/villa-bedroom.jpg";
import villaSaunaImage from "@/assets/villa-sauna.jpg";
import { ImageDialog } from "@/components/ImageDialog";

const VillaGallery = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const images = [
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
    }
  ];

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
          {images.map((image, index) => (
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
            </div>
          ))}
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

export default VillaGallery;