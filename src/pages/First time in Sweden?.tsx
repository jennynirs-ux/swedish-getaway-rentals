import { useState, useEffect } from "react";
import MainNavigation from "@/components/MainNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GalleryContent {
  title: string;
  description: string;
  images: string[];
}

const Gallery = () => {
  const [content, setContent] = useState<GalleryContent>({
    title: "Nordic Getaways Gallery",
    description: "Discover the beauty of our properties and the stunning Nordic landscapes.",
    images: []
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'gallery_content')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        setContent(data.setting_value as unknown as GalleryContent);
      }
    } catch (error) {
      console.error('Error fetching gallery content:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation showBackButton />
      
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
            <p className="text-lg text-muted-foreground">{content.description}</p>
          </div>

          {content.images.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.images.map((image, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-0">
                    <img 
                      src={image} 
                      alt={`Gallery image ${index + 1}`}
                      className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No gallery images available at the moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
