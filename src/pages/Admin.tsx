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
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { Settings, Plus, Edit, LogOut, Image, TrendingUp, Users, Calendar, DollarSign, Eye, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

interface Booking {
  id: string;
  property_id: string;
  guest_name: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface DashboardStats {
  totalProperties: number;
  activeProperties: number;
  totalBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    activeProperties: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    price_per_night: "",
    max_guests: "",
    bedrooms: "",
    bathrooms: "",
    amenities: "",
    hero_image_url: "",
    gallery_images: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

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
        loadBookings();
        loadStats();
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

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda bokningar",
        variant: "destructive"
      });
    }
  };

  const loadStats = async () => {
    try {
      // Load properties stats
      const { data: propertiesData, error: propError } = await supabase
        .from('properties')
        .select('*');

      // Load bookings stats
      const { data: bookingsData, error: bookError } = await supabase
        .from('bookings')
        .select('*');

      if (propError) throw propError;
      if (bookError) throw bookError;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyBookings = bookingsData?.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
      }) || [];

      const confirmedBookings = bookingsData?.filter(b => b.status === 'confirmed') || [];
      const pendingBookings = bookingsData?.filter(b => b.status === 'pending') || [];

      setStats({
        totalProperties: propertiesData?.length || 0,
        activeProperties: propertiesData?.filter(p => p.active)?.length || 0,
        totalBookings: bookingsData?.length || 0,
        pendingBookings: pendingBookings.length,
        totalRevenue: confirmedBookings.reduce((sum, booking) => sum + booking.total_amount, 0),
        monthlyRevenue: monthlyBookings.filter(b => b.status === 'confirmed').reduce((sum, booking) => sum + booking.total_amount, 0)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
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
      amenities: "",
      hero_image_url: "",
      gallery_images: ""
    });
    setSelectedProperty(null);
  };

  const handleEdit = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      title: property.title,
      description: property.description || "",
      location: property.location || "",
      price_per_night: property.price_per_night.toString(),
      max_guests: property.max_guests.toString(),
      bedrooms: property.bedrooms.toString(),
      bathrooms: property.bathrooms.toString(),
      amenities: property.amenities?.join(', ') || "",
      hero_image_url: property.hero_image_url || "",
      gallery_images: property.gallery_images?.join(', ') || ""
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const propertyData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        price_per_night: parseInt(formData.price_per_night),
        max_guests: parseInt(formData.max_guests),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseInt(formData.bathrooms),
        amenities: formData.amenities.split(',').map(a => a.trim()).filter(a => a),
        hero_image_url: formData.hero_image_url,
        gallery_images: formData.gallery_images.split(',').map(a => a.trim()).filter(a => a)
      };

      let error;
      if (selectedProperty) {
        ({ error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', selectedProperty.id));
      } else {
        ({ error } = await supabase
          .from('properties')
          .insert(propertyData));
      }

      if (error) throw error;

      toast({
        title: "Framgång",
        description: selectedProperty ? "Property uppdaterad" : "Ny property skapad"
      });
      
      resetForm();
      loadProperties();
    } catch (error) {
      console.error('Error saving property:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara property",
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
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
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
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Översikt</TabsTrigger>
            <TabsTrigger value="properties">Hantera Properties</TabsTrigger>
            <TabsTrigger value="add">Lägg till Property</TabsTrigger>
            <TabsTrigger value="bookings">Bokningar</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid gap-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Totalt Properties</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProperties}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeProperties} aktiva
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Totalt Bokningar</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalBookings}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.pendingBookings} väntande
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Intäkt</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalRevenue.toLocaleString()} SEK</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.monthlyRevenue.toLocaleString()} SEK denna månad
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Senaste Bokningar</CardTitle>
                    <CardDescription>De senaste bokningarna i systemet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {bookings.slice(0, 5).map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{booking.guest_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.check_in_date).toLocaleDateString('sv-SE')} - {new Date(booking.check_out_date).toLocaleDateString('sv-SE')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'pending' ? 'secondary' : 'destructive'}>
                              {booking.status}
                            </Badge>
                            <p className="text-sm font-medium">{booking.total_amount.toLocaleString()} SEK</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Properties Översikt</CardTitle>
                    <CardDescription>Status för dina properties</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {properties.slice(0, 4).map((property) => (
                        <div key={property.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{property.title}</p>
                            <p className="text-sm text-muted-foreground">{property.location}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={property.active ? 'default' : 'secondary'}>
                              {property.active ? 'Aktiv' : 'Inaktiv'}
                            </Badge>
                            <p className="text-sm font-medium">{property.price_per_night} SEK/natt</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="properties">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Befintliga Properties</CardTitle>
                  <CardDescription>
                    Hantera och uppdatera dina befintliga rental properties
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {properties.map((property) => (
                      <Card key={property.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
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
                              </div>
                            </div>
                            <Button onClick={() => handleEdit(property)} variant="outline">
                              <Edit className="h-4 w-4 mr-2" />
                              Redigera
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
                      <Label htmlFor="title">Titel</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Plats</Label>
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
                      <Label htmlFor="price">Pris per natt (SEK)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price_per_night}
                        onChange={(e) => setFormData({...formData, price_per_night: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guests">Max gäster</Label>
                      <Input
                        id="guests"
                        type="number"
                        value={formData.max_guests}
                        onChange={(e) => setFormData({...formData, max_guests: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Sovrum</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Badrum</Label>
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
                    <Label htmlFor="amenities">Bekvämligheter (separera med komma)</Label>
                    <Input
                      id="amenities"
                      value={formData.amenities}
                      onChange={(e) => setFormData({...formData, amenities: e.target.value})}
                      placeholder="WiFi, Sauna, Sjö, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hero_image">Hero-bild URL</Label>
                    <Input
                      id="hero_image"
                      value={formData.hero_image_url}
                      onChange={(e) => setFormData({...formData, hero_image_url: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gallery_images">Galleri-bilder URLs (separera med komma)</Label>
                    <Textarea
                      id="gallery_images"
                      value={formData.gallery_images}
                      onChange={(e) => setFormData({...formData, gallery_images: e.target.value})}
                      placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                      rows={3}
                    />
                  </div>

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

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Alla Bokningar</CardTitle>
                <CardDescription>Hantera och övervaka alla bokningar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="border">
                      <CardContent className="p-4">
                        <div className="grid md:grid-cols-4 gap-4 items-center">
                          <div>
                            <h3 className="font-semibold">{booking.guest_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              Boknings-ID: {booking.id.slice(0, 8)}...
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(booking.check_in_date).toLocaleDateString('sv-SE')} - {new Date(booking.check_out_date).toLocaleDateString('sv-SE')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Skapad: {new Date(booking.created_at).toLocaleDateString('sv-SE')}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">{booking.total_amount.toLocaleString()} SEK</p>
                            <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'pending' ? 'secondary' : 'destructive'}>
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="flex justify-end">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Visa detaljer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {bookings.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Inga bokningar hittades
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;