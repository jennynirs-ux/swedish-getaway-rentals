import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Users, Wifi, TreePine, Waves, Bed, Bath } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  amenities: string[];
  hero_image_url?: string;
}

const HomePage = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (data) {
        setProperties(data);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyRoute = (property: Property) => {
    // Map property titles to existing routes
    if (property.title.toLowerCase().includes('villa') || property.title.toLowerCase().includes('hacken')) {
      return '/villa-hacken';
    }
    if (property.title.toLowerCase().includes('lakehouse') || property.title.toLowerCase().includes('getaway')) {
      return '/lakehouse-getaway';
    }
    // For new properties, use a generic route
    return `/property/${property.id}`;
  };

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi')) return <Wifi className="w-4 h-4 mr-1" />;
    if (amenityLower.includes('sauna')) return <TreePine className="w-4 h-4 mr-1" />;
    if (amenityLower.includes('lake') || amenityLower.includes('water')) return <Waves className="w-4 h-4 mr-1" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
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
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Laddar fastigheter...</p>
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
                      4.9
                    </Badge>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {property.title}
                      <Badge variant="secondary">New</Badge>
                    </CardTitle>
                    <div className="flex items-center text-muted-foreground text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.location}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {property.description}
                    </p>
                    
                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {property.max_guests} guests
                      </div>
                      <div className="flex items-center">
                        <Bed className="w-4 h-4 mr-1" />
                        {property.bedrooms}
                      </div>
                      <div className="flex items-center">
                        <Bath className="w-4 h-4 mr-1" />
                        {property.bathrooms}
                      </div>
                    </div>
                    
                    {property.amenities && property.amenities.length > 0 && (
                      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                        {property.amenities.slice(0, 3).map((amenity, index) => (
                          <div key={index} className="flex items-center">
                            {getAmenityIcon(amenity)}
                            {amenity}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-foreground">
                          {property.price_per_night.toLocaleString()} {property.currency}
                        </span>
                        <span className="text-muted-foreground">/night</span>
                      </div>
                      <Link to={getPropertyRoute(property)}>
                        <Button>View Details</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {!loading && properties.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">Inga fastigheter tillgängliga</h3>
              <p className="text-muted-foreground">Kom tillbaka snart för nya alternativ!</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">Ready for your Swedish adventure?</h3>
          <p className="text-muted-foreground mb-6">Book your perfect getaway today or become a host</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/become-host">
              <Button size="lg" variant="outline">Bli värd</Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg">Login</Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;