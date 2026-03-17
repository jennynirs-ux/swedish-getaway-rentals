import { useState, useEffect } from "react";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wifi, Car, Coffee, Utensils, Waves, TreePine, Mountain, Home, 
  Bed, Bath, Users, Flame, UtensilsCrossed, Thermometer, Shield, 
  Tv, Dumbbell, PawPrint, Snowflake
} from "lucide-react";

interface AmenityContent {
  title: string;
  description: string;
  amenities: Array<{
    icon: string;
    title: string;
    tagline: string;
    description: string;
    image_url?: string;
    features?: string[];
  }>;
}

const iconMap = {
  wifi: Wifi, parking: Car, coffee: Coffee, dining: Utensils, sauna: Waves,
  nature: TreePine, view: Mountain, home: Home, bed: Bed, bath: Bath,
  guests: Users, fire: Flame, kitchen: UtensilsCrossed, heating: Thermometer,
  security: Shield, tv: Tv, fitness: Dumbbell, pets: PawPrint, cooling: Snowflake
};

const Amenities = () => {
  const [content, setContent] = useState<AmenityContent>({
    title: "Premium Amenities",
    description: "Discover the luxury amenities available across our Nordic properties.",
    amenities: []
  });

  useEffect(() => {
    document.title = 'Amenities | Nordic Getaways';
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'amenities_content')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setContent(data.setting_value as unknown as AmenityContent);
      }
    } catch (error) {
      console.error('Error fetching amenities content:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
            <p className="text-lg text-muted-foreground">{content.description}</p>
          </div>

          {content.amenities.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.amenities.map((amenity, index) => {
                const IconComponent = iconMap[amenity.icon as keyof typeof iconMap] || Home;
                return (
                  <Card key={index} className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{amenity.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{amenity.tagline}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{amenity.description}</p>
                      
                      {amenity.image_url && (
                        <img
                          src={amenity.image_url}
                          alt={amenity.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-32 object-cover rounded-md mb-4"
                        />
                      )}
                      
                      {amenity.features && amenity.features.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {amenity.features.map((feature, featureIndex) => (
                            <li key={featureIndex}>{feature}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No amenities information available at the moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Amenities;