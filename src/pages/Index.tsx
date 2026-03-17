import { useState, useMemo, useCallback, memo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import PropertyCard, { PropertyCardData } from "@/components/PropertyCard";
import { supabase } from "@/integrations/supabase/client";
import LazyImage from "@/components/LazyImage";
import { Grid3X3 } from "lucide-react";
import HomepageProducts from "@/components/HomepageProducts";
import PropertySearch from "@/components/PropertySearch";
import MainNavigation from "@/components/MainNavigation";
import BookPromotion from "@/components/BookPromotion";
import { calculateDistance, isInCityGroup, type Coordinates } from "@/lib/distance";
import { CACHE_STALE_TIME, CACHE_GC_TIME } from "@/lib/constants";
import { MobileRefreshButton } from "@/components/mobile/MobileRefreshButton";

import forestHeroBg from "@/assets/forest-hero-light.webp";
import { addDays, subDays, differenceInCalendarDays } from "date-fns";

interface PropertyFilters {
  location?: string;
  checkIn?: Date | undefined;
  checkOut?: Date | undefined;
  guests?: number;
  propertyType?: string;
  amenities?: string[];
  priceRange?: [number, number];
  dateFlexibility?: number;
  destinationCoords?: { latitude: number; longitude: number } | null;
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
        featured_amenities,
        latitude,
        longitude,
        city
      `)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  }, []);

  const { data: properties = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["homepage-properties"],
    queryFn: propertiesQueryFn,
    gcTime: CACHE_GC_TIME,
    staleTime: CACHE_STALE_TIME,
  });

  const [filters, setFilters] = useState<PropertyFilters | null>(null);
  const [availablePropertyIds, setAvailablePropertyIds] = useState<Set<string> | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** Debounced filter handler - only applies debounce to location changes */
  const handleFiltersChange = useCallback((newFilters: PropertyFilters) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Check if only location changed (text-based change)
    const isOnlyLocationChange = filters &&
      newFilters.location !== filters.location &&
      newFilters.checkIn === filters.checkIn &&
      newFilters.checkOut === filters.checkOut &&
      newFilters.guests === filters.guests &&
      newFilters.propertyType === filters.propertyType &&
      JSON.stringify(newFilters.amenities) === JSON.stringify(filters.amenities) &&
      JSON.stringify(newFilters.priceRange) === JSON.stringify(filters.priceRange) &&
      newFilters.dateFlexibility === filters.dateFlexibility;

    if (isOnlyLocationChange) {
      // Debounce location changes by 300ms
      debounceTimeoutRef.current = setTimeout(() => {
        setFilters(newFilters);
      }, 300);
    } else {
      // Apply date/guest/amenity changes immediately
      setFilters(newFilters);
    }
  }, [filters]);

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

  // Check availability against selected dates (+/- flexibility)
  useEffect(() => {
    const run = async () => {
      try {
        if (!filters?.checkIn || !filters?.checkOut) {
          setAvailablePropertyIds(null);
          return;
        }
        setCheckingAvailability(true);
        const propertyIds = (properties as any[]).map((p: any) => p.id);
        if (propertyIds.length === 0) {
          setAvailablePropertyIds(new Set());
          setCheckingAvailability(false);
          return;
        }

        const flex = filters?.dateFlexibility || 0;
        const nights = differenceInCalendarDays(filters.checkOut as Date, filters.checkIn as Date);
        const startMin = subDays(filters.checkIn as Date, flex);
        const startMax = addDays(filters.checkIn as Date, flex);
        const endMax = addDays(filters.checkOut as Date, flex);

        // Normalize to UTC for consistent date comparisons
        const startStr = new Date(startMin.getTime() - startMin.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const endStr = new Date(endMax.getTime() - endMax.getTimezoneOffset() * 60000).toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('availability')
          .select('property_id,date,available')
          .in('property_id', propertyIds)
          .gte('date', startStr)
          .lt('date', endStr)
          .eq('available', false);

        if (error) throw error;

        const blockMap = new Map<string, Set<string>>();
        (data || []).forEach((row: any) => {
          const pid = row.property_id as string;
          // Database date is already in UTC format (YYYY-MM-DD)
          const d = row.date;
          if (!blockMap.has(pid)) blockMap.set(pid, new Set());
          blockMap.get(pid)!.add(d);
        });

        const okIds = new Set<string>();
        propertyIds.forEach((pid) => {
          const blocked = blockMap.get(pid) || new Set<string>();
          let s = new Date(startMin);
          while (s.getTime() <= startMax.getTime()) {
            let ok = true;
            for (let i = 0; i < nights; i++) {
              const checkDate = addDays(s, i);
              const d = new Date(checkDate.getTime() - checkDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
              if (blocked.has(d)) { ok = false; break; }
            }
            if (ok) { okIds.add(pid); break; }
            s = addDays(s, 1);
          }
        });

        setAvailablePropertyIds(okIds);
      } finally {
        setCheckingAvailability(false);
      }
    };

    run();
  }, [filters?.checkIn, filters?.checkOut, filters?.dateFlexibility, properties]);

  /** Filtrera efter sökkriterier - show ALL if no filters applied */
  const filteredProperties = useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];
    
    // If no filters at all, show all properties
    if (!filters || (
      !filters.guests && 
      !filters.propertyType && 
      (!filters.amenities || filters.amenities.length === 0) && 
      !filters.location &&
      !filters.checkIn &&
      !filters.checkOut &&
      (!filters.priceRange || (filters.priceRange[0] === 0 && filters.priceRange[1] === 10000))
    )) {
      return properties;
    }

    return properties.filter((p: any) => {
      // Guest filter
      if (filters.guests && p.max_guests < filters.guests) return false;
      
      // Price range filter
      if (filters.priceRange) {
        if (p.price_per_night < filters.priceRange[0] || p.price_per_night > filters.priceRange[1]) {
          return false;
        }
      }
      
      // Property type filter
      if (filters.propertyType && filters.propertyType !== "all") {
        const title = p.title?.toLowerCase() || "";
        const type = filters.propertyType.toLowerCase();
        
        if (type === 'villa' && !title.includes('villa')) return false;
        if (type === 'lakehouse' && !title.includes('lakehouse') && !title.includes('lake')) return false;
        if (type === 'cabin' && !title.includes('cabin') && !title.includes('stuga')) return false;
        if (type === 'apartment' && !title.includes('apartment') && !title.includes('lägenhet')) return false;
      }
      
      // Amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        const names = Array.isArray(p.amenities)
          ? p.amenities.map((a: any) => String(a || "").toLowerCase()).filter(Boolean)
          : [];
        const wanted = new Set(filters.amenities.map((a) => a.toLowerCase()));
        for (const w of wanted) {
          if (!names.some((n) => n === w)) return false;
        }
      }
      
      // Date availability filter
      if (filters.checkIn && filters.checkOut) {
        if (!availablePropertyIds) return false;
        if (!availablePropertyIds.has(p.id)) return false;
      }
      
      // Location/City filter with distance calculation
      if (filters.location && filters.location.trim()) {
        // Check city name match or city groups
        if (p.city && isInCityGroup(p.city, filters.location)) {
          return true;
        }

        // Check distance-based filtering if coordinates are available
        if (filters.destinationCoords && p.latitude && p.longitude) {
          const propertyCoords: Coordinates = {
            latitude: p.latitude,
            longitude: p.longitude
          };
          const distance = calculateDistance(filters.destinationCoords, propertyCoords);
          // Within 30 km radius
          if (distance <= 30) {
            return true;
          }
        }

        // Fallback: text matching on title, location, and city when geocoding returns null
        const searchTerm = filters.location.toLowerCase();
        if (p.title?.toLowerCase().includes(searchTerm) ||
            p.location?.toLowerCase().includes(searchTerm) ||
            p.city?.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // If location specified but no match, filter out
        return false;
      }
      
      return true;
    });
  }, [properties, filters]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            "name": "Nordic Getaways",
            "description": "Discover your perfect retreat in the Nordic",
            "url": `${typeof window !== 'undefined' ? window.location.origin : ''}`,
            "image": `${typeof window !== 'undefined' ? window.location.origin : ''}/favicon.png`,
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "SE"
            }
          })
        }}
      />

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
            onFiltersChange={handleFiltersChange}
            availableAmenities={availableAmenities}
          />
        </div>
      </header>

      {/* Property Cards */}
      <main id="main-content" className="pb-12">
        <div className="container mx-auto px-4 pt-16">
          {/* IMP-010: Mobile refresh button */}
          <MobileRefreshButton onRefresh={refetch} isLoading={loading} />

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
          ) : checkingAvailability ? (
            // IMP-004: Show loading indicator during geocoding/availability check
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Searching...
                </h3>
                <p className="text-muted-foreground">
                  Checking availability for your selected dates
                </p>
              </div>
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
                  Try adjusting your filters to see more results.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Book Promotion Section */}
      <BookPromotion />

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
                <Link to="/become-host">
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

            <div>
              <h4 className="font-semibold text-foreground mb-4">For Guests</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/pricing-guide" className="hover:text-foreground">Pricing Guide</Link></li>
                <li><Link to="/auth" className="hover:text-foreground">Sign In / Register</Link></li>
                <li><Link to="/profile" className="hover:text-foreground">My Bookings</Link></li>
              </ul>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-border">
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} Nordic Getaways. Created with love for Nordic experiences.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
});

HomePage.displayName = "HomePage";

export default HomePage;
