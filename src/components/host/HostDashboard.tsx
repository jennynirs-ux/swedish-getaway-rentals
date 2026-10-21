import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Wallet, Calendar, CalendarCheck, Plus, HelpCircle, BookOpen, Trash2, Receipt, BarChart3, Copy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHostProperties } from "@/hooks/useHostProperties";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import MainNavigation from "@/components/MainNavigation";
import PropertyCard, { PropertyCardData } from "@/components/PropertyCard";
import HostGuidebookDialog from "./HostGuidebookDialog";
import { HostPropertyEditor } from "./HostPropertyEditor";
import { HostInvitationDialog } from "./HostInvitationDialog";
import { BankAccountSetup, HOST_CHARGES_KEY, useHostCharges } from "@/components/admin/BankAccountSetup";
import HostExpenses from "./HostExpenses";
import HostRevenueByChannel from "./HostRevenueByChannel";
import HostProfitability from "./HostProfitability";
import { HostTaxReport } from "./HostTaxReport";
import { HOST_PAYOUT_TIMING_TEXT, stockholmDate } from "@/lib/constants";
// What the host keeps of a booking: the same rule as the Financials tabs and the tax report
import { hostNetAmount, hostShareAmount, type HostPayoutStatus } from "../../../supabase/functions/_shared/payout";
import { chargesTakenFrom, formatDay, formatSek, hostPayoutText, nextPayoutId } from "@/lib/hostDashboard";
import OccupancyTrend from "@/components/analytics/OccupancyTrend";
import KeyMetrics from "@/components/analytics/KeyMetrics";
import HostPropertyWizard from "./HostPropertyWizard";
import HostOnboardingChecklist, {
  HOST_CHECKLIST_KEY,
  HostTermsAcceptance,
  isOnlyRentedHere,
  markOnlyRentedHere,
  publishBlocker,
} from "./HostOnboardingChecklist";
import HostPricingSuggestions from "./HostPricingSuggestions";
import HostUnifiedInbox from "./HostUnifiedInbox";
import HostMessageTemplates from "./HostMessageTemplates";

interface HostStats {
  total_properties: number;
  total_bookings: number;
  /** What the host keeps from stays checking in this month (Swedish time), in SEK */
  monthly_revenue: number;
  upcoming_stays: number;
}

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  check_in_date: string;
  check_out_date: string;
  /** What the guest paid, in öre (host price + guest service fee) */
  total_amount: number;
  /** The host's price, in öre */
  host_amount?: number | null;
  service_fee?: number | null;
  refunded_amount?: number | null;
  status: string;
  created_at: string;
  cancelled_at?: string | null;
  cancelled_by?: "guest" | "host" | "platform" | null;
  host_payout_status?: HostPayoutStatus | null;
  host_payout_due_on?: string | null;
  host_paid_out_at?: string | null;
  host_reversed_amount?: number | null;
  stripe_payment_intent_id?: string | null;
  properties: {
    title: string;
    host_id: string;
    currency?: string;
    hero_image_url?: string;
  };
}

// Started checkouts that were never paid are not bookings for the host
const UNPAID_STATUSES = ["pending", "payment_pending"];

/** What the host keeps of a booking, in öre (hostNetAmount: refunds, cancellations) */
const hostNet = (b: Booking) => hostNetAmount(b);

const cancelledByText = { guest: "by the guest", host: "by you", platform: "by Nordic Getaways" } as const;

/**
 * This listing's own calendar link (export-ical), for the host to paste into
 * Airbnb or Booking.com so dates booked here are blocked there too. The same
 * link as in the editor's Calendar tab.
 */
const CalendarExportLink = ({ propertyId }: { propertyId: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("property_private_details")
      .select("ical_export_secret")
      .eq("property_id", propertyId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.ical_export_secret) return;
        const base = import.meta.env.VITE_SUPABASE_URL || "https://bbuutvozqfzbsnllsiai.supabase.co";
        setUrl(`${base}/functions/v1/export-ical/${propertyId}?secret=${data.ical_export_secret}`);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (!url) return null;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">Your calendar link for Airbnb and Booking.com</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          aria-label="Your calendar link"
          className="min-w-0 flex-1 rounded-md border bg-muted px-2 py-1 text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            navigator.clipboard.writeText(url).then(
              () => toast.success("Calendar link copied"),
              () => toast.error("Could not copy. Select the link and copy it by hand."),
            )
          }
        >
          <Copy className="h-4 w-4 mr-1" />
          Copy
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste it as an imported calendar there, and add theirs in this listing's Calendar tab.
      </p>
    </div>
  );
};

