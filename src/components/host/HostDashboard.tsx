// @ts-nocheck
import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2, DollarSign, Calendar, Plus, HelpCircle, BookOpen, Trash2, Check, X, Search, Wallet, Sparkles, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useHostProperties } from "@/hooks/useHostProperties";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookingChatList } from "../BookingChatList";
import MainNavigation from "@/components/MainNavigation";
import PropertyCard, { PropertyCardData } from "@/components/PropertyCard";
import HostGuidebookDialog from "./HostGuidebookDialog";
import { HostPropertyEditor } from "./HostPropertyEditor";
import { HostInvitationDialog } from "./HostInvitationDialog";
import { BankAccountSetup } from "@/components/admin/BankAccountSetup";
import { HostAnalytics } from "./HostAnalytics";
import { HostTaxReport } from "./HostTaxReport";

// Lazy-load v2 components
const TodayWidget = lazy(() => import("@/components/admin/TodayWidget"));
const ExpenseManagement = lazy(() => import("@/components/admin/ExpenseManagement"));
const CleaningManagement = lazy(() => import("@/components/admin/CleaningManagement"));
const RevenueByChannel = lazy(() => import("@/components/admin/RevenueByChannel"));
const ProfitabilityView = lazy(() => import("@/components/admin/ProfitabilityView"));
const OccupancyTrend = lazy(() => import("@/components/admin/OccupancyTrend"));

const TabFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

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
  source?: string;
  created_at: string;
  properties: {
    title: string;
    host_id: string;
    currency?: string;
    hero_image_url?: string;
  };
}

const statusColors: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  pending_approval: "bg-orange-100 text-orange-800",
};

const sourceColors: Record<string, string> = {
  airbnb: "bg-rose-100 text-rose-800",
  booking_com: "bg-blue-100 text-blue-800",
  direct: "bg-green-100 text-green-800",
  blocked: "bg-gray-100 text-gray-600",
};

