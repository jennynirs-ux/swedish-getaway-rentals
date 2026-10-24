import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Wallet, Calendar, CalendarCheck, Plus, HelpCircle, BookOpen, Trash2, Receipt, BarChart3 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { stockholmDate } from "@/lib/constants";
// What the host keeps of a booking: the same rule as the Financials tabs and the tax report
import { hostNetAmount, hostShareAmount, type HostPayoutStatus } from "../../../supabase/functions/_shared/payout";
import { HOST_PAYOUT_TIMING_SV, chargesTakenFrom, formatDay, formatSek, hostPayoutText, nextPayoutId } from "@/lib/hostDashboard";
import OccupancyTrend from "@/components/analytics/OccupancyTrend";
import KeyMetrics from "@/components/analytics/KeyMetrics";
import HostPropertyWizard from "./HostPropertyWizard";
import { HostTaxDetails } from "./HostTaxDetails";
import HostOnboardingChecklist, { HOST_CHECKLIST_KEY, publishBlocker } from "./HostOnboardingChecklist";
import { HostPublishDialog } from "./HostPublishDialog";
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
  /** Extras the guest added when booking, as charged (öre) */
  extras?: { id: string; name: string; amount: number }[] | null;
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

const cancelledByText = { guest: "av gästen", host: "av dig", platform: "av Nordic Getaways" } as const;