// Wrapper: använder PropertyCard men lägger till Edit-knapp
const HostPropertyCard = ({
  property,
  live,
  onEdit,
  onDelete,
  onTogglePublish,
  busy = false,
}: {
  property: PropertyCardData;
  live: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, publish: boolean) => void;
  /** Publishing or unpublishing is running */
  busy?: boolean;
}) => {
  return (
    <div className="relative">
      <PropertyCard property={property} />
      <div className="absolute top-2 left-2">
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            live ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {live ? "Live" : "Draft"}
        </span>
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          size="sm"
          variant={live ? "secondary" : "default"}
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePublish(property.id, !live);
          }}
        >
          {live ? "Unpublish" : "Publish"}
        </Button>
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
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<HostStats>({
    total_properties: 0,
    total_bookings: 0,
    monthly_revenue: 0,
    upcoming_stays: 0,
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  // The editor tab to open on, e.g. Location when publishing needs a pin and county
  const [editingTab, setEditingTab] = useState("basic");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [searchParams] = useSearchParams();
  // ?tab=payouts: where Stripe sends the host back after onboarding
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "properties");
  const [isGuidebookOpen, setIsGuidebookOpen] = useState(false);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  // Publishing that waits for an answer: no calendar sync yet, or host terms not accepted
  const [calendarCheckId, setCalendarCheckId] = useState<string | null>(null);
  const [termsForId, setTermsForId] = useState<string | null>(null);
  // One publish at a time: a double click must not publish twice. The ref
  // answers at once; the state disables the buttons.
  const publishingRef = useRef(false);
  const [publishing, setPublishing] = useState(false);
  // The editor reports unsaved edits, so Close can ask first
  const editorDirtyRef = useRef(false);
  const { data: openCharges = [] } = useHostCharges();

  const { properties, refetch: refetchProperties } = useHostProperties();

  const refreshChecklist = () => queryClient.invalidateQueries({ queryKey: HOST_CHECKLIST_KEY });

  const openEditor = (propertyId: string, tab = "basic") => {
    setEditingTab(tab);
    setEditingPropertyId(propertyId);
  };

  const fetchHostStats = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        navigate("/auth?redirect=/host-dashboard");
        return;
      }

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

      // The secure view masks guest contact details until shortly before arrival,
      // and carries what the host receives and when it is paid out
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings_secure")
        .select(
          `
          *,
          properties!inner(title, host_id, currency, hero_image_url)
        `
        )
        .eq("properties.host_id", profile.id)
        .order("created_at", { ascending: false });

      if (bookingsError) {
        console.error("Bookings query error:", bookingsError.message);
        // Try fallback to regular bookings table
        const { data: fallbackBookings } = await supabase
          .from("bookings")
          .select("*, properties!inner(title, host_id, currency, hero_image_url)")
          .eq("properties.host_id", profile.id)
          .order("created_at", { ascending: false });
        if (fallbackBookings) {
          setBookings(
            (fallbackBookings as unknown as Booking[]).filter((b) => !UNPAID_STATUSES.includes(b.status)),
          );
        }
        setLoading(false);
        return;
      }

      const paid = ((bookingsData || []) as unknown as Booking[]).filter((b) => !UNPAID_STATUSES.includes(b.status));
      const today = stockholmDate();
      const currentMonth = today.slice(0, 7);
      // Same basis and rule as the Financials tabs: stays checking in this month
      // (check-in dates are Swedish dates), counting what the host keeps: their
      // price without the guest service fee, less refunds; a late cancellation
      // can still leave the host part of their price.
      const monthlyRevenue = paid
        .filter((b) => b.check_in_date?.startsWith(currentMonth))
        .reduce((sum, booking) => sum + hostNet(booking) / 100, 0);
      const upcomingStays = paid.filter((b) => b.status === "confirmed" && b.check_in_date >= today).length;

      setStats({
        total_properties: propertiesCount || 0,
        total_bookings: paid.filter((b) => b.status !== "cancelled").length,
        monthly_revenue: monthlyRevenue,
        upcoming_stays: upcomingStays,
      });

      setBookings(paid);
      queryClient.invalidateQueries({ queryKey: HOST_CHARGES_KEY });
    } catch (error) {
      console.error("Error fetching host stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async () => {
    if (!deletingPropertyId) return;
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', deletingPropertyId);
      if (error) {
        // Bookings keep a property from being deleted (foreign key restrict)
        if (error.code === "23503") {
          toast.error("This property has bookings, so it can't be deleted. Unpublish it instead.");
          setDeletingPropertyId(null);
          return;
        }
        throw error;
      }
      toast.success("Property deleted successfully");
      setDeletingPropertyId(null);
      refetchProperties();
      fetchHostStats();
      refreshChecklist();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    }
  };

  /** Runs one publish/unpublish at a time; a second click while one runs is ignored */
  const exclusive = async (run: () => Promise<void>) => {
    if (publishingRef.current) return;
    publishingRef.current = true;
    setPublishing(true);
    try {
      await run();
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  };

  // Hosts publish their own listings. The database (prevent_self_publish) decides:
  // working payouts, a map pin and county, and accepted host terms.
  // (No e-mail to the team from here: send-support-email also answers the host
  // "we received your message". A listing-published notice needs its own function.)
  const publish = (id: string) => exclusive(() => publishNow(id));

  const publishNow = async (id: string) => {
    const { error } = await supabase.from("properties").update({ active: true }).eq("id", id);
    if (error) {
      const blocker = publishBlocker(error.message);
      if (blocker === "terms") {
        toast.error("Accept the host terms first.");
        setTermsForId(id);
      } else if (blocker === "bank") {
        toast.error("Connect your bank account before publishing, so you can be paid for bookings.");
        setEditingPropertyId(null);
        setActiveTab("payouts");
      } else if (blocker === "location") {
        toast.error("Pin your place on the map and choose its county before publishing: open the Location tab.");
        openEditor(id, "location");
      } else {
        toast.error(`Could not publish: ${error.message}`);
      }
      refreshChecklist();
      return;
    }
    toast.success("Published! Guests can now find and book your place.");
    refetchProperties();
    refreshChecklist();
  };

  // Both Publish buttons (card and checklist) come here. A listing that is
  // also on Airbnb etc. without a synced calendar can be double booked, so
  // ask first; it is a question, not a block.
  const requestPublish = (id: string) =>
    exclusive(async () => {
      if (!isOnlyRentedHere(id)) {
        const { count } = await supabase
          .from("ical_feeds")
          .select("id", { count: "exact", head: true })
          .eq("property_id", id);
        if (!count) {
          setCalendarCheckId(id);
          return;
        }
      }
      await publishNow(id);
    });

  const togglePublish = (id: string, makeLive: boolean) => {
    if (makeLive) {
      requestPublish(id);
      return;
    }
    exclusive(async () => {
      const { error } = await supabase.from("properties").update({ active: false }).eq("id", id);
      if (error) {
        toast.error(`Could not unpublish: ${error.message}`);
        return;
      }
      toast.success("Unpublished. Guests can no longer book it.");
      refetchProperties();
      refreshChecklist();
    });
  };

  const closeEditor = () => {
    if (
      editorDirtyRef.current &&
      !window.confirm("You have changes that are not saved yet. Close the editor without saving them?")
    ) {
      return;
    }
    editorDirtyRef.current = false;
    setEditingPropertyId(null);
    setEditingTab("basic");
  };

  useEffect(() => {
    fetchHostStats();
  }, [navigate]);

  const today = stockholmDate();
  const nextPayout = openCharges.length ? nextPayoutId(bookings, hostNet) : null;

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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MainNavigation />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Host Dashboard</h1>
              <p className="text-muted-foreground text-lg">Manage your properties and bookings</p>
            </div>
            <Button 
              variant="default" 
              size="lg"
              onClick={() => setIsGuidebookOpen(true)}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <BookOpen className="w-5 h-5" />
              Host Guidebook
            </Button>
          </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
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
                  Your income this month
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="What counts as this month's income">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Your price for stays that check in this month, minus any refunds, the same as in Financials.
                        The guest service fee is paid by the guest on top and is not included. Each booking is paid
                        out {HOST_PAYOUT_TIMING_TEXT}.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stats.monthly_revenue).toLocaleString("sv-SE")} SEK
                </div>
                <p className="text-xs text-muted-foreground">By check-in date</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming stays</CardTitle>
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcoming_stays}</div>
              </CardContent>
            </Card>
          </div>

          <HostOnboardingChecklist
            onGoToTab={(tab) => {
              setEditingPropertyId(null);
              setActiveTab(tab);
            }}
            onCreateProperty={() => setWizardOpen(true)}
            onEditProperty={openEditor}
            onPublish={requestPublish}
            publishing={publishing}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Phones: the tab row scrolls on its own instead of widening the page */}
            <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              <TabsList className="w-max">
                <TabsTrigger value="properties">Properties</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="financials" className="flex items-center gap-1">
                  <Receipt className="w-4 h-4" />
                  Financials
                </TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="payouts">Bank Account</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="analytics" className="space-y-6">
              <KeyMetrics scope="host" />
              <OccupancyTrend scope="host" />
              <HostPricingSuggestions />
            </TabsContent>

            <TabsContent value="financials" className="space-y-6">
              <Tabs defaultValue="profitability" className="space-y-4">
                <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                  <TabsList className="w-max">
                    <TabsTrigger value="profitability">Profitability</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue by Channel</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="tax">Tax Report</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="profitability">
                  <HostProfitability />
                </TabsContent>

                <TabsContent value="revenue">
                  <HostRevenueByChannel />
                </TabsContent>

                <TabsContent value="expenses">
                  <HostExpenses />
                </TabsContent>

                <TabsContent value="tax">
                  <HostTaxReport />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="payouts" className="space-y-6">
              <BankAccountSetup />
            </TabsContent>

            <TabsContent value="properties" className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="text-xl font-semibold">Your Properties</h2>
                <div className="flex flex-wrap gap-2">
                  <HostInvitationDialog />
                  <Button onClick={() => setWizardOpen(true)} className="flex items-center gap-2">
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
                      live={!!(p as { active?: boolean }).active}
                      onEdit={(id) => openEditor(id)}
                      onDelete={setDeletingPropertyId}
                      onTogglePublish={togglePublish}
                      busy={publishing}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="messages" className="space-y-6">
              <HostUnifiedInbox />
              <HostMessageTemplates />
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No bookings yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {bookings.slice(0, 20).map((booking) => {
                    const cancelled = booking.status === "cancelled";
                    const net = hostNet(booking);
                    const share = hostShareAmount(booking);
                    const payout = hostPayoutText(
                      {
                        status: booking.status,
                        host_payout_status: booking.host_payout_status,
                        host_payout_due_on: booking.host_payout_due_on,
                        paidOutOn: booking.host_paid_out_at ? stockholmDate(booking.host_paid_out_at) : null,
                      },
                      net,
                      today,
                    );
                    // Open charges (a card fee, a refund after payout) come off the next
                    // payout, the last one in part if the payout is smaller (as the payout job does)
                    const deducted = booking.id === nextPayout ? chargesTakenFrom(openCharges, net, booking.id) : [];
                    const deductedOre = deducted.reduce((sum, c) => sum + c.taken, 0);
                    const deductedInPart = deducted.some((c) => c.taken < c.amount);
                    const refunded = booking.refunded_amount ?? 0;
                    return (
                      <Card key={booking.id}>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                            <div className="min-w-0">
                              <h3 className="font-semibold">{booking.properties.title}</h3>
                              <p className="text-sm text-muted-foreground">Guest: {booking.guest_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDay(booking.check_in_date)} – {formatDay(booking.check_out_date)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {cancelled
                                  ? `Cancelled${booking.cancelled_by ? ` ${cancelledByText[booking.cancelled_by]}` : ""}${
                                      booking.cancelled_at ? ` on ${formatDay(stockholmDate(booking.cancelled_at))}` : ""
                                    }`
                                  : <span className="capitalize">{booking.status}</span>}
                              </p>
                            </div>
                            <div className="sm:text-right">
                              <p className="text-xs text-muted-foreground">You receive</p>
                              <p className="font-semibold text-lg">{formatSek(net)}</p>
                              {cancelled && net !== share && (
                                <p className="text-xs text-muted-foreground">
                                  of {formatSek(share)} before the refund
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Guest paid {formatSek(booking.total_amount)}
                                {refunded > 0 ? `, ${formatSek(refunded)} refunded` : ""}
                              </p>
                              {payout && <p className="text-xs text-muted-foreground">{payout}</p>}
                              {deductedOre > 0 && (
                                <p className="text-xs text-amber-700">
                                  {formatSek(deductedOre)} you owe us is taken from this payout
                                  {deductedInPart ? "; the rest of what you owe comes from your later payouts" : ""} (see
                                  the Bank Account tab)
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

          </Tabs>

          {editingPropertyId && (() => {
            const property = properties.find(p => p.id === editingPropertyId);
            return property ? (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
                <div className="container mx-auto px-4 py-8">
                  <div className="flex justify-end mb-4">
                    <Button variant="outline" onClick={closeEditor}>
                      Close
                    </Button>
                  </div>
                  <HostPropertyEditor
                    key={`${editingPropertyId}-${editingTab}`}
                    propertyId={editingPropertyId}
                    propertyTitle={property.title}
                    initialTab={editingTab}
                    preparationDays={property.preparation_days || 0}
                    basePrice={property.price_per_night}
                    currency={property.currency || 'SEK'}
                    onUpdate={() => {
                      refetchProperties();
                      fetchHostStats();
                      refreshChecklist();
                    }}
                    onDirtyChange={(dirty) => {
                      editorDirtyRef.current = dirty;
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

          <HostPropertyWizard
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            onCreated={(propertyId) => {
              // Next step after the wizard: the map pin
              openEditor(propertyId, "location");
              refetchProperties();
              fetchHostStats();
              refreshChecklist();
            }}
          />

          {/* Publishing a listing that has no synced calendar */}
          <Dialog open={!!calendarCheckId} onOpenChange={(open) => !open && setCalendarCheckId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Is this place also on Airbnb or Booking.com?</DialogTitle>
                <DialogDescription>
                  Bookings here are confirmed instantly. If guests can also book this place elsewhere, link those
                  calendars first (in the listing's Calendar tab), so nobody can book the same night twice.
                </DialogDescription>
              </DialogHeader>
              {calendarCheckId && <CalendarExportLink propertyId={calendarCheckId} />}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => {
                    const id = calendarCheckId;
                    setCalendarCheckId(null);
                    if (id) openEditor(id, "calendar");
                  }}
                >
                  Add calendar links
                </Button>
                <Button
                  onClick={() => {
                    const id = calendarCheckId;
                    setCalendarCheckId(null);
                    if (!id) return;
                    markOnlyRentedHere(id);
                    publish(id);
                  }}
                >
                  I only rent it here: publish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Publishing was refused because the host terms are not accepted yet */}
          <Dialog open={!!termsForId} onOpenChange={(open) => !open && setTermsForId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Accept the host terms first</DialogTitle>
                <DialogDescription>
                  They cover the guest service fee, when you are paid out, cancellations and refunds.
                </DialogDescription>
              </DialogHeader>
              <HostTermsAcceptance
                idSuffix="publish"
                onAccepted={() => {
                  const id = termsForId;
                  setTermsForId(null);
                  refreshChecklist();
                  if (id) publish(id);
                }}
              />
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deletingPropertyId} onOpenChange={(open) => !open && setDeletingPropertyId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Property</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this property? This action cannot be undone and will remove all associated data.
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

export default HostDashboard;
