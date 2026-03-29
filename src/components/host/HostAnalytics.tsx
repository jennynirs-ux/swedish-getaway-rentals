import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Calendar, DollarSign, Users, BarChart3, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const COMMISSION_RATE = 0.10; // 10% platform fee

const SOURCE_COLORS: Record<string, string> = {
  airbnb: '#f43f5e',
  booking_com: '#3b82f6',
  direct: '#22c55e',
  blocked: '#9ca3af',
};

interface AnalyticsData {
  hostRevenue: number;
  grossRevenue: number;
  totalBookings: number;
  avgNightlyRate: number;
  occupancyRate: number;
  avgLeadTime: number;
  avgStayLength: number;
  revenueByMonth: { month: string; revenue: number }[];
  revenueBySource: { name: string; value: number; color: string }[];
  occupancyByMonth: { month: string; rate: number }[];
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

      const now = new Date();
      const startDate = new Date();
      if (period === '30d') startDate.setDate(now.getDate() - 30);
      else if (period === '90d') startDate.setDate(now.getDate() - 90);
      else startDate.setFullYear(now.getFullYear() - 1);

      const startStr = startDate.toISOString().split('T')[0];

      const { data: properties } = await supabase
        .from('properties')
        .select('id, title')
        .eq('host_id', hostId);

      if (!properties || properties.length === 0) {
        setData(null);
        return;
      }

      const propertyIds = properties.map((p) => p.id);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, property_id, total_amount, check_in_date, check_out_date, created_at, source, status')
        .in('property_id', propertyIds)
        .gte('check_in_date', startStr)
        .in('status', ['confirmed', 'completed']);

      if (!bookings || bookings.length === 0) {
        setData({
          hostRevenue: 0, grossRevenue: 0, totalBookings: 0, avgNightlyRate: 0,
          occupancyRate: 0, avgLeadTime: 0, avgStayLength: 0,
          revenueByMonth: [], revenueBySource: [], occupancyByMonth: [], topProperty: null,
        });
        return;
      }

      // Revenue (host earnings = gross - commission)
      const grossRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const hostRevenue = Math.round(grossRevenue * (1 - COMMISSION_RATE));

      // Stay lengths
      const stayLengths = bookings.map((b) => {
        const ci = new Date(b.check_in_date);
        const co = new Date(b.check_out_date);
        return Math.ceil((co.getTime() - ci.getTime()) / 86400000);
      });
      const totalNights = stayLengths.reduce((a, b) => a + b, 0);
      const avgStayLength = stayLengths.length > 0 ? totalNights / stayLengths.length : 0;
      const avgNightlyRate = totalNights > 0 ? hostRevenue / totalNights : 0;

      // Occupancy
      const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / 86400000);
      const totalAvailable = daysInPeriod * properties.length;
      const occupancyRate = totalAvailable > 0 ? (totalNights / totalAvailable) * 100 : 0;

      // Lead time
      const leadTimes = bookings.map((b) => {
        return Math.max(0, Math.ceil((new Date(b.check_in_date).getTime() - new Date(b.created_at).getTime()) / 86400000));
      });
      const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;

      // Revenue by month (host earnings)
      const monthRevMap: Record<string, number> = {};
      bookings.forEach((b) => {
        const month = b.check_in_date.substring(0, 7);
        const hostAmt = Math.round((b.total_amount || 0) * (1 - COMMISSION_RATE));
        monthRevMap[month] = (monthRevMap[month] || 0) + hostAmt;
      });
      const revenueByMonth = Object.entries(monthRevMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, revenue]) => ({ month: month.substring(5), revenue: Math.round(revenue / 100) }));

      // Revenue by source
      const sourceMap: Record<string, number> = {};
      bookings.forEach((b) => {
        const src = b.source || 'direct';
        sourceMap[src] = (sourceMap[src] || 0) + (b.total_amount || 0);
      });
      const revenueBySource = Object.entries(sourceMap)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({
          name: name === 'booking_com' ? 'Booking.com' : name.charAt(0).toUpperCase() + name.slice(1),
          value: Math.round(value / 100),
          color: SOURCE_COLORS[name] || '#9ca3af',
        }));

      // Occupancy by month
      const monthOccMap: Record<string, { booked: number; total: number }> = {};
      bookings.forEach((b) => {
        const month = b.check_in_date.substring(0, 7);
        const nights = Math.ceil((new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86400000);
        if (!monthOccMap[month]) monthOccMap[month] = { booked: 0, total: 30 * properties.length };
        monthOccMap[month].booked += nights;
      });
      const occupancyByMonth = Object.entries(monthOccMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { booked, total }]) => ({
          month: month.substring(5),
          rate: Math.min(100, Math.round((booked / total) * 100)),
        }));

      // Top property
      const propRev: Record<string, number> = {};
      bookings.forEach((b) => { propRev[b.property_id] = (propRev[b.property_id] || 0) + (b.total_amount || 0); });
      const topId = Object.entries(propRev).sort(([, a], [, b]) => b - a)[0]?.[0];
      const topProperty = topId
        ? { title: properties.find((p) => p.id === topId)?.title || 'Unknown', revenue: Math.round(propRev[topId] * (1 - COMMISSION_RATE)) }
        : null;

      setData({
        hostRevenue, grossRevenue, totalBookings: bookings.length,
        avgNightlyRate: Math.round(avgNightlyRate),
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        avgLeadTime: Math.round(avgLeadTime),
        avgStayLength: Math.round(avgStayLength * 10) / 10,
        revenueByMonth, revenueBySource, occupancyByMonth, topProperty,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (amount: number) => `${(amount / 100).toLocaleString('sv-SE')} kr`;

  if (loading) return <div className="text-muted-foreground p-4">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['30d', '90d', '12m'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
              <span className="text-xs font-medium">Your Earnings</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{fmt(data?.hostRevenue || 0)}</p>
            <p className="text-xs text-muted-foreground">After 10% platform fee</p>
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
              <Percent className="h-4 w-4" />
              <span className="text-xs font-medium">Occupancy</span>
            </div>
            <p className="text-2xl font-bold">{data?.occupancyRate || 0}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Avg Nightly Rate</span>
            </div>
            <p className="text-2xl font-bold">{fmt(data?.avgNightlyRate || 0)}</p>
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
              <span className="text-xs font-medium">Avg Stay</span>
            </div>
            <p className="text-2xl font-bold">{data?.avgStayLength || 0} nights</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by month (Recharts) */}
      {data?.revenueByMonth && data.revenueByMonth.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Earnings (SEK)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.revenueByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString('sv-SE')} kr`} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue by channel */}
        {data?.revenueBySource && data.revenueBySource.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue by Channel</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.revenueBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {data.revenueBySource.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toLocaleString('sv-SE')} kr`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Occupancy trend */}
        {data?.occupancyByMonth && data.occupancyByMonth.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Occupancy Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.occupancyByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top property */}
      {data?.topProperty && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Top Performing Property</p>
            <p className="font-semibold">{data.topProperty.title}</p>
            <p className="text-sm text-green-700">{fmt(data.topProperty.revenue)} earnings</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