// Booking statuses (DB values) as the host reads them; an unknown one is shown as stored
const statusText: Record<string, string> = {
  confirmed: "Bekräftad",
  completed: "Genomförd",
  pending: "Väntar",
  refunded: "Återbetald",
  expired: "Utgången",
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
          {live ? "Publicerad" : "Utkast"}
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
          {live ? "Avpublicera" : "Publicera"}
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
          Redigera
        </Button>
        <Button
          size="sm"
          variant="destructive"
          aria-label="Ta bort boendet"
          title="Ta bort"
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
  const [searchParams, setSearchParams] = useSearchParams();
  // ?tab=payouts: where Stripe sends the host back after onboarding
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "properties");
  const [isGuidebookOpen, setIsGuidebookOpen] = useState(false);
  const [deletingPropertyId, setDeletingPropertyId] = useState<string | null>(null);
  // The publish window: every step still missing for this listing, in one place
  const [publishId, setPublishId] = useState<string | null>(null);
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

  // Back from Stripe (or a link): ?edit=<id> reopens the listing, ?publish=<id>
  // its publish window; the parameters are then removed, so a reload doesn't repeat it
  useEffect(() => {
    const edit = searchParams.get("edit");
    const publishParam = searchParams.get("publish");
    if (!edit && !publishParam) return;
    if (edit) openEditor(edit, searchParams.get("editTab") || "basic");
    if (publishParam) setPublishId(publishParam);
    const next = new URLSearchParams(searchParams);
    ["edit", "editTab", "publish"].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          toast.error("Boendet har bokningar och kan inte tas bort. Avpublicera det i stället.");
          setDeletingPropertyId(null);
          return;
        }
        throw error;
      }
      toast.success("Boendet är borttaget");
      setDeletingPropertyId(null);
      refetchProperties();
      fetchHostStats();
      refreshChecklist();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Det gick inte att ta bort boendet");
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
  // working payouts, a map pin and county, accepted host terms and tax details.
  // (No e-mail to the team from here: send-support-email also answers the host
  // "we received your message". A listing-published notice needs its own function.)
  /** The publish window's "Publish now"; true when the listing went live */
  const publish = async (id: string) => {
    let ok = false;
    await exclusive(async () => {
      ok = await publishNow(id);
    });
    return ok;
  };

  const publishNow = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("properties").update({ active: true }).eq("id", id);
    if (error) {
      // The window shows the step that is missing; nothing closes
      const blocker = publishBlocker(error.message);
      toast.error(
        blocker === "terms" ? "Godkänn värdvillkoren först."
          : blocker === "bank" ? "Ställ in utbetalningar via Stripe först, så att du kan få betalt för bokningar."
          : blocker === "tax" ? "Lägg till dina skatteuppgifter först. Svensk lag kräver dem."
          : blocker === "location" ? "Sätt ut ditt boende på kartan och välj län först."
          : `Det gick inte att publicera: ${error.message}`,
      );
      refreshChecklist();
      return false;
    }
    toast.success("Publicerad! Nu kan gäster hitta och boka ditt boende.");
    refetchProperties();
    refreshChecklist();
    return true;
  };

  // Every Publish button (card, checklist, editor) opens the publish window
  const requestPublish = (id: string) => setPublishId(id);

  const togglePublish = (id: string, makeLive: boolean) => {
    if (makeLive) {
      requestPublish(id);
      return;
    }
    exclusive(async () => {
      const { error } = await supabase.from("properties").update({ active: false }).eq("id", id);
      if (error) {
        toast.error(`Det gick inte att avpublicera: ${error.message}`);
        return;
      }
      toast.success("Avpublicerad. Gäster kan inte längre boka boendet.");
      refetchProperties();
      refreshChecklist();
    });
  };

  const closeEditor = () => {
    if (
      editorDirtyRef.current &&
      !window.confirm("Du har ändringar som inte är sparade. Vill du stänga utan att spara?")
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
            <h2 className="text-xl font-semibold mb-2">Laddar din värdpanel …</h2>
            <p className="text-muted-foreground">Vänta medan vi hämtar dina uppgifter</p>
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
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Värdpanel</h1>
              <p className="text-muted-foreground text-lg">Hantera dina boenden och bokningar</p>
            </div>
            <Button 
              variant="default" 
              size="lg"
              onClick={() => setIsGuidebookOpen(true)}
              className="flex items-center gap-2 self-start sm:self-auto"
            >
              <BookOpen className="w-5 h-5" />
              Värdguide
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
                <CardTitle className="text-sm font-medium">Boenden</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_properties}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bokningar totalt</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_bookings}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Din inkomst den här månaden
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Vad som räknas som månadens inkomst">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Ditt pris för vistelser med incheckning den här månaden, minus eventuella återbetalningar,
                        samma som under Ekonomi. Serviceavgiften betalar gästen ovanpå, och den ingår inte. Varje
                        bokning betalas ut {HOST_PAYOUT_TIMING_SV}.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stats.monthly_revenue).toLocaleString("sv-SE")} kr
                </div>
                <p className="text-xs text-muted-foreground">Räknat på incheckningsdatum</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kommande vistelser</CardTitle>
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
                <TabsTrigger value="properties">Boenden</TabsTrigger>
                <TabsTrigger value="bookings">Bokningar</TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  Statistik
                </TabsTrigger>
                <TabsTrigger value="financials" className="flex items-center gap-1">
                  <Receipt className="w-4 h-4" />
                  Ekonomi
                </TabsTrigger>
                <TabsTrigger value="messages">Meddelanden</TabsTrigger>
                <TabsTrigger value="payouts">Utbetalning & skatt</TabsTrigger>
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
                    <TabsTrigger value="profitability">Lönsamhet</TabsTrigger>
                    <TabsTrigger value="revenue">Intäkter per kanal</TabsTrigger>
                    <TabsTrigger value="expenses">Utgifter</TabsTrigger>
                    <TabsTrigger value="tax">Skatterapport</TabsTrigger>
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

            {/* Tax details first: Stripe's setup is then prefilled from them */}
            <TabsContent value="payouts" className="space-y-6">
              <HostTaxDetails />
              <BankAccountSetup />
            </TabsContent>

            <TabsContent value="properties" className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="text-xl font-semibold">Dina boenden</h2>
                <div className="flex flex-wrap gap-2">
                  <HostInvitationDialog />
                  <Button onClick={() => setWizardOpen(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Lägg till boende
                  </Button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {properties.length === 0 ? (
                  <div className="text-center py-16 col-span-full">
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Inga boenden än
                    </h3>
                    <p className="text-muted-foreground">
                      Lägg till ditt första boende för att komma igång.
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
              <h2 className="text-xl font-semibold mb-4">Senaste bokningarna</h2>
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Inga bokningar än</p>
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
                              <p className="text-sm text-muted-foreground">Gäst: {booking.guest_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDay(booking.check_in_date)} – {formatDay(booking.check_out_date)}
                              </p>
                              {booking.extras?.length ? (
                                <p className="text-sm text-muted-foreground">
                                  Tillval: {booking.extras.map((e) => `${e.name} (${formatSek(e.amount)})`).join(", ")}
                                </p>
                              ) : null}
                              <p className="text-sm text-muted-foreground">
                                {cancelled
                                  ? `Avbokad${booking.cancelled_by ? ` ${cancelledByText[booking.cancelled_by]}` : ""}${
                                      booking.cancelled_at ? ` den ${formatDay(stockholmDate(booking.cancelled_at))}` : ""
                                    }`
                                  : <span className="capitalize">{statusText[booking.status] ?? booking.status}</span>}
                              </p>
                            </div>
                            <div className="sm:text-right">
                              <p className="text-xs text-muted-foreground">Du får</p>
                              <p className="font-semibold text-lg">{formatSek(net)}</p>
                              {cancelled && net !== share && (
                                <p className="text-xs text-muted-foreground">
                                  av {formatSek(share)} före återbetalningen
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Gästen betalade {formatSek(booking.total_amount)}
                                {refunded > 0 ? `, ${formatSek(refunded)} återbetalt` : ""}
                              </p>
                              {payout && <p className="text-xs text-muted-foreground">{payout}</p>}
                              {deductedOre > 0 && (
                                <p className="text-xs text-amber-700">
                                  {formatSek(deductedOre)} som du är skyldig oss dras från den här utbetalningen
                                  {deductedInPart ? "; resten dras från dina kommande utbetalningar" : ""} (se fliken
                                  Utbetalning & skatt)
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
                  <div className="flex justify-end gap-2 mb-4">
                    {(property as { active?: boolean }).active ? (
                      <span className="self-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700">Publicerad</span>
                    ) : (
                      <Button onClick={() => requestPublish(editingPropertyId)} disabled={publishing}>
                        Publicera
                      </Button>
                    )}
                    <Button variant="outline" onClick={closeEditor}>
                      Stäng
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
            onCreated={(propertyId, nextTab) => {
              // Next step after the wizard: photos, or the map pin if it is still missing
              openEditor(propertyId, nextTab);
              refetchProperties();
              fetchHostStats();
              refreshChecklist();
            }}
          />

          <HostPublishDialog
            key={publishId ?? "none"}
            propertyId={publishId}
            onOpenChange={(open) => !open && setPublishId(null)}
            onPublish={publish}
            onOpenEditor={(id, tab) => {
              setPublishId(null);
              openEditor(id, tab);
            }}
            fromEditor={!!publishId && editingPropertyId === publishId}
            publishing={publishing}
          />

          {/* Delete Confirmation */}
          <AlertDialog open={!!deletingPropertyId} onOpenChange={(open) => !open && setDeletingPropertyId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ta bort boende</AlertDialogTitle>
                <AlertDialogDescription>
                  Vill du verkligen ta bort boendet? Det går inte att ångra, och allt som hör till boendet tas bort.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={deleteProperty} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Ta bort
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
