import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Home, Calendar, Users, DollarSign, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Property {
  id: string;
  title: string;
  location: string;
  price_per_night: number;
  currency: string;
  active: boolean;
  pending_approval: boolean;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  hero_image_url?: string;
}

interface HostStats {
  totalProperties: number;
  activeProperties: number;
  totalBookings: number;
  monthlyRevenue: number;
}

const HostDashboard = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<HostStats>({
    totalProperties: 0,
    activeProperties: 0,
    totalBookings: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadHostData();
  }, []);

  const loadHostData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get host profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile?.is_host || !profile?.host_approved) {
        toast({
          title: "Åtkomst nekad",
          description: "Du måste vara en godkänd värd för att komma åt denna sida.",
          variant: "destructive"
        });
        return;
      }

      // Load properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('*')
        .eq('host_id', profile.id)
        .order('created_at', { ascending: false });

      if (propertiesData) {
        setProperties(propertiesData);
        
        // Calculate stats
        const totalProperties = propertiesData.length;
        const activeProperties = propertiesData.filter(p => p.active).length;
        
        setStats({
          totalProperties,
          activeProperties,
          totalBookings: 0, // TODO: Calculate from bookings
          monthlyRevenue: 0 // TODO: Calculate from bookings
        });
      }
    } catch (error) {
      console.error('Error loading host data:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda värddata",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePropertyStatus = async (propertyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ active: !currentStatus })
        .eq('id', propertyId);

      if (error) throw error;

      setProperties(prev => 
        prev.map(p => 
          p.id === propertyId ? { ...p, active: !currentStatus } : p
        )
      );

      toast({
        title: "Uppdaterat",
        description: `Fastighet ${!currentStatus ? 'aktiverad' : 'inaktiverad'}`,
      });
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera fastighet",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Laddar värdpanel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="villa-container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Värdpanel</h1>
            <p className="text-muted-foreground">Hantera dina fastigheter och bokningar</p>
          </div>
          <Link to="/host/property/new">
            <Button size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Lägg till fastighet
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totala fastigheter</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktiva fastigheter</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProperties}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totala bokningar</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Månatlig intäkt</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyRevenue} SEK</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList>
            <TabsTrigger value="properties">Fastigheter</TabsTrigger>
            <TabsTrigger value="bookings">Bokningar</TabsTrigger>
            <TabsTrigger value="calendar">Kalender</TabsTrigger>
            <TabsTrigger value="settings">Inställningar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="properties" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {properties.map((property) => (
                <Card key={property.id} className="villa-card">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{property.title}</CardTitle>
                      <div className="flex gap-2">
                        {property.pending_approval && (
                          <Badge variant="secondary">Väntar godkännande</Badge>
                        )}
                        <Badge variant={property.active ? "default" : "secondary"}>
                          {property.active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{property.location}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {property.hero_image_url && (
                      <img 
                        src={property.hero_image_url} 
                        alt={property.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    )}
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {property.max_guests}
                      </div>
                      <div className="flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        {property.bedrooms}
                      </div>
                      <div className="text-right font-semibold">
                        {property.price_per_night} {property.currency}/natt
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => togglePropertyStatus(property.id, property.active)}
                      >
                        {property.active ? "Inaktivera" : "Aktivera"}
                      </Button>
                      <Link to={`/host/property/${property.id}/edit`}>
                        <Button size="sm" variant="outline">
                          Redigera
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {properties.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <Home className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Inga fastigheter än</h3>
                  <p className="text-muted-foreground mb-4">
                    Lägg till din första fastighet för att börja ta emot bokningar
                  </p>
                  <Link to="/host/property/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till fastighet
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Bokningar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Bokningshantering kommer snart...</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle>Tillgänglighetskalender</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Kalenderhantering kommer snart...</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Värdinställningar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Inställningar kommer snart...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HostDashboard;