import { useState, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PropertyCard, { PropertyCardData } from "@/components/PropertyCard";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { supabase } from "@/integrations/supabase/client";
import LazyImage from "@/components/LazyImage";
import { Grid3X3 } from "lucide-react";
import HomepageProducts from "@/components/HomepageProducts";
import PropertySearch from "@/components/PropertySearch";
import MainNavigation from "@/components/MainNavigation";
import BookPromotion from "@/components/BookPromotion"; // 👈 importera nya komponenten

import forestHeroBg from "@/assets/forest-hero-light.jpg";

interface PropertyFilters {
  guests?: number;
  propertyType?: string;
  amenities?: string[];
}

const MemoizedPropertyCard = memo(PropertyCard);
const MemoizedHomepageProducts = memo(HomepageProducts);

const HomePage = memo(() => {
  /** Hämta properties från supabase */
  const propertiesQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from("properties")
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
        amenities,
        active,
        review_rating,
        review_count,
        property_type,
        special_amenities,
        featured_amenities
      `)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  }, []);

  const { data: properties = [], loading } = useOptimizedQuery(
    "homepage-properties",
    propertiesQueryFn,
    {
      cacheTime: 15 * 60 * 1000,
      staleTime: 5 * 60 * 1000,
      enableRealtime: false,
    }
  );

  const [filters, setFilters] = useState<PropertyFilters | null>(null);

  /** Bygg lista med amenities */
  const availableAmenities = useMemo(() => {
    const all = new Set<string>();
    (properties || []).forEach((p: any) => {
      if (Array.isArray(p?.amenities)) {
        p.amenities.forEach((a: any) => {
          if (a) all.add(String(a).toLowerCase());
        });
      }
    });
    return Array.from(all).sort();
  }, [properties]);

  /** Filtrera efter sökkriterier */
  const filteredProperties = useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];
    if (!filters) return properties;

    return properties.filter((p: any) => {
      if (filters.guests && p.max_guests < filters.guests) return false;
      if (filters.propertyType && filters.propertyType !== "all") {
        if (!p.title.toLowerCase().includes(filters.propertyType.toLowerCase())) return false;
      }
      if (filters.amenities && filters.amenities.length > 0) {
        const names = Array.isArray(p.amenities)
          ? p.amenities.map((a: any) => String(a || "").toLowerCase()).filter(Boolean)
          : [];
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
      {/* Navigation */}
      <MainNavigation />

      {/* Hero Section */}
      <header className="relative h-[80vh] flex items-center justify-center text-center">
        <div className="absolute inset-0">
          <LazyImage
            src={forestHeroBg}
            alt="Swedish forest background with sunlight through trees"
            className="w-full h-full object-cover"
            priority={true}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/70"></div>
        </div>

        <div className="relative z-10 px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Nordic Getaways
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-10">
            Discover your perfect retreat in the Nordic
          </p>

          {/* Search bar */}
          <PropertySearch
            onFiltersChange={setFilters}
            availableAmenities={availableAmenities}
          />
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
              {filteredProperties.map((p: any) => (
                <MemoizedPropertyCard
                  key={p.id}
                  property={{
                    ...p,
                    hero_image_url: p.hero_image_url || "/placeholder.jpg",
                    description: p.description || "",
                    currency: p.currency || "SEK",
                    amenities: Array.isArray(p.amenities) ? p.amenities : [],
                    featured_amenities: Array.isArray(p.featured_amenities) ? p.featured_amenities : [],
                    special_amenities: Array.isArray(p.special_amenities) ? p.special_amenities : [],
                    amenities_data: Array.isArray(p.amenities_data) ? p.amenities_data : [],
                  }}
                />
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
      <BookPromotion /> {/* 👈 nu används bara komponenten */}

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
                <Link to="/auth?redirect=/host-dashboard">
                  <Button variant="outline">Become a Host</Button>
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/shop" className="hover:text-foreground">The Nordic Collection</Link></li>
                <li><Link to="/first-time-in-sweden" className="hover:text-foreground">First time in Sweden?</Link></li>
                <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
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
});

HomePage.displayName = "HomePage";

export default HomePage;
