import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import { Skeleton } from "@/components/ui/skeleton";
import PropertyCard from "@/components/PropertyCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Grid3X3 } from "lucide-react";
import HomepageProducts from "@/components/HomepageProducts";
import PropertySearch from "@/components/PropertySearch"; // aktivera din search-komponent
import forestHeroBg from "@/assets/forest-hero-light.jpg";

const bookCover = "/lovable-uploads/93c33182-c9b7-4857-831a-49ed13df4375.png";

const HomePage = () => {
  const { properties, loading } = useProperties();
  const [filters, setFilters] = useState<any>(null);

  // Enkel filtrering – här kan du bygga vidare
  const filteredProperties = filters
    ? properties.filter((p) => {
        // Filtrera på gästantal
        if (filters.guests && p.max_guests < filters.guests) {
          return false;
        }

        // TODO: Filtrera på datum (kräver bokningsdata från supabase)
        // just nu returneras alla
        return true;
      })
    : properties;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <header className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={forestHeroBg} 
            alt="Swedish forest background with sunlight through trees" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/60"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-6">
              Nordic Getaways
            </h1>
            <p className="text-2xl text-white/90 max-w-3xl mx-auto">
              Discover your perfect retreat in the Nordic
            </p>
          </div>

          {/* Search Component */}
          <PropertySearch onFiltersChange={setFilters} availableAmenities={[]} />
        </div>
      </header>

      {/* Property Cards */}
      <main className="pb-12">
        <div className="container mx-auto px-4 pt-16">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-lg h-64 mb-4"></div>
                  <div className="space-y-2">
                    <div className="bg-muted h-6 rounded w-3/4"></div>
                    <div className="bg-muted h-4 rounded w-1/2"></div>
                    <div className="bg-muted h-16 rounded"></div>
                    <div className="flex justify-between items-end">
                      <div className="bg-muted h-8 rounded w-1/3"></div>
                      <div className="bg-muted h-10 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProperties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {filteredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <Grid3X3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No properties found
                </h3>
                <p className="text-muted-foreground mb-6">
                  No properties are currently available.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Book Promotion Section */}
      <section className="py-12 bg-gradient-to-br from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-left">
              Looking for the perfect retreat read?
            </h2>
            
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              {/* Book Cover - Left Side */}
              <div className="lg:col-span-4 flex justify-center lg:justify-start mb-6 lg:mb-0">
                <div className="relative group">
                  <img 
                    src={bookCover} 
                    alt="När havet förändrade allt - When the Ocean Changed Everything by Jenny Nirs" 
                    className="w-40 sm:w-48 h-auto rounded-lg shadow-elegant transition-transform group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-20 rounded-lg transition-opacity"></div>
                </div>
              </div>

              {/* Book Information - Right Side */}
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
                    When the Ocean changed everything
                  </h3>
                  <h4 className="text-base sm:text-lg text-muted-foreground mb-3">
                    My Journey through Disaster
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    A gripping and unforgettable true story of survival and meaning. Perfect reading for your Swedish getaway. Available in both Swedish and English.
                  </p>
                </div>

                {/* Reviews Carousel */}
                <div className="relative mx-4 sm:mx-0">
                  <Carousel className="w-full max-w-full lg:max-w-lg">
                    <CarouselContent>
                      <CarouselItem>
                        <div className="bg-card/50 rounded-lg p-3 sm:p-4 border border-border/50 mx-2">
                          <div className="flex items-center mb-2">
                            <div className="flex text-yellow-500 text-sm">
                              {[1, 2, 3, 4, 5].map((i) => <span key={i}>★</span>)}
                            </div>
                            <span className="ml-2 text-sm text-muted-foreground">by Patrik</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            "A gripping and unforgettable story of survival and meaning that stays with you long after the last page."
                          </p>
                        </div>
                      </CarouselItem>
                      <CarouselItem>
                        <div className="bg-card/50 rounded-lg p-3 sm:p-4 border border-border/50 mx-2">
                          <div className="flex items-center mb-2">
                            <div className="flex text-yellow-500 text-sm">
                              {[1, 2, 3, 4, 5].map((i) => <span key={i}>★</span>)}
                            </div>
                            <span className="ml-2 text-sm text-muted-foreground">by Anna</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            "A very gripping and captivating book. I read it straight through, couldn't stop reading..."
                          </p>
                        </div>
                      </CarouselItem>
                      <CarouselItem>
                        <div className="bg-card/50 rounded-lg p-3 sm:p-4 border border-border/50 mx-2">
                          <div className="flex items-center mb-2">
                            <div className="flex text-yellow-500 text-sm">
                              {[1, 2, 3, 4, 5].map((i) => <span key={i}>★</span>)}
                            </div>
                            <span className="ml-2 text-sm text-muted-foreground">by Per</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            "An emotional journey that captured my heart. Jenny's storytelling is both beautiful and devastating."
                          </p>
                        </div>
                      </CarouselItem>
                      <CarouselItem>
                        <div className="bg-card/50 rounded-lg p-3 sm:p-4 border border-border/50 mx-2">
                          <div className="flex items-center mb-2">
                            <div className="flex text-yellow-500 text-sm">
                              {[1, 2, 3, 4, 5].map((i) => <span key={i}>★</span>)}
                            </div>
                            <span className="ml-2 text-sm text-muted-foreground">by Karl-olov</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            "A masterpiece of Swedish literature. This book will resonate with readers long after finishing it."
                          </p>
                        </div>
                      </CarouselItem>
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex -left-2 lg:-left-12 top-1/2 -translate-y-1/2" />
                    <CarouselNext className="hidden sm:flex -right-2 lg:-right-12 top-1/2 -translate-y-1/2" />
                  </Carousel>
                </div>

                {/* Call to Action */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild size="sm" className="flex-1">
                    <a href="https://bokshop.bod.se/naer-havet-foeraendrade-allt-jenny-nirs-9789180801843" target="_blank" rel="noopener noreferrer">
                      Order in Swedish
                    </a>
                  </Button>
                  <Button variant="outline" asChild size="sm" className="flex-1">
                    <a href="https://bokshop.bod.se/when-the-ocean-changed-everything-jenny-nirs-9789180807661" target="_blank" rel="noopener noreferrer">
                      Order in English
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <HomepageProducts />

      {/* Footer */}
      <footer className="py-16 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Nordic Getaways</h3>
              <p className="text-muted-foreground mb-4">
                Discover authentic Nordic experiences in our handpicked properties.
              </p>
               <div className="flex gap-2">
                 <Link to="/host-application">
                   <Button variant="outline">Become a Host</Button>
                 </Link>
               </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/shop" className="hover:text-foreground transition-colors">Nordic Shop</Link></li>
                <li><Link to="/gallery" className="hover:text-foreground transition-colors">Photo Gallery</Link></li>
                <li><Link to="/amenities" className="hover:text-foreground transition-colors">Amenities</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-border">
            <p className="text-muted-foreground">
              © 2025 Nordic Getaways. Created with love for Nordic experiences.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
