import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Users, Wifi, TreePine, Waves } from "lucide-react";
import villaHeroImage from "@/assets/villa-hero.jpg";
import lakehouseHeroImage from "@/assets/lakehouse-hero.jpg";

const HomePage = () => {
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
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            
            {/* Villa Hacken */}
            <Card className="overflow-hidden hover-scale">
              <div className="relative h-64">
                <img 
                  src={villaHeroImage} 
                  alt="Villa Hacken exterior" 
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                  <Star className="w-3 h-3 mr-1" />
                  5.0
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Villa Hacken
                  <Badge variant="secondary">New</Badge>
                </CardTitle>
                <div className="flex items-center text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  Lerum, Sweden
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Luxury villa with sauna, nature views, and modern amenities. Perfect for groups seeking comfort and tranquility.
                </p>
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    8 guests
                  </div>
                  <div className="flex items-center">
                    <TreePine className="w-4 h-4 mr-1" />
                    Sauna
                  </div>
                  <div className="flex items-center">
                    <Wifi className="w-4 h-4 mr-1" />
                    WiFi
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-foreground">1,500 SEK</span>
                    <span className="text-muted-foreground">/night</span>
                  </div>
                  <Link to="/villa-hacken">
                    <Button>View Details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Lakehouse Getaway */}
            <Card className="overflow-hidden hover-scale">
              <div className="relative h-64">
                <img 
                  src={lakehouseHeroImage} 
                  alt="Lakehouse Getaway exterior" 
                  className="w-full h-full object-cover"
                />
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                  <Star className="w-3 h-3 mr-1" />
                  4.9
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Lakehouse Getaway
                  <Badge variant="outline">Popular</Badge>
                </CardTitle>
                <div className="flex items-center text-muted-foreground text-sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  Värmland, Sweden
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Charming lakeside cabin with private dock, fishing opportunities, and peaceful forest surroundings.
                </p>
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    6 guests
                  </div>
                  <div className="flex items-center">
                    <Waves className="w-4 h-4 mr-1" />
                    Lake access
                  </div>
                  <div className="flex items-center">
                    <Wifi className="w-4 h-4 mr-1" />
                    WiFi
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-foreground">1,200 SEK</span>
                    <span className="text-muted-foreground">/night</span>
                  </div>
                  <Link to="/lakehouse-getaway">
                    <Button>View Details</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">Ready for your Swedish adventure?</h3>
          <p className="text-muted-foreground mb-6">Book your perfect getaway today</p>
          <div className="flex justify-center gap-4">
            <Link to="/villa-hacken">
              <Button size="lg">Book Villa Hacken</Button>
            </Link>
            <Link to="/lakehouse-getaway">
              <Button variant="outline" size="lg">Book Lakehouse</Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;