// @ts-nocheck
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface ContentType {
  gallery_content: {
    title: string;
    description: string;
    images: string[];
  };
  amenities_content: {
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
  };
  contact_content: {
    title: string;
    description: string;
    email: string;
    phone: string;
    address: string;
    hours: string;
  };
  book_now_content: {
    title: string;
    description: string;
    cta_text: string;
  };
}

export const ContentEditor = () => {
  const [content, setContent] = useState<ContentType>({
    gallery_content: {
      title: "Nordic Getaways Gallery",
      description: "Discover the beauty of our properties and the stunning Nordic landscapes.",
      images: []
    },
    amenities_content: {
      title: "Premium Amenities",
      description: "Discover the luxury amenities available across our Nordic properties.",
      amenities: []
    },
    contact_content: {
      title: "Contact Nordic Getaways",
      description: "Get in touch with us for bookings, questions, or to become a host.",
      email: "info@nordicgetaways.com",
      phone: "+46 123 456 789",
      address: "Stockholm, Sweden",
      hours: "Monday - Friday: 9:00 AM - 6:00 PM"
    },
    book_now_content: {
      title: "Book Your Nordic Getaway",
      description: "Choose from our collection of premium properties and start planning your perfect Nordic retreat.",
      cta_text: "Ready to book? Select a property below and check availability."
    }
  });

  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllContent();
  }, []);

  const fetchAllContent = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['gallery_content', 'amenities_content', 'contact_content', 'book_now_content']);

      if (error) throw error;

      if (data) {
        const newContent = { ...content };
        data.forEach((item) => {
          if (item.setting_key in newContent) {
            newContent[item.setting_key as keyof ContentType] = item.setting_value as any;
          }
        });
        setContent(newContent);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: "Error",
        description: "Failed to load content",
        variant: "destructive"
      });
    }
  };

  const saveContent = async (contentType: keyof ContentType) => {
    setSaving(contentType);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          setting_key: contentType,
          setting_value: content[contentType]
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${contentType.replace('_', ' ')} content saved successfully`
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Error",
        description: "Failed to save content",
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const updateContent = <T extends keyof ContentType>(
    type: T,
    field: keyof ContentType[T],
    value: any
  ) => {
    setContent(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Content Management</h2>
        <p className="text-muted-foreground">Manage content for Quick Links pages</p>
      </div>

      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="booking">Book Now</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gallery-title">Title</Label>
                <Input
                  id="gallery-title"
                  value={content.gallery_content.title}
                  onChange={(e) => updateContent('gallery_content', 'title', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gallery-description">Description</Label>
                <Textarea
                  id="gallery-description"
                  value={content.gallery_content.description}
                  onChange={(e) => updateContent('gallery_content', 'description', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="gallery-images">Image URLs (one per line)</Label>
                <Textarea
                  id="gallery-images"
                  value={content.gallery_content.images.join('\n')}
                  onChange={(e) => updateContent('gallery_content', 'images', e.target.value.split('\n').filter(url => url.trim()))}
                  rows={5}
                  placeholder="https://example.com/image1.jpg"
                />
              </div>
              <Button 
                onClick={() => saveContent('gallery_content')}
                disabled={saving === 'gallery_content'}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving === 'gallery_content' ? 'Saving...' : 'Save Gallery Content'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Page Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-title">Title</Label>
                  <Input
                    id="contact-title"
                    value={content.contact_content.title}
                    onChange={(e) => updateContent('contact_content', 'title', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={content.contact_content.email}
                    onChange={(e) => updateContent('contact_content', 'email', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contact-description">Description</Label>
                <Textarea
                  id="contact-description"
                  value={content.contact_content.description}
                  onChange={(e) => updateContent('contact_content', 'description', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={content.contact_content.phone}
                    onChange={(e) => updateContent('contact_content', 'phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-address">Address</Label>
                  <Input
                    id="contact-address"
                    value={content.contact_content.address}
                    onChange={(e) => updateContent('contact_content', 'address', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contact-hours">Business Hours</Label>
                <Input
                  id="contact-hours"
                  value={content.contact_content.hours}
                  onChange={(e) => updateContent('contact_content', 'hours', e.target.value)}
                />
              </div>
              <Button 
                onClick={() => saveContent('contact_content')}
                disabled={saving === 'contact_content'}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving === 'contact_content' ? 'Saving...' : 'Save Contact Content'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking">
          <Card>
            <CardHeader>
              <CardTitle>Book Now Page Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="booking-title">Title</Label>
                <Input
                  id="booking-title"
                  value={content.book_now_content.title}
                  onChange={(e) => updateContent('book_now_content', 'title', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="booking-description">Description</Label>
                <Textarea
                  id="booking-description"
                  value={content.book_now_content.description}
                  onChange={(e) => updateContent('book_now_content', 'description', e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="booking-cta">Call-to-Action Text</Label>
                <Input
                  id="booking-cta"
                  value={content.book_now_content.cta_text}
                  onChange={(e) => updateContent('book_now_content', 'cta_text', e.target.value)}
                />
              </div>
              <Button 
                onClick={() => saveContent('book_now_content')}
                disabled={saving === 'book_now_content'}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving === 'book_now_content' ? 'Saving...' : 'Save Book Now Content'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="amenities">
          <Card>
            <CardHeader>
              <CardTitle>Amenities Page Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amenities-title">Title</Label>
                <Input
                  id="amenities-title"
                  value={content.amenities_content.title}
                  onChange={(e) => updateContent('amenities_content', 'title', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="amenities-description">Description</Label>
                <Textarea
                  id="amenities-description"
                  value={content.amenities_content.description}
                  onChange={(e) => updateContent('amenities_content', 'description', e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={() => saveContent('amenities_content')}
                disabled={saving === 'amenities_content'}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving === 'amenities_content' ? 'Saving...' : 'Save Amenities Content'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};