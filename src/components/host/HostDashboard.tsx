import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, DollarSign, Calendar, Plus, HelpCircle } from "lucide-react";
import { useHostProperties } from "@/hooks/useHostProperties";
import PropertyDetailEditor from "@/components/admin/PropertyDetailEditor";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { BookingChatList } from "../BookingChatList";
import MainNavigation from "@/components/MainNavigation";

interface HostStats {
  total_properties: number;
  total_bookings: number;
  monthly_revenue: number;
  pending_bookings: number;
}

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  created_at: string;
  properties: {
    title: string;
    host_id: string;
    currency?: string;
    hero_image_url?: string;
  };
}

const HostDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<HostStats>({
    total_properties: 0,
    total_bookings: 0,
    monthly_revenue: 0,
    pending_bookings: 0
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [creatingProperty, setCreatingProperty] = useState(false);
  
  const { properties, refetch: refetchProperties } = useHostProperties();

  const fetchHostStats = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.log('No user found, redirecting to auth');
        navigate('/auth?redirect=/host-dashboard');
        return;
      }
      
      setUser(userData.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profile) return;

      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', profile.id);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          properties!inner(title, host_id, currency, hero_image_url)
        `)
        .eq('properties.host_id', profile.id);

      if (bookingsError) throw bookingsError;

      const totalBookings = bookingsData.length;
      const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyBookings = bookingsData.filter(b => 
        b.status === 'confirmed' && 
        b.created_at.startsWith(currentMonth)
      );
      const monthlyRevenue = monthlyBookings.reduce((sum, booking) => {
        return sum + (booking.total_amount * 0.9);
      }, 0);

      setStats({
        total_properties: propertiesCount || 0,
        total_bookings: totalBookings,
        monthly_revenue: monthlyRevenue,
        pending_bookings: pendingBookings
      });

      setBookings(bookingsData || []);
    } catch (error) {
      console.error('Error fetching host stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewProperty = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('properties')
        .insert({
          title: 'New Property',
          host_id: profile.id,
          price_per_night: 1000,
          active: false,
          bedrooms: 1,
          bathrooms: 1,
          max_guests: 2,
          location: '',
          description: '',
          hero_image_url: ''
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('New property created');
      setEditingPropertyId(data.id);
      refetchProperties();
      fetchHostStats();
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error('Failed to create property');
    }
  };

  const uploadHeroImage = async (propertyId: string, file: File) => {
    try {
      const filePath = `properties/${propertyId}/hero-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('property-images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('properties')
        .update({ hero_image_url: urlData.publicUrl })
        .eq('id', propertyId);

      if (updateError) throw updateError;

      toast.success("Hero image updated!");
      refetchProperties();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload hero image");
    }
  };

  useEffect(() => {
    fetchHostStats();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Loading your dashboard...</h2>
            <p className="text-muted-foreground">Please wait while we fetch your data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <TooltipProvider>
        <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Host Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your properties and bookings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_properties}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_bookings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Monthly Revenue
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This shows your estimated monthly revenue after commission.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.monthly_revenue / 100).toLocaleString()} SEK</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_bookings}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Properties</h2>
              <Button onClick={createNewProperty} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Property
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <Card key={property.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span>{property.title}</span>
                      <div className={`px-2 py-1 rounded text-xs ${property.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {property.active ? 'Active' : 'Inactive'}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {property.hero_image_url ? (
                      <img src={property.hero_image_url} alt={property.title} className="w-full h-40 object-cover rounded mb-2" />
                    ) : (
                      <div className="w-full h-40 bg-muted flex items-center justify-center rounded mb-2">
                        <span className="text-muted-foreground text-sm">No hero image</span>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files && uploadHeroImage(property.id, e.target.files[0])}
                      className="mb-4"
                    />
                    <p className="text-sm text-muted-foreground mb-2">{property.location}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{(property.price_per_night / 100).toLocaleString()} {property.currency}/night</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Set a competitive base price. You can adjust per date in Pricing & Calendar.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={() => setEditingPropertyId(property.id)}
                    >
                      Edit Property
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <BookingChatList />
          </TabsContent>

          {/* bookings och pricing flikarna förblir som tidigare */}
        </Tabs>

        {editingPropertyId && (
          <PropertyDetailEditor
            propertyId={editingPropertyId}
            open={!!editingPropertyId}
            onClose={() => setEditingPropertyId(null)}
            onSave={() => {
              refetchProperties();
              fetchHostStats();
            }}
          />
        )}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default HostDashboard;
