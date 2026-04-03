import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaxReportLine {
  property_title: string;
  property_id: string;
  registration_number: string | null;
  total_revenue: number;
  total_bookings: number;
  total_nights: number;
  avg_nightly_rate: number;
  platform_fees: number;
  total_expenses: number;
  expenses_by_category: Record<string, number>;
  net_income: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { year } = await req.json();
    const taxYear = year || new Date().getFullYear() - 1;

    // Get host profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, is_host')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_host) {
      return new Response(JSON.stringify({ error: 'Not a host' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get host properties (registration_number may not exist yet - handle gracefully)
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title')
      .eq('host_id', profile.id);

    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ error: 'No properties found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const propertyIds = properties.map((p: any) => p.id);
    const yearStart = `${taxYear}-01-01`;
    const yearEnd = `${taxYear}-12-31`;

    // Get all completed/confirmed bookings for the tax year
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, property_id, total_amount, check_in_date, check_out_date, status')
      .in('property_id', propertyIds)
      .gte('check_in_date', yearStart)
      .lte('check_in_date', yearEnd)
      .in('status', ['confirmed', 'completed']);

    // Fetch expenses for the tax year (may fail if table doesn't exist yet)
    let expenses: any[] = [];
    try {
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('property_id, category, amount')
        .in('property_id', propertyIds)
        .gte('expense_date', yearStart)
        .lte('expense_date', yearEnd);
      expenses = expenseData || [];
    } catch {
      // expenses table may not exist yet — continue without
    }

    const PLATFORM_FEE_RATE = 0.10; // 10% platform commission

    // Build per-property report lines
    const propertyLines: TaxReportLine[] = properties.map((prop: any) => {
      const propBookings = (bookings || []).filter((b: any) => b.property_id === prop.id);
      const totalRevenue = propBookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
      const totalBookings = propBookings.length;

      const totalNights = propBookings.reduce((sum: number, b: any) => {
        const checkIn = new Date(b.check_in_date);
        const checkOut = new Date(b.check_out_date);
        return sum + Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);

      // Calculate expenses per property
      const propExpenses = expenses.filter((e: any) => e.property_id === prop.id);
      const totalExpenses = propExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const expensesByCategory: Record<string, number> = {};
      for (const e of propExpenses) {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount;
      }

      const platformFees = Math.round(totalRevenue * PLATFORM_FEE_RATE);
      const netIncome = totalRevenue - platformFees - totalExpenses;
      const avgNightlyRate = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;

      return {
        property_title: prop.title,
        property_id: prop.id,
        registration_number: prop.registration_number || null,
        total_revenue: totalRevenue,
        total_bookings: totalBookings,
        total_nights: totalNights,
        avg_nightly_rate: avgNightlyRate,
        platform_fees: platformFees,
        total_expenses: totalExpenses,
        expenses_by_category: expensesByCategory,
        net_income: netIncome,
      };
    });

    // Summary
    const totalGross = propertyLines.reduce((s, p) => s + p.total_revenue, 0);
    const totalFees = propertyLines.reduce((s, p) => s + p.platform_fees, 0);
    const totalExpenses = propertyLines.reduce((s, p) => s + p.total_expenses, 0);
    const totalNet = propertyLines.reduce((s, p) => s + p.net_income, 0);
    const totalBookingsCount = propertyLines.reduce((s, p) => s + p.total_bookings, 0);
    const totalNightsCount = propertyLines.reduce((s, p) => s + p.total_nights, 0);

    // Skatteverket calculation — Privatuthyrning
    // Swedish rental income rules:
    //   Schablonavdrag: 40,000 SEK standard deduction per year
    //   Plus 20% of gross rental income as additional deduction
    //   Net taxable = gross_income - 40,000 - (20% of gross) (minimum 0)
    //   Taxed as capital income at 30%
    //
    // Note: amounts in the DB are stored in ore (1/100 SEK)
    const SCHABLONAVDRAG_ORE = 40000 * 100; // 40,000 SEK in ore
    const grossInOre = totalGross;
    const additionalDeductionOre = Math.round(grossInOre * 0.20);
    const taxableAmountOre = Math.max(0, totalNet - SCHABLONAVDRAG_ORE - additionalDeductionOre);

    const report = {
      host_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Host',
      host_email: user.email || '',
      tax_year: taxYear,
      generated_at: new Date().toISOString(),
      currency: 'SEK',
      properties: propertyLines,
      summary: {
        total_gross_revenue: totalGross,
        total_platform_fees: totalFees,
        total_expenses: totalExpenses,
        total_net_income: totalNet,
        total_bookings: totalBookingsCount,
        total_nights: totalNightsCount,
      },
      skatteverket: {
        inkomstslag: 'Kapital (privatuthyrning)',
        schablonavdrag: SCHABLONAVDRAG_ORE,
        taxable_amount: taxableAmountOre,
        note: `Uthyrning av privatbostad beskattas som inkomst av kapital. Schablonavdrag 40 000 kr + 20% av hyresintakten (${Math.round(additionalDeductionOre / 100).toLocaleString('sv-SE')} kr). Skattesats 30% pa overskott. OBS: Detta ar en berakningshjalp — kontrollera alltid mot Skatteverkets aktuella regler.`,
      },
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tax report error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate tax report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
