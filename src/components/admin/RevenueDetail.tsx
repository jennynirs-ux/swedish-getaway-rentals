import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

interface RevenueDetailProps {
  type: 'rentals' | 'shop';
  onBack: () => void;
}

interface RevenueData {
  period: string;
  amount: number;
  bookings?: number;
  orders?: number;
}

interface BookingDetail {
  id: string;
  guest_name: string;
  property_title: string;
  check_in_date: string;
  total_amount: number;
  currency: string;
  status: string;
}

interface OrderDetail {
  id: string;
  customer_name: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  product_data: any;
}

const RevenueDetail = ({ type, onBack }: RevenueDetailProps) => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [details, setDetails] = useState<(BookingDetail | OrderDetail)[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    loadRevenueData();
  }, [type]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      
      if (type === 'rentals') {
        // Get booking revenue data
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            id, guest_name, check_in_date, total_amount, currency, status,
            properties!inner(title)
          `)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const bookingDetails = (bookings || []).map(booking => ({
          ...booking,
          property_title: (booking as any).properties?.title || 'Unknown Property'
        }));

        setDetails(bookingDetails);
        
        // Calculate monthly revenue data
        const monthlyData = calculateMonthlyData(bookings || [], 'check_in_date');
        setRevenueData(monthlyData);
        setTotalRevenue(bookings?.reduce((sum, b) => sum + b.total_amount, 0) || 0);
        
      } else {
        // Get shop revenue data
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['paid', 'completed'])
          .order('created_at', { ascending: false });

        if (error) throw error;

        setDetails(orders || []);
        
        // Calculate monthly revenue data
        const monthlyData = calculateMonthlyData(orders || [], 'created_at');
        setRevenueData(monthlyData);
        setTotalRevenue(orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0);
      }
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyData = (data: any[], dateField: string): RevenueData[] => {
    const monthlyMap = new Map<string, { amount: number; count: number }>();
    
    data.forEach(item => {
      const date = new Date(item[dateField]);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { amount: 0, count: 0 });
      }
      
      const current = monthlyMap.get(monthKey)!;
      current.amount += item.total_amount;
      current.count += 1;
    });
    
    return Array.from(monthlyMap.entries())
      .map(([period, data]) => ({
        period,
        amount: data.amount,
        ...(type === 'rentals' ? { bookings: data.count } : { orders: data.count })
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h2 className="text-2xl font-bold">
          {type === 'rentals' ? 'Rental' : 'Shop'} Revenue Details
        </h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              All time {type === 'rentals' ? 'bookings' : 'orders'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total {type === 'rentals' ? 'Bookings' : 'Orders'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{details.length}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed {type === 'rentals' ? 'bookings' : 'orders'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(details.length > 0 ? totalRevenue / details.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per {type === 'rentals' ? 'booking' : 'order'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent {type === 'rentals' ? 'Bookings' : 'Orders'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {details.slice(0, 20).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {type === 'rentals' 
                      ? (item as BookingDetail).guest_name 
                      : (item as OrderDetail).customer_name || 'Guest Customer'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {type === 'rentals' 
                      ? `${(item as BookingDetail).property_title} - Check-in: ${new Date((item as BookingDetail).check_in_date).toLocaleDateString()}`
                      : `Order ${item.id.slice(0, 8)} - ${new Date((item as OrderDetail).created_at).toLocaleDateString()}`
                    }
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={item.status === 'confirmed' || item.status === 'paid' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                  <p className="text-sm font-semibold mt-1">
                    {formatCurrency(item.total_amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueDetail;