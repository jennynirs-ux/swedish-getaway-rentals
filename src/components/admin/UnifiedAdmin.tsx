import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Building2, ShoppingBag, Package, Users, Settings, FileText, Truck } from "lucide-react";
import DashboardOverview from "./DashboardOverview";
import BookingsManagement from "./BookingsManagement";
import ShopProductsManagement from "./ShopProductsManagement";
import OrdersManagement from "./OrdersManagement";
import PropertiesManagement from "./PropertiesManagement";
import PropertyDetailEditor from "./PropertyDetailEditor";
import HostManagement from "./HostManagement";
import { ContentEditor } from "./ContentEditor";
import { ShippingEditor } from "./ShippingEditor";
import PricingManagement from "./PricingManagement";
import ReviewsManagement from "./ReviewsManagement";
import CouponsManagement from "./CouponsManagement";

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
        </TabsContent>

        <TabsContent value="rentals" className="space-y-6">
          <Tabs defaultValue="properties" className="space-y-4">
            <TabsList>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="hosts">Hosts</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="coupons">Coupons</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Calendar</TabsTrigger>
            </TabsList>
            
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
            
            <TabsContent value="coupons">
              <CouponsManagement />
            </TabsContent>
            
            <TabsContent value="pricing">
              <PricingManagement />
            </TabsContent>
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
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Property Detail Editor */}
      {editingPropertyId && (
        <PropertyDetailEditor
          propertyId={editingPropertyId}
          open={!!editingPropertyId}
          onClose={() => setEditingPropertyId(null)}
          onSave={() => {
            // Refresh data if needed
          }}
        />
      )}
    </div>
  );
};

export default UnifiedAdmin;