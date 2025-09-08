import { useState } from "react";
import villaNew1 from "@/assets/villa-new-1.jpg";
import villaNew3 from "@/assets/villa-new-3.jpg";
import villaNew4 from "@/assets/villa-new-4.jpg";
import villaNew5 from "@/assets/villa-new-5.jpg";
import villaNew6 from "@/assets/villa-new-6.jpg";
import villaNew7 from "@/assets/villa-new-7.jpg";
import villaNew8 from "@/assets/villa-new-8.jpg";
import villaNew9 from "@/assets/villa-new-9.jpg";
import villaNew10 from "@/assets/villa-new-10.jpg";
import villaInteriorImage from "@/assets/villa-interior.jpg";
import villaBedroomImage from "@/assets/villa-bedroom.jpg";
import villaSaunaImage from "@/assets/villa-sauna.jpg";
import { ImageDialog } from "@/components/ImageDialog";

const VillaGallery = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const images = [
    {
      src: villaNew1,
      alt: "Villa exterior view",
      title: "Beautiful Villa",
      description: "Stunning exterior architecture"
    },
    {
      src: villaNew3,
      alt: "Villa interior space",
      title: "Modern Interior",
      description: "Contemporary living spaces"
    },
    {
      src: villaNew4,
      alt: "Villa amenities",
      title: "Premium Amenities",
      description: "Luxury facilities and features"
    },
    {
      src: villaNew5,
      alt: "Villa outdoor area",
      title: "Outdoor Paradise",
      description: "Beautiful outdoor spaces"
    },
    {
      src: villaNew6,
      alt: "Villa bedroom",
      title: "Comfortable Bedrooms",
      description: "Relaxing sleeping quarters"
    },
    {
      src: villaNew7,
      alt: "Villa kitchen",
      title: "Gourmet Kitchen",
      description: "Fully equipped cooking space"
    },
    {
      src: villaNew8,
      alt: "Villa bathroom",
      title: "Spa-like Bathrooms",
      description: "Luxurious bathing facilities"
    },
    {
      src: villaNew9,
      alt: "Villa living room",
      title: "Elegant Living",
      description: "Sophisticated common areas"
    },
    {
      src: villaNew10,
      alt: "Villa dining area",
      title: "Dining Excellence",
      description: "Perfect for memorable meals"
    },
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