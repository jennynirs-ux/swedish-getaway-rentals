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
import { BookingChatList } from "../BookingChatList";
import MainNavigation from "@/components/MainNavigation";
import PropertyCard, { PropertyCardData } from "@/components/PropertyCard";

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

// Wrapper: använder PropertyCard men lägger till Edit-knapp
const HostPropertyCard = ({
  property,
  onEdit,
}: {
  property: PropertyCardData;
  onEdit: (id: string) => void;
}) => {
  return (
    <div className="relative">
      <PropertyCard property={property} />
      <div className="absolute top-2 right-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(property.id);
          }}
        >
          Edit
        </Button>
      </div>
    </div>
  );
};

const HostDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<HostStats>({
    total_properties: 0,
    total_bookings: 0,
    monthly_revenue: 0,
    pending_bookings: 0,
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
        console.log("No user found, redirecting to auth");
        navigate("/auth?redirect=/host-dashboard");
        return;
      }

      setUser(userData.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (!profile) return;

      const { count: propertiesCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("host_id", profile.id);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          properties!inner(title, host_id, currency, hero_image_url)
        `
        )
        .eq("properties.host_id", profile.id);

      if (bookingsError) throw bookingsError;

      const totalBookings = bookingsData.length;
      const pendingBookings = bookingsData.filter((b) => b.status === "pending").length;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyBookings = bookingsData.filter(
        (b) => b.status === "confirmed" && b.created_at.startsWith(currentMonth)
      );
      const monthlyRevenue = monthlyBookings.reduce((sum, booking) => {
        return sum + booking.total_amount * 0.9;
      }, 0);

      setStats({
        total_properties: propertiesCount || 0,
        total_bookings: totalBookings,
        monthly_revenue: monthlyRevenue,
        pending_bookings: pendingBookings,
      });

      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error fetching host stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const createNewProperty = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from("properties")
        .insert({
          title: "New Property",
          host_id: profile.id,
          price_per_night: 1000,
          active: false,
          bedrooms: 1,
          bathrooms: 1,
          max_guests: 2,
          location: "",
          description: "",
          hero_image_url: "",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("New property created");
      setEditingPropertyId(data.id);
      refetchProperties();
      fetchHostStats();
    } catch (error) {
      console.error("Error creating property:", error);
      toast.error("Failed to create property");
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
            <p className="text-muted-foreground mt-2">Manage your properties and bookings</p>
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
                <div className="text-2xl font-bold">
                  {Math.round(stats.monthly_revenue).toLocaleString()} SEK
                </div>
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

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {properties.length === 0 ? (
                  <div className="text-center py-16 col-span-full">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No properties yet
                    </h3>
                    <p className="text-muted-foreground">
                      Create your first property to get started.
                    </p>
                  </div>
                ) : (
                  properties.map((p: PropertyCardData) => (
                    <HostPropertyCard
                      key={p.id}
                      property={{
                        ...p,
                        hero_image_url: p.hero_image_url || "/placeholder.jpg",
                        description: p.description || "",
                        currency: p.currency || "SEK",
                      }}
                      onEdit={setEditingPropertyId}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <BookingChatList />
            </TabsContent>

            {/* bookings och pricing flikarna kan behållas som de är */}
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
