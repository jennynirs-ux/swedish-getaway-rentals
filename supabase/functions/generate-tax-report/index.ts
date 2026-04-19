import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Secure CORS configuration — origin whitelist pattern used across this project
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://bbuutvozqfzbsnllsiai.supabase.co',
  'https://stuga-escapes.lovable.app',
  'https://nordic-getaways.com',
  'https://www.nordic-getaways.com',
];

const baseCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Platform commission rate — shared constant (also duplicated in src/lib/constants.ts for frontend)
const PLATFORM_COMMISSION_RATE = 0.10;

// Skatteverket privatuthyrning constants (amounts in SEK)
const SCHABLONAVDRAG_SEK = 40000;
const ADDITIONAL_DEDUCTION_RATE = 0.20;
const CAPITAL_INCOME_TAX_RATE = 0.30;

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
  // Origin validation
  const origin = req.headers.get('origin');
  const validOrigin = origin && allowedOrigins.includes(origin);
  const corsHeaders = {
    ...baseCorsHeaders,
    'Access-Control-Allow-Origin': validOrigin ? origin : allowedOrigins[0],
  };

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

      const platformFees = Math.round(totalRevenue * PLATFORM_COMMISSION_RATE);
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

    // Summary (amounts in ore = 1/100 SEK)
    const totalGross = propertyLines.reduce((s, p) => s + p.total_revenue, 0);
    const totalFees = propertyLines.reduce((s, p) => s + p.platform_fees, 0);
    const totalExpensesSum = propertyLines.reduce((s, p) => s + p.total_expenses, 0);
    const totalNet = propertyLines.reduce((s, p) => s + p.net_income, 0);
    const totalBookingsCount = propertyLines.reduce((s, p) => s + p.total_bookings, 0);
    const totalNightsCount = propertyLines.reduce((s, p) => s + p.total_nights, 0);

    // Skatteverket calculation — Privatuthyrning (Kapital)
    // Per Skatteverket rules for private rental income:
    //   Taxable amount = gross_rental_income − 40,000 SEK − (20% × gross_rental_income)
    //   Minimum taxable = 0 (cannot be negative)
    //   Tax rate on taxable = 30% (capital income)
    //
    // NOTE: The schablonavdrag is applied against GROSS rental income, not net.
    // Platform fees and actual expenses are NOT deductible under privatuthyrning —
    // they are deemed to be covered by the standard deduction.
    //
    // All amounts stored in ore (1/100 SEK). Convert to SEK for arithmetic then back.
    const grossSek = totalGross / 100;
    const schablonavdragSek = SCHABLONAVDRAG_SEK;
    const additionalDeductionSek = grossSek * ADDITIONAL_DEDUCTION_RATE;
    const taxableAmountSek = Math.max(0, grossSek - schablonavdragSek - additionalDeductionSek);
    const estimatedTaxSek = taxableAmountSek * CAPITAL_INCOME_TAX_RATE;

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
        total_expenses: totalExpensesSum,
        total_net_income: totalNet,
        total_bookings: totalBookingsCount,
        total_nights: totalNightsCount,
      },
      skatteverket: {
        inkomstslag: 'Kapital (privatuthyrning)',
        schablonavdrag: schablonavdragSek * 100, // back to ore for frontend consistency
        additional_deduction: Math.round(additionalDeductionSek * 100),
        taxable_amount: Math.round(taxableAmountSek * 100),
        estimated_tax: Math.round(estimatedTaxSek * 100),
        note: `Uthyrning av privatbostad beskattas som inkomst av kapital. Beskattningsbart belopp = bruttointakt - 40 000 kr - 20% av bruttointakten. Skattesats 30% pa overskott. Plattformsavgifter och faktiska utgifter ar INTE avdragsgilla utover schablonavdraget. OBS: Detta ar en berakningshjalp - kontrollera alltid mot Skatteverkets aktuella regler.`,
      },
    };

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tax report error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to generate tax report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
