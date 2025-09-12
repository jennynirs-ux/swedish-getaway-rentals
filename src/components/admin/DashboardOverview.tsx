import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, MessageSquare, DollarSign, ShoppingBag, Package, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

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

const DashboardOverview = () => {
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

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Get existing stats from the database function
      const { data: basicStats, error: statsError } = await supabase.rpc('get_dashboard_stats');
      
      if (statsError) throw statsError;

      // Get additional shop stats
      const { data: products, error: productsError } = await supabase
        .from('shop_products')
        .select('id')
        .eq('visible', true);

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, currency, created_at')
        .eq('status', 'paid');

      if (productsError) throw productsError;
      if (ordersError) throw ordersError;

      // Calculate monthly shop orders and revenue
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const monthlyOrders = orders?.filter(order => 
        new Date(order.created_at) >= currentMonth
      ) || [];

      const shopRevenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      const statsData = basicStats as any;
      setStats({
        active_rentals: statsData?.active_rentals || 0,
        total_bookings: statsData?.total_bookings || 0,
        upcoming_bookings: statsData?.upcoming_bookings || 0,
        unread_messages: statsData?.unread_messages || 0,
        monthly_revenue: statsData?.monthly_revenue || 0,
        total_products: products?.length || 0,
        total_orders: orders?.length || 0,
        monthly_orders: monthlyOrders.length,
        shop_revenue: shopRevenue,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
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
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
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

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_rentals}</div>
            <p className="text-xs text-muted-foreground">
              Properties available
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_bookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.upcoming_bookings} upcoming
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shop Products</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_products}</div>
            <p className="text-xs text-muted-foreground">
              Active products
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_orders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.monthly_orders} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rental Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthly_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              This month from bookings
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shop Revenue</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.shop_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total from shop orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={loadDashboardStats} variant="outline">
              Refresh Data
            </Button>
            {stats.unread_messages > 0 && (
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm">
                  {stats.unread_messages} unread message{stats.unread_messages === 1 ? '' : 's'}
                </span>
                <Badge variant="destructive">{stats.unread_messages}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;