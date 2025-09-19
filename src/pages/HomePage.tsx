import { useState, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PropertyCard from "@/components/PropertyCard";
import { useOptimizedQuery } from '@/hooks/useOptimizedQuery';
import { supabase } from "@/integrations/supabase/client";
import LazyImage from "@/components/LazyImage";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Grid3X3 } from "lucide-react";
import HomepageProducts from "@/components/HomepageProducts";
import PropertySearch from "@/components/PropertySearch";

interface PropertyFilters {
  guests?: number;
  propertyType?: string;
  amenities?: string[];
}

import forestHeroBg from "@/assets/forest-hero-light.jpg";
import bookCover from "@/assets/book-cover.png"; // ✅ import istället för hårdkodad URL

// Memoized components for performance
const MemoizedPropertyCard = memo(PropertyCard);
const MemoizedHomepageProducts = memo(HomepageProducts);

const HomePage = memo(() => {
  // Optimized properties query with caching
  const propertiesQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        host_id,
        title,
        description,
        location,
        price_per_night,
        currency,
        max_guests,
        bedrooms,
        bathrooms,
        hero_image_url,
        gallery_images,
        amenities,
        amenities_data,
        active
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  }, []);

  const { data: properties = [], loading } = useOptimizedQuery(
    'homepage-properties',
    propertiesQueryFn,
    {
      cacheTime: 15 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      enableRealtime: true,
      realtimeFilter: {
        event: '*',
        schema: 'public',
        table: 'properties'
      }
    }
  );

  const [filters, setFilters] = useState<PropertyFilters | null>(null);

  const availableAmenities = useMemo(() => {
    const all = new Set<string>();
  
    (properties || []).forEach((p: any) => {
      // Säkerställ att amenities_data är en array
      if (Array.isArray(p?.amenities_data)) {
        p.amenities_data.forEach((a: any) => {
          if (a?.title) {
            all.add(String(a.title).toLowerCase());
          }
        });
      }
  
      // Säkerställ att amenities är en array
      if (Array.isArray(p?.amenities)) {
        p.amenities.forEach((a: any) => {
          if (a) {
            all.add(String(a).toLowerCase());
          }
        });
      }
    });
  
    return Array.from(all).sort();
  }, [properties]);

  const filteredProperties = useMemo(() => {
    if (!filters) return properties;

    return properties.filter((p: any) => {
      if (filters.guests && p.max_guests < filters.guests) return false;
      if (filters.propertyType && filters.propertyType !== "all") {
        if (!p.title.toLowerCase().includes(filters.propertyType.toLowerCase())) return false;
      }
      if (filters.amenities && filters.amenities.length > 0) {
        const names = Array.isArray(p.amenities_data)
          ? p.amenities_data.map((a: any) => String(a?.title || "").toLowerCase()).filter(Boolean)
          : (p.amenities || []).map((a: any) => String(a || "").toLowerCase()).filter(Boolean);

        const wanted = new Set(filters.amenities.map((a) => a.toLowerCase()));
        for (const w of wanted) {
          if (!names.some((n) => n.includes(w))) return false;
        }
      }
      return true;
    });
  }, [properties, filters]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <header className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <LazyImage
            src={forestHeroBg}
            alt="Swedish forest background with sunlight through trees"
            className="w-full h-full object-cover"
            priority={true}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-black/60"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-6">Nordic Getaways</h1>
            <p className="text-2xl text-white/90 max-w-3xl mx-auto">
              Discover your perfect retreat in the Nordic
            </p>
          </div>

          <PropertySearch onFiltersChange={setFilters} availableAmenities={availableAmenities} />
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
                <MemoizedPropertyCard 
                  key={property.id} 
                  property={{
                    ...property,
                    hero_image_url: property.hero_image_url || "/placeholder.jpg" // ✅ fallback
                  }} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <Grid3X3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No properties found</h3>
                <p className="text-muted-foreground mb-6">No properties are currently available.</p>
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
      
            <div className="grid grid-cols-12 gap-6 items-start">
              {/* Book Cover */}
              <div className="col-span-4 flex justify-center lg:justify-start">
                <div className="relative group">
                  <LazyImage
                    src={bookCover}
                    alt="När havet förändrade allt - When the Ocean Changed Everything by Jenny Nirs"
                    className="w-28 sm:w-32 md:w-40 lg:w-48 h-auto rounded-lg shadow-elegant transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-20 rounded-lg transition-opacity"></div>
                </div>
              </div>
      
              {/* Book Info */}
              <div className="col-span-8 space-y-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
                    When the Ocean changed everything
                  </h3>
                  <h4 className="text-base sm:text-lg text-muted-foreground mb-3">
                    My Journey through Disaster
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    A gripping and unforgettable true story of survival and meaning. Perfect reading for your
                    Swedish getaway. Available in both Swedish and English.
                  </p>
                </div>
      
                {/* Reviews Carousel */}
                <div className="relative">
                  <Carousel className="w-full max-w-full">
                    <CarouselContent>
                      <CarouselItem>
                        <div className="bg-card/50 rounded-lg p-4 border border-border/50">
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
                        <div className="bg-card/50 rounded-lg p-4 border border-border/50">
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
                        <div className="bg-card/50 rounded-lg p-4 border border-border/50">
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
                        <div className="bg-card/50 rounded-lg p-4 border border-border/50">
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
                    <CarouselPrevious className="hidden sm:flex -left-6 top-1/2 -translate-y-1/2" />
                    <CarouselNext className="hidden sm:flex -right-6 top-1/2 -translate-y-1/2" />
                  </Carousel>
                </div>
      
                {/* Call to Action */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button asChild size="sm" className="flex-1">
                    <a
                      href="https://bokshop.bod.se/naer-havet-foeraendrade-allt-jenny-nirs-9789180801843"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Order in Swedish
                    </a>
                  </Button>
                  <Button variant="outline" asChild size="sm" className="flex-1">
                    <a
                      href="https://bokshop.bod.se/when-the-ocean-changed-everything-jenny-nirs-9789180807661"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
      <MemoizedHomepageProducts />

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
                <li><Link to="/shop" className="hover:text-foreground">Nordic Shop</Link></li>
                <li><Link to="/gallery" className="hover:text-foreground">Photo Gallery</Link></li>
                <li><Link to="/amenities" className="hover:text-foreground">Amenities</Link></li>
                <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-border">
            <p className="text-muted-foreground">© 2025 Nordic Getaways. Created with love for Nordic experiences.</p>
          </div>
        </div>
      </footer>
    </div>
  );
});

HomePage.displayName = 'HomePage';

export default HomePage;
