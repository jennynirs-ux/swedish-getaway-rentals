import { useState, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PropertyCard, { PropertyCardData } from "@/components/PropertyCard";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { supabase } from "@/integrations/supabase/client";
import LazyImage from "@/components/LazyImage";
import { Grid3X3, ChevronLeft, ChevronRight } from "lucide-react";
import HomepageProducts from "@/components/HomepageProducts";
import PropertySearch from "@/components/PropertySearch";
import MainNavigation from "@/components/MainNavigation";

import forestHeroBg from "@/assets/forest-hero-light.jpg";
import bookCover from "@/assets/book-cover.png";

interface PropertyFilters {
  guests?: number;
  propertyType?: string;
  amenities?: string[];
}

const MemoizedPropertyCard = memo(PropertyCard);
const MemoizedHomepageProducts = memo(HomepageProducts);

const reviews = [
  {
    text: `"När havet förändrade allt" är en bok som stannar kvar i tankarna långt efter att sista sidan är läst...`,
    author: "Patrik",
    date: "2025-01-03",
    rating: "100%",
  },
  {
    text: "Jennys bok är en stark och rörande skildring av hur en enda händelse kan förändra ett liv...",
    author: "Helena",
    date: "2024-12-17",
    rating: "80%",
  },
  {
    text: "En medryckande och gripande beskrivning av vår tids största naturkatastrof...",
    author: "Per",
    date: "2024-12-14",
    rating: "100%",
  },
  {
    text: "En mycket gripande och fängslande bok. Sträckläste boken, ville inte sluta...",
    author: "Anna",
    date: "2024-12-14",
    rating: "100%",
  },
  {
    text: "Mycket spännande och dramatisk bok om tsunamin på Sri Lanka...",
    author: "Karl-olov",
    date: "2024-12-14",
    rating: "100%",
  },
];

const ReviewCarousel = () => {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((index - 1 + reviews.length) % reviews.length);
  const next = () => setIndex((index + 1) % reviews.length);

  const review = reviews[index];

  return (
    <div className="bg-muted/30 p-6 rounded-lg shadow-md relative">
      <p className="text-lg italic text-muted-foreground mb-4">"{review.text}"</p>
      <p className="font-semibold">{review.author}</p>
      <p className="text-sm text-muted-foreground">{review.date}</p>
      <p className="text-sm text-primary">Rating: {review.rating}</p>

      <div className="absolute top-1/2 left-2 -translate-y-1/2">
        <button onClick={prev}>
          <ChevronLeft className="w-6 h-6 text-muted-foreground hover:text-primary" />
        </button>
      </div>
      <div className="absolute top-1/2 right-2 -translate-y-1/2">
        <button onClick={next}>
          <ChevronRight className="w-6 h-6 text-muted-foreground hover:text-primary" />
        </button>
      </div>
    </div>
  );
};

const HomePage = memo(() => {
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
        review_count
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

  const filteredProperties = useMemo(() => {
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
      <header className="relative h-[80vh] overflow-hidden">
        <div className="absolute inset-0">
          <LazyImage
            src={forestHeroBg}
            alt="Swedish forest background with sunlight through trees"
            className="w-full h-full object-cover"
            priority={true}
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 text-white space-y-6">
          <h1 className="text-6xl font-bold">Nordic Getaways</h1>
          <p className="text-2xl text-white/90 max-w-3xl mx-auto">
            Discover your perfect retreat in the Nordic
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link to="/properties">Explore Properties</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/20" asChild>
              <Link to="/book-now">Book Now</Link>
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4 relative z-10 mt-[65vh]">
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
              {filteredProperties.map((p: PropertyCardData) => (
                <MemoizedPropertyCard
                  key={p.id}
                  property={{
                    ...p,
                    hero_image_url: p.hero_image_url || "/placeholder.jpg",
                    description: p.description || "",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Grid3X3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No properties found</h3>
              <p className="text-muted-foreground mb-6">No properties are currently available.</p>
            </div>
          )}
        </div>
      </main>

      {/* Book Section with Reviews */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            {/* Book image */}
            <div className="flex justify-center md:justify-start">
              <LazyImage
                src={bookCover}
                alt="När havet förändrade allt"
                className="w-48 md:w-60 rounded-lg shadow-lg"
              />
            </div>

            {/* Text + CTA + Carousel */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Tips: Vacation Read</h2>
              <p className="text-muted-foreground">
                En gripande och oförglömlig berättelse om överlevnad och mening. Läs Jennys bok som berört tusentals läsare världen över.
              </p>

              <div className="flex gap-4">
                <Button asChild>
                  <a
                    href="https://bokshop.bod.se/naer-havet-foeraendrade-allt-jenny-nirs-9789180801843"
                    target="_blank"
                  >
                    Svenska boken
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a
                    href="https://bokshop.bod.se/when-the-ocean-changed-everything-jenny-nirs-9789180807661"
                    target="_blank"
                  >
                    English edition
                  </a>
                </Button>
              </div>

              <ReviewCarousel />
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
                <Link to="/auth?redirect=/host-dashboard">
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
