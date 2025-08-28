import villaInteriorImage from "@/assets/villa-interior.jpg";
import villaBedroomImage from "@/assets/villa-bedroom.jpg";
import villaSaunaImage from "@/assets/villa-sauna.jpg";

const VillaGallery = () => {
  const images = [
    {
      src: villaInteriorImage,
      alt: "Luxurious living room with fireplace",
      title: "Cozy Living Space"
    },
    {
      src: villaBedroomImage,
      alt: "Master bedroom with forest views",
      title: "Peaceful Bedrooms"
    },
    {
      src: villaSaunaImage,
      alt: "Outdoor sauna and hot tub",
      title: "Wellness & Relaxation"
    }
  ];

  return (
    <section className="villa-section bg-card">
      <div className="villa-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Discover Your Retreat
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every corner of Villa Hacken has been thoughtfully designed to provide 
            the ultimate combination of luxury, comfort, and connection with nature.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {images.map((image, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden rounded-xl aspect-[4/3] cursor-pointer"
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

        {/* Large Feature Image */}
        <div className="mt-12 relative overflow-hidden rounded-2xl aspect-[21/9]">
          <img
            src={villaInteriorImage}
            alt="Villa Hacken panoramic view"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent flex items-center">
            <div className="villa-container">
              <div className="text-white max-w-lg">
                <h3 className="text-3xl font-display font-bold mb-4">
                  Where Modern Luxury Meets Nature
                </h3>
                <p className="text-lg leading-relaxed">
                  Experience the perfect harmony between contemporary design 
                  and the breathtaking Swedish wilderness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VillaGallery;