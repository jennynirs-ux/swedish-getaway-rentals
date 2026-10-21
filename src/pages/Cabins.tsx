import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import PropertyCard from "@/components/PropertyCard";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

interface CabinsContent {
  title: string;
  description: string;
  cta_text: string;
}

const Cabins = () => {
  usePageMeta({
    title: "Find a cabin in Sweden",
    description: "Find a holiday cabin in Sweden and book it directly with the host. Secure card payment, with the full price incl. service fee shown before you pay.",
    path: "/cabins",
  });

  const { properties, loading } = useProperties();
  // Shown until platform_settings.book_now_content loads (and in the
  // prerendered page); the admin Content editor uses the same defaults
  const [content, setContent] = useState<CabinsContent>({
    title: "Find a cabin in Sweden",
    description: "Every cabin is listed by its own host. Pick a cabin, check the dates and pay securely by card – the full price, service fee included, is shown before you pay.",
    cta_text: "Select a cabin below to see availability."
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
        setContent(data.setting_value as unknown as CabinsContent);
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

          {/* The cards' titles are H3s; this keeps the heading order H1 → H2 → H3 */}
          <h2 className="sr-only">Cabins to rent in Sweden</h2>

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
                <Button asChild>
                  <Link to="/">Return to Homepage</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Cabins;