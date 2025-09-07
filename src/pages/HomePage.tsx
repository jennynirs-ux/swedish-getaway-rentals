import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Users, Wifi, TreePine, Waves, Calendar } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { Skeleton } from "@/components/ui/skeleton";
const HomePage = () => {
  const { properties, loading } = useProperties();

  const getPropertyRoute = (property: any) => {
    // Map property titles to specific routes
    if (property.title.toLowerCase().includes('villa') || property.title.toLowerCase().includes('hacken')) {
      return '/villa-hacken';
    }
    if (property.title.toLowerCase().includes('lakehouse') || property.title.toLowerCase().includes('lake')) {
      return '/lakehouse-getaway';
    }
    // Default fallback
    return `/property/${property.id}`;
  };

  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className="w-4 h-4 mr-1" />;
    if (lower.includes('sauna')) return <TreePine className="w-4 h-4 mr-1" />;
    if (lower.includes('lake') || lower.includes('water')) return <Waves className="w-4 h-4 mr-1" />;
    return <Calendar className="w-4 h-4 mr-1" />;
  };

  return <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">Swedish Getaway Rentals</h1>
            <p className="text-lg text-muted-foreground">Discover your perfect retreat in Sweden</p>
          </div>
        </div>
      </header>

      {/* Property Cards */}
      <main className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {[1, 2].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-64 w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full mb-4" />
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-1/3" />
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {properties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover-scale">
                  <div className="relative h-64">
                    <img 
                      src={property.hero_image_url || '/placeholder.svg'} 
                      alt={property.title} 
                      className="w-full h-full object-cover" 
                    />
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      4.8
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {property.title}
                      <Badge variant="secondary">Tillgänglig</Badge>
                    </CardTitle>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.location || 'Sverige'}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-1">
                      {property.description?.substring(0, 80)}...
                    </p>
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {property.max_guests} gäster
                      </div>
                      {property.amenities?.slice(0, 2).map((amenity, index) => (
                        <div key={index} className="flex items-center">
                          {getAmenityIcon(amenity)}
                          <span className="capitalize">{amenity}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-foreground">
                          {property.price_per_night.toLocaleString()} {property.currency}
                        </span>
                        <span className="text-muted-foreground">/natt</span>
                      </div>
                      <Link to={getPropertyRoute(property)}>
                        <Button>Visa Detaljer</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">Ready for your Swedish adventure?</h3>
          <p className="text-muted-foreground mb-6">Book your perfect getaway today</p>
          <div className="flex justify-center gap-4 flex-wrap">
            {properties.slice(0, 2).map((property) => (
              <Link key={property.id} to={getPropertyRoute(property)}>
                <Button size="lg">Boka {property.title}</Button>
              </Link>
            ))}
            <Link to="/auth">
              <Button variant="outline" size="lg">Admin Login</Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>;
};
export default HomePage;