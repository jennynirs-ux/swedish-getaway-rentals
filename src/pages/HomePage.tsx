import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/PropertyCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Grid3X3 } from "lucide-react";
import HomepageProducts from "@/components/HomepageProducts";
import PropertySearch, { PropertyFilters } from "@/components/PropertySearch";
import { supabase } from "@/integrations/supabase/client";
import forestHeroBg from "@/assets/forest-hero-light.jpg";

const bookCover = "/lovable-uploads/93c33182-c9b7-4857-831a-49ed13df4375.png";

const HomePage = () => {
  const { properties, loading } = useProperties();

  const [filters, setFilters] = useState<PropertyFilters | null>(null);
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);

  // amenities-lista
  const availableAmenities = useMemo(() => {
    const all = new Set<string>();
    properties.forEach((p) => {
      if (Array.isArray((p as any).amenities_data) && (p as any).amenities_data.length > 0) {
        (p as any).amenities_data.forEach((a: any) => a?.title && all.add(String(a.title).toLowerCase()));
      } else if (Array.isArray(p.amenities)) {
        p.amenities.forEach((a) => a && all.add(String(a).toLowerCase()));
      }
    });
    return Array.from(all).sort();
  }, [properties]);

  // Hjälpare för amenity-namn
  const getAmenityNames = (p: any): string[] => {
    if (Array.isArray(p.amenities_data) && p.amenities_data.length > 0) {
      return p.amenities_data.map((a: any) => String(a?.title || "").toLowerCase()).filter(Boolean);
    }
    if (Array.isArray(p.amenities)) {
      return p.amenities.map((a: any) => String(a || "").toLowerCase()).filter(Boolean);
    }
    return [];
  };

  const hasFilters =
    !!filters &&
    (
      (filters.guests && filters.guests > 0) ||
      (filters.startDate && filters.endDate) ||
      (filters.amenities && filters.amenities.length > 0) ||
      (filters.propertyType && filters.propertyType !== "all")
    );

  // Availability-check (asynkront, påverkar inte initial render)
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!filters?.startDate || !filters?.endDate) {
        setAvailableIds(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select("property_id, check_in, check_out, status")
          .not("status", "in", "('cancelled')")
          .or("status.eq.confirmed,status.eq.paid,status.eq.blocked")
          .lt("check_in", filters.endDate)
          .gt("check_out", filters.startDate);

        if (error) throw error;

        const unavailable = new Set<string>();
        (data || []).forEach((b: any) => {
          if (b?.property_id) unavailable.add(String(b.property_id));
        });

        const allIds = new Set(properties.map((p) => String(p.id)));
        const available = new Set<string>();
        allIds.forEach((id) => {
          if (!unavailable.has(id)) available.add(id);
        });

        setAvailableIds(available);
      } catch (e) {
        console.error("Availability check failed:", e);
        setAvailableIds(null);
      }
    };

    fetchAvailability();
  }, [filters?.startDate, filters?.endDate, properties]);

  // Filtrera
  const filteredProperties = useMemo(() => {
    if (!hasFilters) return properties;

    return properties.filter((p: any) => {
      if (filters?.guests && p.max_guests < filters.guests) return false;

      if (filters?.propertyType && filters.propertyType !== "all") {
        if (!p.title.toLowerCase().includes(filters.propertyType.toLowerCase())) return false;
      }

      if (filters?.amenities && filters.amenities.length > 0) {
        const names = getAmenityNames(p);
        const wanted = new Set(filters.amenities.map((a) => a.toLowerCase()));
        for (const w of wanted) {
          if (!names.some((n) => n.includes(w))) return false;
        }
      }

      if (filters?.startDate && filters?.endDate && availableIds) {
        if (!availableIds.has(String(p.id))) return false;
      }

      return true;
    });
  }, [properties, filters, hasFilters, availableIds]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero */}
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
          <PropertySearch onFiltersChange={setFilters} availableAmenities={availableAmenities} />
        </div>
      </header>

      {/* Properties visas alltid direkt */}
      <main className="pb-12">
        <div className="container mx-auto px-4 pt-16">
          {!properties || properties.length === 0 ? (
            <div className="text-center py-16">
              <Grid3X3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No properties found</h3>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {(filteredProperties.length > 0 ? filteredProperties : properties).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bokpromotion */}
      <section className="py-12 bg-gradient-to-br from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-left">
              Looking for the perfect retreat read?
            </h2>
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 flex justify-center lg:justify-start">
                <img 
                  src={bookCover} 
                  alt="När havet förändrade allt - When the Ocean Changed Everything by Jenny Nirs" 
                  className="w-40 sm:w-48 h-auto rounded-lg shadow-elegant"
                />
              </div>
              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-xl sm:text-2xl font-semibold">When the Ocean changed everything</h3>
                <h4 className="text-base sm:text-lg text-muted-foreground">My Journey through Disaster</h4>
                <p className="text-sm sm:text-base text-muted-foreground">
                  A gripping and unforgettable true story of survival and meaning.
                </p>
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

      {/* Produkter */}
      <HomepageProducts />

      {/* Footer */}
      <footer className="py-16 border-t border-border bg-card">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2025 Nordic Getaways. Created with love for Nordic experiences.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
