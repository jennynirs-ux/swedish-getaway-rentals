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
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="rentals" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Rentals
          </TabsTrigger>
          <TabsTrigger value="hosts" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Hosts
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Shipping
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
          <PropertiesManagement />
          <BookingsManagement />
        </TabsContent>

        <TabsContent value="hosts" className="space-y-6">
          <HostManagement />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <ShopProductsManagement 
            editingProductId={editingProductId}
            onClearEditingProduct={() => setEditingProductId(null)}
          />
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <OrdersManagement />
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <ContentEditor />
        </TabsContent>

        <TabsContent value="shipping" className="space-y-6">
          <ShippingEditor />
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