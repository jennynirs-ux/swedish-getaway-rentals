import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, MessageSquare, DollarSign, ShoppingBag, Package, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import RevenueDetail from "./RevenueDetail";

interface DashboardStats {
  active_rentals: number;
  total_bookings: number;
  upcoming_bookings: number;
  unread_messages: number;
  monthly_revenue: number;
  total_products: number;
  total_orders: number;
  monthly_orders: number;
  shop_revenue: number;
}

interface Property {
  id: string;
  title: string;
  hero_image_url: string;
  price_per_night: number;
  currency: string;
}

interface Product {
  id: string;
  title: string;
  title_override?: string;
  image_url: string;
  main_image_override?: string;
  price: number;
  price_override?: number;
  currency: string;
}

interface Booking {
  id: string;
  guest_name: string;
  property_id: string;
  check_in_date: string;
  total_amount: number;
  currency: string;
  status: string;
}

interface Order {
  id: string;
  customer_name: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface DashboardOverviewProps {
  onNavigateToTab?: (tab: string) => void;
  onEditProperty?: (propertyId: string) => void;
  onEditProduct?: (productId: string) => void;
}

type ViewMode = "dashboard" | "rental-revenue" | "shop-revenue";

const DashboardOverview = ({ onNavigateToTab, onEditProperty, onEditProduct }: DashboardOverviewProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [stats, setStats] = useState<DashboardStats>({
    active_rentals: 0,
    total_bookings: 0,
    upcoming_bookings: 0,
    unread_messages: 0,
    monthly_revenue: 0,
    total_products: 0,
    total_orders: 0,
    monthly_orders: 0,
    shop_revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const { data: basicStats, error: statsError } = await supabase.rpc("get_dashboard_stats");
      if (statsError) throw statsError;

      // Count ALL products
      const { count: totalProductsCount, error: productsCountError } = await supabase
        .from("shop_products")
        .select("*", { count: "exact", head: true })
        .eq("visible", true);
      if (productsCountError) throw productsCountError;

      // Count ALL orders
      const { count: totalOrdersCount, error: ordersCountError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      if (ordersCountError) throw ordersCountError;

      // Recent properties
      const { data: properties, error: propertiesError } = await supabase
        .from("properties")
        .select("id, title, hero_image_url, price_per_night, currency")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (propertiesError) throw propertiesError;

      // Recent products
      const { data: products, error: productsError } = await supabase
        .from("shop_products")
        .select("id, title, title_override, image_url, main_image_override, price, price_override, currency")
        .eq("visible", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (productsError) throw productsError;

      // Recent bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("id, guest_name, property_id, check_in_date, total_amount, currency, status")
        .order("created_at", { ascending: false })
        .limit(5);
      if (bookingsError) throw bookingsError;

      // Recent orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, customer_name, total_amount, currency, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (ordersError) throw ordersError;

      // Monthly shop stats
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const monthlyOrders = orders?.filter(order => new Date(order.created_at) >= currentMonth) || [];
      const shopRevenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      const statsData = basicStats as any;
      setStats({
        active_rentals: statsData?.active_rentals || 0,
        total_bookings: statsData?.total_bookings || 0,
        upcoming_bookings: statsData?.upcoming_bookings || 0,
        unread_messages: statsData?.unread_messages || 0,
        monthly_revenue: statsData?.monthly_revenue || 0,
        total_products: totalProductsCount || 0, // ✅ korrekt
        total_orders: totalOrdersCount || 0,     // ✅ korrekt
        monthly_orders: monthlyOrders.length,
        shop_revenue: shopRevenue,
      });

      setRecentProperties(properties || []);
      setRecentProducts(products || []);
      setRecentBookings(bookings || []);
      setRecentOrders(orders || []);
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (viewMode === "rental-revenue") {
    return <RevenueDetail type="rentals" onBack={() => setViewMode("dashboard")} />;
  }

  if (viewMode === "shop-revenue") {
    return <RevenueDetail type="shop" onBack={() => setViewMode("dashboard")} />;
  }

  return (
    <div className="space-y-6">
      {/* ... Resten av dina cards och komponenter (oförändrade) */}
    </div>
  );
};

export default DashboardOverview;
