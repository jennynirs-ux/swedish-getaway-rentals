import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Building2, ShoppingBag, Mail, Clock, Ban, Loader2 } from "lucide-react";

// Lazy-load all tab components — splits the 510 kB admin chunk into per-tab chunks
const DashboardOverview = lazy(() => import("./DashboardOverview"));
const BookingsManagement = lazy(() => import("./BookingsManagement"));
const ShopProductsManagement = lazy(() => import("./ShopProductsManagement"));
const OrdersManagement = lazy(() => import("./OrdersManagement"));
const PropertiesManagement = lazy(() => import("./PropertiesManagement"));
const PropertyDetailEditor = lazy(() => import("./PropertyDetailEditor"));
const HostManagement = lazy(() => import("./HostManagement"));
const ContentEditor = lazy(() => import("./ContentEditor").then(m => ({ default: m.ContentEditor })));
const ShippingEditor = lazy(() => import("./ShippingEditor").then(m => ({ default: m.ShippingEditor })));
const PricingManagement = lazy(() => import("./PricingManagement"));
const ReviewsManagement = lazy(() => import("./ReviewsManagement"));
const GuestbookManagement = lazy(() => import("./GuestbookManagement"));
const CouponsManagement = lazy(() => import("./CouponsManagement"));
const MessagesInbox = lazy(() => import("./MessagesInbox"));
const BookingEmailSettings = lazy(() => import("./BookingEmailSettings").then(m => ({ default: m.BookingEmailSettings })));
const PreArrivalSettings = lazy(() => import("./PreArrivalSettings"));
const CancellationPolicySettings = lazy(() => import("./CancellationPolicySettings").then(m => ({ default: m.CancellationPolicySettings })));

const TabFallback = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
  </div>
);

const UnifiedAdmin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your properties, shop products, bookings, and orders
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="rentals" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Rentals
          </TabsTrigger>
          <TabsTrigger value="shop" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Shop
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Suspense fallback={<TabFallback />}>
            <DashboardOverview
              onNavigateToTab={setActiveTab}
              onEditProperty={(propertyId) => {
                setEditingPropertyId(propertyId);
                setActiveTab("rentals");
              }}
              onEditProduct={(productId) => {
                setEditingProductId(productId);
                setActiveTab("products");
              }}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="rentals" className="space-y-6">
          <Tabs defaultValue="properties" className="space-y-4">
            <TabsList>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="hosts">Hosts</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="guestbook">Guestbook</TabsTrigger>
              <TabsTrigger value="coupons">Coupons</TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="w-4 h-4 mr-2" />
                Booking Emails
              </TabsTrigger>
              <TabsTrigger value="pre-arrival">
                <Clock className="w-4 h-4 mr-2" />
                Pre-Arrival
              </TabsTrigger>
              <TabsTrigger value="cancellation">
                <Ban className="w-4 h-4 mr-2" />
                Cancellation
              </TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Calendar</TabsTrigger>
            </TabsList>

            <Suspense fallback={<TabFallback />}>
              <TabsContent value="properties">
                <PropertiesManagement />
              </TabsContent>

              <TabsContent value="hosts">
                <HostManagement />
              </TabsContent>

              <TabsContent value="bookings">
                <BookingsManagement />
              </TabsContent>

              <TabsContent value="reviews">
                <ReviewsManagement />
              </TabsContent>

              <TabsContent value="guestbook">
                <GuestbookManagement />
              </TabsContent>

              <TabsContent value="coupons">
                <CouponsManagement />
              </TabsContent>

              <TabsContent value="email">
                <BookingEmailSettings />
              </TabsContent>

              <TabsContent value="pre-arrival">
                <PreArrivalSettings />
              </TabsContent>

              <TabsContent value="cancellation">
                <CancellationPolicySettings />
              </TabsContent>

              <TabsContent value="messages">
                <MessagesInbox />
              </TabsContent>

              <TabsContent value="pricing">
                <PricingManagement />
              </TabsContent>
            </Suspense>
          </Tabs>
        </TabsContent>

        <TabsContent value="shop" className="space-y-6">
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>

            <Suspense fallback={<TabFallback />}>
              <TabsContent value="products">
                <ShopProductsManagement
                  editingProductId={editingProductId}
                  onClearEditingProduct={() => setEditingProductId(null)}
                />
              </TabsContent>

              <TabsContent value="orders">
                <OrdersManagement />
              </TabsContent>

              <TabsContent value="content">
                <ContentEditor />
              </TabsContent>

              <TabsContent value="shipping">
                <ShippingEditor />
              </TabsContent>
            </Suspense>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Property Detail Editor */}
      {editingPropertyId && (
        <Suspense fallback={<TabFallback />}>
          <PropertyDetailEditor
            propertyId={editingPropertyId}
            open={!!editingPropertyId}
            onClose={() => setEditingPropertyId(null)}
            onSave={() => {
              // Refresh data if needed
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default UnifiedAdmin;
