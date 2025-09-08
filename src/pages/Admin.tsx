import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { Settings, Plus, Edit, LogOut, Image, Trash2, Home, Calendar, MessageSquare, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DashboardOverview from "@/components/admin/DashboardOverview";
import BookingsManagement from "@/components/admin/BookingsManagement";
import MessagesInbox from "@/components/admin/MessagesInbox";
import AvailabilityCalendar from "@/components/admin/AvailabilityCalendar";
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { MultipleImageUpload } from "@/components/admin/MultipleImageUpload";
import { GalleryMetadataEditor } from "@/components/admin/GalleryMetadataEditor";
import { VideoUpload } from "@/components/admin/VideoUpload";
import { VideoMetadataEditor } from "@/components/admin/VideoMetadataEditor";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  hero_image_url: string;
  gallery_images: string[];
  active: boolean;
  host_id: string;
}

const amenitiesList = [
  'WiFi', 'Sauna', 'Sjöutsikt', 'Skog', 'Parkering', 'Kök', 'Tvättmaskin', 
  'Diskmaskin', 'TV', 'Eldstad', 'Terrass', 'Utegrill', 'Båt', 'Fiske', 
  'Vandring', 'Gym', 'Pool', 'Spa', 'Bastu', 'Jacuzzi'
];

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    price_per_night: "",
    max_guests: "",
    bedrooms: "",
    bathrooms: "",
    amenities: [] as string[],
    hero_image_url: "",
    gallery_images: "",
    gallery_metadata: [] as { title: string; description: string; alt: string }[],
    video_urls: "",
    video_metadata: [] as { title: string; description: string }[]
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Listen for hash changes to update active tab
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash && ['dashboard', 'properties', 'bookings', 'availability', 'messages', 'finances', 'add'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate('/auth');
        } else {
          checkAdminStatus(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      } else {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin status:', error);
        return;
      }

      if (data?.is_admin) {
        setIsAdmin(true);
        loadProperties();
      } else {
        toast({
          title: "Åtkomst nekad",
          description: "Du har inte admin-behörighet.",
          variant: "destructive"
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda properties",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      price_per_night: "",
      max_guests: "",
      bedrooms: "",
      bathrooms: "",
      amenities: [],
      hero_image_url: "",
      gallery_images: "",
      gallery_metadata: [],
      video_urls: "",
      video_metadata: []
    });
    setSelectedProperty(null);
  };

  const handleEdit = (property: Property) => {
    console.log('Editing property:', property);
    setSelectedProperty(property);
    setFormData({
      title: property.title,
      description: property.description || "",
      location: property.location || "",
      price_per_night: property.price_per_night.toString(),
      max_guests: property.max_guests.toString(),
      bedrooms: property.bedrooms.toString(),
      bathrooms: property.bathrooms.toString(),
      amenities: property.amenities || [],
      hero_image_url: property.hero_image_url || "",
      gallery_images: property.gallery_images?.join(', ') || "",
      gallery_metadata: (property as any).gallery_metadata || [],
      video_urls: (property as any).video_urls?.join(', ') || "",
      video_metadata: (property as any).video_metadata || []
    });
    // Switch to the add tab where the form is located
    setActiveTab("add");
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna property?')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Framgång",
        description: "Property borttagen"
      });
      
      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ta bort property",
        variant: "destructive"
      });
    }
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: checked 
        ? [...prev.amenities, amenity]
        : prev.amenities.filter(a => a !== amenity)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Submitting form data:', formData);
      console.log('Selected property:', selectedProperty);

      const propertyData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        price_per_night: parseInt(formData.price_per_night),
        max_guests: parseInt(formData.max_guests),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        amenities: formData.amenities,
        hero_image_url: formData.hero_image_url,
        gallery_images: formData.gallery_images.split(',').map(a => a.trim()).filter(a => a),
        gallery_metadata: formData.gallery_metadata,
        video_urls: formData.video_urls.split(',').map(a => a.trim()).filter(a => a),
        video_metadata: formData.video_metadata
      };

      let result;
      if (selectedProperty) {
        console.log('Updating existing property with ID:', selectedProperty.id);
        result = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', selectedProperty.id)
          .select();
      } else {
        console.log('Creating new property');
        // Get the current user's profile to use as host_id for new properties
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user?.id)
          .single();

        if (profileError) {
          throw new Error('Kunde inte hämta användarprofi');
        }

        result = await supabase
          .from('properties')
          .insert({ ...propertyData, host_id: profile.id })
          .select();
      }
      
      console.log('Supabase result:', result);
      
      if (result.error) {
        console.error('Supabase error:', result.error);
        throw result.error;
      }

      toast({
        title: "Framgång",
        description: selectedProperty ? "Property uppdaterad" : "Ny property skapad"
      });
      
      resetForm();
      loadProperties();
      
      // Switch back to properties tab after successful save
      setActiveTab("properties");
    } catch (error: any) {
      console.error('Error saving property:', error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte spara property. Kontrollera att alla fält är korrekt ifyllda.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Laddar...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Swedish Getaway Rentals - Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Admin</Badge>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" id="admin-tabs">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2" id="properties">
              <Home className="h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2" id="bookings">
              <Calendar className="h-4 w-4" />
              Bokningar
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Tillgänglighet
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Meddelanden
            </TabsTrigger>
            <TabsTrigger value="finances" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Ekonomi
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Lägg till
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsManagement />
          </TabsContent>

          <TabsContent value="availability">
            <AvailabilityCalendar />
          </TabsContent>

          <TabsContent value="messages">
            <MessagesInbox />
          </TabsContent>

          <TabsContent value="finances">
            <FinancialDashboard onBack={() => setActiveTab("dashboard")} />
          </TabsContent>

          <TabsContent value="properties">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Hantera Properties</h2>
                <p className="text-muted-foreground">Hantera och uppdatera dina befintliga rental properties</p>
              </div>
              
              <div className="grid gap-4">
                {properties.map((property) => (
                  <Card key={property.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{property.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {property.location} • {property.price_per_night} SEK/natt
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant={property.active ? "default" : "secondary"}>
                              {property.active ? "Aktiv" : "Inaktiv"}
                            </Badge>
                            <Badge variant="outline">
                              {property.max_guests} gäster
                            </Badge>
                            <Badge variant="outline">
                              {property.bedrooms} sovrum
                            </Badge>
                          </div>
                          {property.amenities && property.amenities.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {property.amenities.slice(0, 3).map((amenity) => (
                                <Badge key={amenity} variant="outline" className="text-xs">
                                  {amenity}
                                </Badge>
                              ))}
                              {property.amenities.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{property.amenities.length - 3} fler
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleEdit(property)} variant="outline">
                            <Edit className="h-4 w-4 mr-2" />
                            Redigera
                          </Button>
                          <Button onClick={() => handleDelete(property.id)} variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="add">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedProperty ? "Redigera Property" : "Lägg till ny Property"}
                </CardTitle>
                <CardDescription>
                  {selectedProperty 
                    ? "Uppdatera information för befintlig property"
                    : "Skapa en ny rental property"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Titel *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Plats *</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beskrivning</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                    />
                  </div>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Pris per natt (SEK) *</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price_per_night}
                        onChange={(e) => setFormData({...formData, price_per_night: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guests">Max gäster *</Label>
                      <Input
                        id="guests"
                        type="number"
                        value={formData.max_guests}
                        onChange={(e) => setFormData({...formData, max_guests: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Sovrum *</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Badrum *</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Bekvämligheter</Label>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {amenitiesList.map((amenity) => (
                        <div key={amenity} className="flex items-center space-x-2">
                          <Checkbox
                            id={amenity}
                            checked={formData.amenities.includes(amenity)}
                            onCheckedChange={(checked) => handleAmenityChange(amenity, checked as boolean)}
                          />
                          <Label htmlFor={amenity} className="text-sm font-normal">
                            {amenity}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ImageUpload
                    label="Hero-bild"
                    value={formData.hero_image_url}
                    onChange={(url) => setFormData({...formData, hero_image_url: url})}
                    onRemove={() => setFormData({...formData, hero_image_url: ''})}
                  />

                  <MultipleImageUpload
                    label="Galleri-bilder"
                    value={formData.gallery_images.split(',').filter(img => img.trim())}
                    onChange={(urls) => setFormData({...formData, gallery_images: urls.join(', ')})}
                    maxImages={50}
                  />

                  <GalleryMetadataEditor
                    images={formData.gallery_images.split(',').filter(img => img.trim())}
                    metadata={formData.gallery_metadata}
                    onChange={(metadata, images) => {
                      setFormData({
                        ...formData, 
                        gallery_metadata: metadata,
                        gallery_images: images ? images.join(', ') : formData.gallery_images
                      });
                    }}
                  />

                  <VideoUpload
                    label="Property-videor"
                    value={formData.video_urls.split(',').filter(url => url.trim())}
                    onChange={(urls) => setFormData({...formData, video_urls: urls.join(', ')})}
                    maxVideos={5}
                  />

                  <VideoMetadataEditor
                    videos={formData.video_urls.split(',').filter(url => url.trim())}
                    metadata={formData.video_metadata}
                    onChange={(metadata, videos) => {
                      setFormData({
                        ...formData, 
                        video_metadata: metadata,
                        video_urls: videos ? videos.join(', ') : formData.video_urls
                      });
                    }}
                  />

                  <div className="flex space-x-4">
                    <Button type="submit" disabled={loading}>
                      <Plus className="h-4 w-4 mr-2" />
                      {selectedProperty ? "Uppdatera" : "Skapa"} Property
                    </Button>
                    {selectedProperty && (
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Avbryt
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;