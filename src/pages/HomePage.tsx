import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProperties } from "@/hooks/useProperties";
import { usePropertyFilters } from "@/hooks/usePropertyFilters";
import { Skeleton } from "@/components/ui/skeleton";
import PropertySearch from "@/components/PropertySearch";
import PropertyCard from "@/components/PropertyCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { SlidersHorizontal, Grid3X3, List } from "lucide-react";
import forestHeroBg from "@/assets/forest-hero-bg.jpg";
import bookCover from "@/assets/book-cover.jpg";
const HomePage = () => {
  const {
    properties,
    loading
  } = useProperties();
  const {
    filters,
    setFilters,
    sortBy,
    setSortBy,
    favorites,
    toggleFavorite,
    availableAmenities,
    filteredProperties,
    totalResults
  } = usePropertyFilters(properties);
  return <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <header className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(${forestHeroBg})`
      }} />
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-6">
              Swedish Getaway Rentals
            </h1>
            <p className="text-2xl text-white/90 max-w-3xl mx-auto">
              Discover your perfect retreat in Sweden
            </p>
          </div>
          
          {/* Search Component */}
          <PropertySearch onFiltersChange={setFilters} availableAmenities={availableAmenities} />
        </div>
      </header>

      {/* Sort Controls */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recommended">Recommended</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Property Cards */}
      <main className="pb-12">
        <div className="container mx-auto px-4">
          {loading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="animate-pulse">
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
                </div>)}
            </div> : properties.length > 0 ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {properties.map(property => <PropertyCard key={property.id} property={property} onFavoriteToggle={toggleFavorite} isFavorite={favorites.includes(property.id)} />)}
            </div> : <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <Grid3X3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No properties found
                </h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search filters or search for a different location.
                </p>
                <Button onClick={() => setFilters({
              location: "",
              checkIn: undefined,
              checkOut: undefined,
              guests: 2,
              priceRange: [0, 5000],
              amenities: [],
              propertyType: ""
            })}>
                  Clear all filters
                </Button>
              </div>
            </div>}
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
              <div className="lg:col-span-4 flex justify-center lg:justify-start">
                <div className="relative group">
                  <img src={bookCover} alt="När havet förändrade allt - When the Ocean Changed Everything by Jenny Nirs" className="w-48 h-auto rounded-lg shadow-elegant transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-20 rounded-lg transition-opacity"></div>
                </div>
              </div>

              {/* Book Information - Right Side */}
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <h3 className="text-2xl font-semibold text-foreground mb-1">When the Ocean changed everything</h3>
                  <h4 className="text-lg text-muted-foreground mb-3">My Journey through Disaster</h4>
                  <p className="text-base text-muted-foreground leading-relaxed">A gripping and unforgettable true story of survival and meaning. Perfect reading for your Swedish getaway. Available in both Swedish and English.</p>
                </div>

                {/* Reviews Carousel */}
                <div className="relative">
                  <Carousel className="w-full max-w-lg">
                    <CarouselContent>
                      <CarouselItem>
                        <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                          <div className="flex items-center mb-2">
                            <div className="flex text-yellow-500 text-sm">
                              {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
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
                              {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
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
                              {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
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
                              {[1, 2, 3, 4, 5].map(i => <span key={i}>★</span>)}
                            </div>
                            <span className="ml-2 text-sm text-muted-foreground">by Karl-olov</span>
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            "A masterpiece of Swedish literature. This book will resonate with readers long after finishing it."
                          </p>
                        </div>
                      </CarouselItem>
                    </CarouselContent>
                    <CarouselPrevious className="left-0" />
                    <CarouselNext className="right-0" />
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

      {/* Footer */}
      <footer className="py-16 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Swedish Getaway Rentals</h3>
              <p className="text-muted-foreground mb-4">
                Discover authentic Swedish experiences in our handpicked properties.
              </p>
              <div className="flex gap-2">
                <Link to="/auth">
                  <Button variant="outline">Admin Login</Button>
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Popular Destinations</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground transition-colors">Västergötland</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Stockholm Archipelago</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Småland</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Dalarna</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Discover Sweden</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground transition-colors">Local Experiences</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Seasonal Guides</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Swedish Traditions</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Sustainable Tourism</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-border">
            <p className="text-muted-foreground">
              © 2024 Swedish Getaway Rentals. Created with love for Swedish experiences.
            </p>
          </div>
        </div>
      </footer>
    </div>;
};
export default HomePage;