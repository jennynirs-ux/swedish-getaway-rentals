import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Calendar, DollarSign, Users, BarChart3, Percent } from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  avgNightlyRate: number;
  occupancyRate: number;
  avgLeadTime: number;
  avgStayLength: number;
  revenueByMonth: { month: string; revenue: number }[];
  topProperty: { title: string; revenue: number } | null;
}

interface HostAnalyticsProps {
  hostId: string;
}

export const HostAnalytics = ({ hostId }: HostAnalyticsProps) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'30d' | '90d' | '12m'>('12m');

  useEffect(() => {
    fetchAnalytics();
  }, [hostId, period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      if (period === '30d') startDate.setDate(now.getDate() - 30);
      else if (period === '90d') startDate.setDate(now.getDate() - 90);
      else startDate.setFullYear(now.getFullYear() - 1);

      const startStr = startDate.toISOString().split('T')[0];

      // Get host properties
      const { data: properties } = await supabase
        .from('properties')
        .select('id, title')
        .eq('host_id', hostId);

      if (!properties || properties.length === 0) {
        setData(null);
        return;
      }

      const propertyIds = properties.map((p) => p.id);

      // Get bookings in range
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, property_id, total_amount, check_in_date, check_out_date, created_at, number_of_guests, status')
        .in('property_id', propertyIds)
        .gte('check_in_date', startStr)
        .in('status', ['confirmed', 'completed']);

      if (!bookings || bookings.length === 0) {
        setData({
          totalRevenue: 0,
          totalBookings: 0,
          avgNightlyRate: 0,
          occupancyRate: 0,
          avgLeadTime: 0,
          avgStayLength: 0,
          revenueByMonth: [],
          topProperty: null,
        });
        return;
      }

      // Calculate metrics
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const totalBookings = bookings.length;

      // Average stay length
      const stayLengths = bookings.map((b) => {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avgStayLength = stayLengths.reduce((a, b) => a + b, 0) / stayLengths.length;

      // Average nightly rate
      const totalNights = stayLengths.reduce((a, b) => a + b, 0);
      const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0;

      // Occupancy rate (booked nights / total available nights)
      const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAvailableNights = daysInPeriod * properties.length;
      const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0;

      // Average lead time (days between booking creation and check-in)
      const leadTimes = bookings.map((b) => {
        const created = new Date(b.created_at);
        const checkIn = new Date(b.check_in_date);
        return Math.max(0, Math.ceil((checkIn.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
      });
      const avgLeadTime = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;

      // Revenue by month
      const monthMap: Record<string, number> = {};
      bookings.forEach((b) => {
        const month = b.check_in_date.substring(0, 7); // YYYY-MM
        monthMap[month] = (monthMap[month] || 0) + (b.total_amount || 0);
      });
      const revenueByMonth = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({ month, revenue }));

      // Top property
      const propRevenue: Record<string, number> = {};
      bookings.forEach((b) => {
        propRevenue[b.property_id] = (propRevenue[b.property_id] || 0) + (b.total_amount || 0);
      });
      const topPropId = Object.entries(propRevenue).sort(([, a], [, b]) => b - a)[0]?.[0];
      const topProperty = topPropId
        ? { title: properties.find((p) => p.id === topPropId)?.title || 'Unknown', revenue: propRevenue[topPropId] }
        : null;

      setData({
        totalRevenue,
        totalBookings,
        avgNightlyRate: Math.round(avgNightlyRate),
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        avgLeadTime: Math.round(avgLeadTime),
        avgStayLength: Math.round(avgStayLength * 10) / 10,
        revenueByMonth,
        topProperty,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatSEK = (amount: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return <div className="text-muted-foreground p-4">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['30d', '90d', '12m'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '12 Months'}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold">{formatSEK(data?.totalRevenue || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium">Bookings</span>
            </div>
            <p className="text-2xl font-bold">{data?.totalBookings || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Avg Nightly Rate</span>
            </div>
            <p className="text-2xl font-bold">{formatSEK(data?.avgNightlyRate || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              <span className="text-xs font-medium">Occupancy Rate</span>
            </div>
            <p className="text-2xl font-bold">{data?.occupancyRate || 0}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">Avg Lead Time</span>
            </div>
            <p className="text-2xl font-bold">{data?.avgLeadTime || 0} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Avg Stay Length</span>
            </div>
            <p className="text-2xl font-bold">{data?.avgStayLength || 0} nights</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue chart (simple bar chart) */}
      {data?.revenueByMonth && data.revenueByMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {data.revenueByMonth.map((m) => {
                const maxRev = Math.max(...data.revenueByMonth.map((r) => r.revenue));
                const height = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{formatSEK(m.revenue)}</span>
                    <div
                      className="w-full bg-primary rounded-t min-h-[4px]"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {m.month.substring(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top property */}
      {data?.topProperty && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Top Performing Property</p>
            <p className="font-semibold">{data.topProperty.title}</p>
            <p className="text-sm text-primary">{formatSEK(data.topProperty.revenue)} revenue</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
