import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProperties } from "@/hooks/useProperties";
import { usePropertyFilters } from "@/hooks/usePropertyFilters";
import { Skeleton } from "@/components/ui/skeleton";
import PropertySearch from "@/components/PropertySearch";
import PropertyCard from "@/components/PropertyCard";
import { SlidersHorizontal, Grid3X3, List } from "lucide-react";
import forestHeroBg from "@/assets/forest-hero-bg.jpg";
const HomePage = () => {
  const { properties, loading } = useProperties();
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <header className="relative py-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${forestHeroBg})` }}
        />
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
          <PropertySearch 
            onFiltersChange={setFilters}
            availableAmenities={availableAmenities}
          />
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
          ) : properties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onFavoriteToggle={toggleFavorite}
                  isFavorite={favorites.includes(property.id)}
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
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
};
export default HomePage;