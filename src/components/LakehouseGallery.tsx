import lakehouseInteriorImage from "@/assets/lakehouse-interior.jpg";
import lakehouseBedroomImage from "@/assets/lakehouse-bedroom.jpg";
import lakehouseLakeImage from "@/assets/lakehouse-lake.jpg";

const LakehouseGallery = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Discover Your Lakeside Retreat
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Immerse yourself in the beauty of Swedish nature with comfortable accommodations and stunning lake views.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="relative overflow-hidden rounded-lg shadow-lg hover-scale group">
            <img 
              src={lakehouseInteriorImage} 
              alt="Lakehouse interior with fireplace" 
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-4 left-4 text-white">
              <h3 className="text-xl font-semibold mb-1">Cozy Interior</h3>
              <p className="text-sm opacity-90">Warm and welcoming spaces</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg shadow-lg hover-scale group">
            <img 
              src={lakehouseBedroomImage} 
              alt="Comfortable bedroom with lake view" 
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-4 left-4 text-white">
              <h3 className="text-xl font-semibold mb-1">Peaceful Bedrooms</h3>
              <p className="text-sm opacity-90">Wake up to nature sounds</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg shadow-lg hover-scale group">
            <img 
              src={lakehouseLakeImage} 
              alt="Private lake access with dock" 
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-4 left-4 text-white">
              <h3 className="text-xl font-semibold mb-1">Private Lake Access</h3>
              <p className="text-sm opacity-90">Your own piece of paradise</p>
            </div>
          </div>
        </div>

        {/* Feature Section */}
        <div className="relative overflow-hidden rounded-2xl shadow-2xl">
          <div className="grid md:grid-cols-2 min-h-[400px]">
            <div className="relative">
              <img 
                src={lakehouseLakeImage} 
                alt="Lakehouse panoramic view" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
            </div>
            <div className="bg-card p-12 flex items-center">
              <div>
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  A Perfect Lakeside Escape
                </h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Experience the magic of Swedish summers at our charming lakehouse. With direct lake access, 
                  a private dock, and surrounded by pristine forest, this is where memories are made. 
                  Fish, swim, kayak, or simply relax by the water's edge.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-foreground">✨ Direct lake access</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">🛶 Kayaks included</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">🎣 Fishing equipment</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">🔥 Outdoor fire pit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LakehouseGallery;