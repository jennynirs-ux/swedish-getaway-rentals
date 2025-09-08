import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { supabase } from "@/integrations/supabase/client";

interface RevenueData {
  period: string;
  revenue: number;
  bookings: number;
}

interface FinancialDashboardProps {
  onBack: () => void;
}

const FinancialDashboard = ({ onBack }: FinancialDashboardProps) => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [viewType, setViewType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);

  useEffect(() => {
    fetchFinancialData();
  }, [viewType, selectedYear]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bookings')
        .select('*')
        .eq('status', 'confirmed');

      const { data: bookings, error } = await query;
      
      if (error) throw error;

      if (bookings) {
        const processedData = processBookingsData(bookings);
        setRevenueData(processedData);
        
        const total = bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
        setTotalRevenue(total);
        setTotalBookings(bookings.length);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processBookingsData = (bookings: any[]): RevenueData[] => {
    const dataMap = new Map<string, { revenue: number; bookings: number }>();

    bookings.forEach(booking => {
      const date = new Date(booking.created_at);
      let period: string;

      if (viewType === 'monthly') {
        if (date.getFullYear().toString() === selectedYear) {
          period = date.toLocaleDateString('sv-SE', { month: 'short' });
        } else {
          return;
        }
      } else {
        period = date.getFullYear().toString();
      }

      const existing = dataMap.get(period) || { revenue: 0, bookings: 0 };
      dataMap.set(period, {
        revenue: existing.revenue + (booking.total_amount || 0),
        bookings: existing.bookings + 1
      });
    });

    return Array.from(dataMap.entries())
      .map(([period, data]) => ({
        period,
        revenue: data.revenue,
        bookings: data.bookings
      }))
      .sort((a, b) => {
        if (viewType === 'monthly') {
          const months = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 
                         'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
          return months.indexOf(a.period.toLowerCase()) - months.indexOf(b.period.toLowerCase());
        }
        return parseInt(a.period) - parseInt(b.period);
      });
  };

  const chartConfig = {
    revenue: {
      label: "Intäkter",
      color: "hsl(var(--primary))",
    },
    bookings: {
      label: "Bokningar",
      color: "hsl(var(--secondary))",
    },
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Ekonomisk Översikt</h2>
            <p className="text-muted-foreground">
              Detaljerad analys av intäkter och bokningar
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={viewType} onValueChange={(value: 'monthly' | 'yearly') => setViewType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Månadsvis</SelectItem>
              <SelectItem value="yearly">Årsvis</SelectItem>
            </SelectContent>
          </Select>
          
          {viewType === 'monthly' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = (new Date().getFullYear() - i).toString();
                  return (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Intäkt</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} SEK</div>
            <p className="text-xs text-muted-foreground">
              Alla bekräftade bokningar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totala Bokningar</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              Bekräftade bokningar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Genomsnitt per Bokning</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalBookings > 0 ? Math.round(totalRevenue / totalBookings).toLocaleString() : 0} SEK
            </div>
            <p className="text-xs text-muted-foreground">
              Genomsnittlig bokningsintäkt
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Intäktsutveckling</CardTitle>
            <CardDescription>
              {viewType === 'monthly' ? `Månadsvis intäkt för ${selectedYear}` : 'Årlig intäktsutveckling'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} ${name === 'revenue' ? 'SEK' : ''}`,
                    name === 'revenue' ? 'Intäkt' : 'Bokningar'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bokningar</CardTitle>
            <CardDescription>
              {viewType === 'monthly' ? `Antal bokningar per månad ${selectedYear}` : 'Antal bokningar per år'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-80">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [`${value}`, 'Bokningar']}
                />
                <Bar 
                  dataKey="bookings" 
                  fill="hsl(var(--secondary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FinancialDashboard;