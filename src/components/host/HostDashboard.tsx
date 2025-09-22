import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, DollarSign, Calendar, Plus } from "lucide-react";
import { useHostProperties } from "@/hooks/useHostProperties";
import PropertyDetailEditor from "@/components/admin/PropertyDetailEditor";
import { toast } from "sonner";

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
  };
}

const HostDashboard = () => {
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
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile) return;

      // Get properties count
      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', profile.id);

      // Get bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          properties!inner(title, host_id)
        `)
        .eq('properties.host_id', profile.id);

      if (bookingsError) throw bookingsError;

      const totalBookings = bookingsData.length;
      const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;
      
      // Calculate monthly revenue (current month)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyBookings = bookingsData.filter(b => 
        b.status === 'confirmed' && 
        b.created_at.startsWith(currentMonth)
      );
      const monthlyRevenue = monthlyBookings.reduce((sum, booking) => {
        // Apply host commission (90% default)
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
          active: false, // Start as inactive until properly configured
          bedrooms: 1,
          bathrooms: 1,
          max_guests: 2,
          location: '',
          description: ''
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

  useEffect(() => {
    fetchHostStats();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
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
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.monthly_revenue / 100).toLocaleString()} SEK</div>
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
                  <p className="text-sm text-muted-foreground mb-4">{property.location}</p>
                  <p className="font-semibold">{(property.price_per_night / 100).toLocaleString()} SEK/night</p>
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

        <TabsContent value="pricing" className="space-y-6">
          <h2 className="text-xl font-semibold">Pricing Management</h2>
          {properties.length > 0 ? (
            <div className="space-y-6">
              {properties.map((property) => (
                <Card key={property.id}>
                  <CardHeader>
                    <CardTitle>{property.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => setEditingPropertyId(property.id)}
                      className="mb-4"
                    >
                      Manage Pricing & Calendar
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Base price: {(property.price_per_night / 100).toLocaleString()} SEK/night
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No properties found. Create a property first.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <h2 className="text-xl font-semibold">Recent Bookings</h2>
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{booking.properties.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {booking.guest_name} • {booking.guest_email}
                      </p>
                      <p className="text-sm">
                        {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{(booking.total_amount / 100).toLocaleString()} SEK</p>
                      <div className={`px-2 py-1 rounded text-xs ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Property Editor Dialog */}
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
  );
};

export default HostDashboard;