// Wrapper: använder PropertyCard men lägger till Edit-knapp
const HostPropertyCard = ({
  property,
  onEdit,
  onDelete,
}: {
  property: PropertyCardData;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="relative">
      <PropertyCard property={property} />
      <div className="absolute top-2 right-2 flex gap-2">
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
        <Button
          size="sm"
          variant="destructive"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(property.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
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
  const [pricingPropertyId, setPricingPropertyId] = useState<string | null>(null);
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [isGuidebookOpen, setIsGuidebookOpen] = useState(false);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  const [hostProfileId, setHostProfileId] = useState<string | null>(null);

  const { properties, refetch: refetchProperties } = useHostProperties();

  const fetchHostStats = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {

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
      setHostProfileId(profile.id);

      const { count: propertiesCount } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true })
        .eq("host_id", profile.id);

      // Fetch commission rate from platform_settings
      const { data: settingsData } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "commission_rate")
        .single();

      // Default to 0.9 (10% commission) if not found
      const commissionMultiplier = settingsData?.setting_value?.rate ?? 0.9;

      // Fetch bookings with source field for channel tracking
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id, guest_name, guest_email, check_in_date, check_out_date,
          total_amount, status, source, created_at,
          properties!inner(title, host_id, currency, hero_image_url)
        `
        )
        .eq("properties.host_id", profile.id)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      const totalBookings = bookingsData?.length || 0;
      const pendingBookings = (bookingsData || []).filter(
        (b) => b.status === "pending" || b.status === "pending_approval"
      ).length;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyBookings = (bookingsData || []).filter(
        (b) => b.status === "confirmed" && b.created_at.startsWith(currentMonth)
      );
      // Revenue in öre → divide by 100, apply commission
      const monthlyRevenue = monthlyBookings.reduce((sum, booking) => {
        return sum + (booking.total_amount / 100) * commissionMultiplier;
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
          property_type: "Property",
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

  const deleteProperty = async () => {
    if (!deletingPropertyId || !user) return;
    try {
      // Get the current host's profile ID for ownership verification
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast.error("Unable to verify ownership. Please try again.");
        return;
      }

      // BUG-011: Check for active or upcoming bookings before deletion
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select("id, status, check_out_date", { count: "exact", head: true })
        .eq("property_id", deletingPropertyId)
        .in("status", ["pending", "confirmed"])
        .gte("check_out_date", new Date().toISOString());

      if (activeBookings && activeBookings.length > 0) {
        toast.error(
          "Cannot delete property with active or upcoming bookings. Please cancel or complete all bookings first."
        );
        return;
      }

      // BUG-003: Add host_id ownership filter to prevent cross-host deletion
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", deletingPropertyId)
        .eq("host_id", profile.id);

      if (error) throw error;
      toast.success("Property deleted successfully");
      setDeletingPropertyId(null);
      refetchProperties();
      fetchHostStats();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
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
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Host Dashboard</h1>
              <p className="text-muted-foreground text-lg">Manage your properties and bookings</p>
            </div>
            <Button 
              variant="default" 
              size="lg"
              onClick={() => setIsGuidebookOpen(true)}
              className="flex items-center gap-2"
            >
              <BookOpen className="w-5 h-5" />
              Host Guidebook
            </Button>
          </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="container mx-auto px-4 py-8">
          {/* Today Widget */}
          <div className="mb-6">
            <Suspense fallback={<TabFallback />}>
              <TodayWidget
                checkIns={bookings.filter(b => b.check_in_date === new Date().toISOString().split('T')[0] && b.status === 'confirmed').map(b => ({ id: b.id, guest_name: b.guest_name, property_title: b.properties?.title || '' }))}
                checkOuts={bookings.filter(b => b.check_out_date === new Date().toISOString().split('T')[0] && b.status === 'confirmed').map(b => ({ id: b.id, guest_name: b.guest_name, property_title: b.properties?.title || '' }))}
                cleaningTasks={[]}
              />
            </Suspense>
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
                  {Math.round(stats.monthly_revenue).toLocaleString("sv-SE")} kr
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
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="cleaning" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Cleaning
              </TabsTrigger>
              <TabsTrigger value="financials" className="flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Financials
              </TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="tax">Tax Report</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-6">
              {hostProfileId ? (
                <HostAnalytics hostId={hostProfileId} />
              ) : (
                <p className="text-muted-foreground">Loading analytics...</p>
              )}
            </TabsContent>

            <TabsContent value="tax" className="space-y-6">
              <HostTaxReport />
            </TabsContent>

            <TabsContent value="payouts" className="space-y-6">
              <BankAccountSetup />
            </TabsContent>

            <TabsContent value="properties" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your Properties</h2>
                <div className="flex gap-2">
                  <HostInvitationDialog />
                  <Button onClick={createNewProperty} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Property
                  </Button>
                </div>
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
                        amenities: Array.isArray(p.amenities) ? p.amenities : [],
                        featured_amenities: Array.isArray(p.featured_amenities) ? p.featured_amenities : [],
                        special_amenities: Array.isArray(p.special_amenities) ? p.special_amenities : [],
                        amenities_data: Array.isArray(p.amenities_data) ? p.amenities_data : [],
                      }}
                      onEdit={setEditingPropertyId}
                      onDelete={setDeletingPropertyId}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <BookingChatList />
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6">
              <HostBookingsTab bookings={bookings} onStatusChange={fetchHostStats} />
            </TabsContent>

            {/* V2: Cleaning Tab */}
            <TabsContent value="cleaning" className="space-y-6">
              <Suspense fallback={<TabFallback />}>
                <CleaningManagement />
              </Suspense>
            </TabsContent>

            {/* V2: Financials Tab */}
            <TabsContent value="financials" className="space-y-6">
              <Tabs defaultValue="expenses" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue by Channel</TabsTrigger>
                  <TabsTrigger value="profit">Profitability</TabsTrigger>
                  <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
                </TabsList>
                <Suspense fallback={<TabFallback />}>
                  <TabsContent value="expenses"><ExpenseManagement /></TabsContent>
                  <TabsContent value="revenue"><RevenueByChannel /></TabsContent>
                  <TabsContent value="profit"><ProfitabilityView /></TabsContent>
                  <TabsContent value="occupancy"><OccupancyTrend /></TabsContent>
                </Suspense>
              </Tabs>
            </TabsContent>

          </Tabs>

          {editingPropertyId && (() => {
            const property = properties.find(p => p.id === editingPropertyId);
            return property ? (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
                <div className="container mx-auto py-8">
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" onClick={() => setEditingPropertyId(null)}>
                      Close
                    </Button>
                  </div>
                  <HostPropertyEditor
                    propertyId={editingPropertyId}
                    propertyTitle={property.title}
                    preparationDays={property.preparation_days || 0}
                    basePrice={property.price_per_night}
                    currency={property.currency || 'SEK'}
                    onUpdate={() => {
                      refetchProperties();
                      fetchHostStats();
                    }}
                  />
                </div>
              </div>
            ) : null;
          })()}

          <HostGuidebookDialog
            isOpen={isGuidebookOpen}
            onClose={() => setIsGuidebookOpen(false)}
          />

          {/* Delete Confirmation */}
          <AlertDialog open={!!deletingPropertyId} onOpenChange={(open) => !open && setDeletingPropertyId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Property</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this property? This action cannot be undone.
                  <br />
                  <br />
                  Important: Any active or upcoming bookings must be cancelled first. Availability records and reviews associated with this property will also be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteProperty} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </div>
  );
};

// Enhanced bookings tab with filters, pagination, and approve/reject
const HostBookingsTab = ({ bookings, onStatusChange }: { bookings: Booking[]; onStatusChange: () => void }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const filtered = bookings.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.guest_name?.toLowerCase().includes(q) ||
        b.properties?.title?.toLowerCase().includes(q) ||
        b.guest_email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleApprove = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);
      if (error) throw error;
      toast.success("Booking approved");
      onStatusChange();
    } catch {
      toast.error("Failed to approve booking");
    }
  };

  const handleReject = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);
      if (error) throw error;
      toast.success("Booking rejected");
      onStatusChange();
    } catch {
      toast.error("Failed to reject booking");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Bookings ({filtered.length})</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guest or property..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-9 w-48"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="pending_approval">Needs Approval</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {paginated.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No bookings match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginated.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-semibold">{booking.properties.title}</h3>
                    <p className="text-sm text-muted-foreground">{booking.guest_name} · {booking.guest_email}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.check_in_date).toLocaleDateString("sv-SE")} → {new Date(booking.check_out_date).toLocaleDateString("sv-SE")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.source && (
                      <Badge variant="outline" className={sourceColors[booking.source] || ""}>
                        {booking.source === "booking_com" ? "Booking.com" : booking.source}
                      </Badge>
                    )}
                    <Badge variant="outline" className={statusColors[booking.status] || ""}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {(booking.total_amount / 100).toLocaleString("sv-SE")} {booking.properties.currency || "SEK"}
                    </p>
                  </div>
                  {(booking.status === "pending" || booking.status === "pending_approval") && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-green-700" onClick={() => handleApprove(booking.id)}>
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-700" onClick={() => handleReject(booking.id)}>
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground self-center">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;
