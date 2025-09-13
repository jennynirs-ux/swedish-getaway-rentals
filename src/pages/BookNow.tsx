import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/PropertyCard";
import { supabase } from "@/integrations/supabase/client";

interface BookNowContent {
  title: string;
  description: string;
  cta_text: string;
}

const BookNow = () => {
  const { properties, loading } = useProperties();
  const [content, setContent] = useState<BookNowContent>({
    title: "Book Your Nordic Getaway",
    description: "Choose from our collection of premium properties and start planning your perfect Nordic retreat.",
    cta_text: "Ready to book? Select a property below and check availability."
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'book_now_content')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setContent(data.setting_value as unknown as BookNowContent);
      }
    } catch (error) {
      console.error('Error fetching book now content:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
            <p className="text-lg text-muted-foreground mb-6">{content.description}</p>
            <p className="text-muted-foreground">{content.cta_text}</p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="bg-muted h-64 rounded-t-lg"></div>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <div className="bg-muted h-6 rounded w-3/4"></div>
                      <div className="bg-muted h-4 rounded w-1/2"></div>
                      <div className="bg-muted h-16 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : properties.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No properties available for booking at the moment.</p>
                <Link to="/">
                  <Button>Return to Homepage</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookNow;