import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Building2, ShoppingBag, Package, Users, Settings } from "lucide-react";
import DashboardOverview from "./DashboardOverview";
import BookingsManagement from "./BookingsManagement";
import ShopProductsManagement from "./ShopProductsManagement";
import OrdersManagement from "./OrdersManagement";

const UnifiedAdmin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your properties, shop products, bookings, and orders
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="rentals" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Rentals
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <DashboardOverview />
        </TabsContent>

        <TabsContent value="rentals" className="space-y-6">
          <BookingsManagement />
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <ShopProductsManagement />
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <OrdersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedAdmin;