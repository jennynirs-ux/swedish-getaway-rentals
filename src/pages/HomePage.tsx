import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProperties } from "@/hooks/useProperties";
import { usePropertyFilters } from "@/hooks/usePropertyFilters";
import { Skeleton } from "@/components/ui/skeleton";
import PropertySearch from "@/components/PropertySearch";
import PropertyCard from "@/components/PropertyCard";
import { SlidersHorizontal, Grid3X3, List } from "lucide-react";
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
      {/* Header */}
      <header className="py-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-foreground mb-4">
              Upptäck Sverige
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Hitta ditt perfekta skandinaviska resmål med våra handplockade fastigheter
            </p>
          </div>
          
          {/* Search Component */}
          <PropertySearch 
            onFiltersChange={setFilters}
            availableAmenities={availableAmenities}
          />
        </div>
      </header>

      {/* Results Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {loading ? "Laddar fastigheter..." : `${totalResults} fastigheter hittade`}
            </h2>
            {filters.location && (
              <p className="text-muted-foreground">
                i {filters.location}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sortera efter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Rekommenderat</SelectItem>
                <SelectItem value="price_asc">Pris: Lägst först</SelectItem>
                <SelectItem value="price_desc">Pris: Högst först</SelectItem>
                <SelectItem value="rating">Högst betyg</SelectItem>
                <SelectItem value="newest">Nyast först</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          ) : filteredProperties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {filteredProperties.map((property) => (
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
                  Inga fastigheter hittade
                </h3>
                <p className="text-muted-foreground mb-6">
                  Prova att justera dina sökfilter eller sök efter en annan plats.
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
                  Rensa alla filter
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
                Upptäck autentiska svenska upplevelser i våra handpockade fastigheter.
              </p>
              <div className="flex gap-2">
                <Link to="/auth">
                  <Button variant="outline">Admin Login</Button>
                </Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Populära destinationer</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground transition-colors">Västergötland</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Stockholms skärgård</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Småland</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Dalarna</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Upptäck Sverige</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground transition-colors">Lokala upplevelser</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Säsongsguider</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Svenska traditioner</Link></li>
                <li><Link to="#" className="hover:text-foreground transition-colors">Hållbar turism</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="text-center pt-8 border-t border-border">
            <p className="text-muted-foreground">
              © 2024 Swedish Getaway Rentals. Skapad med kärlek för svenska upplevelser.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default HomePage;