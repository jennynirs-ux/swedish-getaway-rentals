import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCallerUser } from '../_shared/auth.ts';
import { hostNetAmount } from '../_shared/payout.ts';

// Secure CORS configuration — origin whitelist pattern used across this project
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://bbuutvozqfzbsnllsiai.supabase.co',
  'https://nordic-getaways.com',
  'https://www.nordic-getaways.com',
];

const baseCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Skatteverket privatuthyrning constants (amounts in SEK)
const SCHABLONAVDRAG_SEK = 40000;
const ADDITIONAL_DEDUCTION_RATE = 0.20;
const CAPITAL_INCOME_TAX_RATE = 0.30;

// Every amount in the report is in öre, like the database: HostTaxReport and
// its CSV show them divided by 100 (amounts_in says so explicitly)
interface TaxReportLine {
  property_title: string;
  property_id: string;
  registration_number: string | null;
  /** Stays plus cancellation income: what the host received */
  total_revenue: number;
  /** What the host kept from cancelled bookings (late cancellations) */
  cancellation_income: number;
  total_bookings: number;
  cancelled_bookings: number;
  total_nights: number;
  avg_nightly_rate: number;
  platform_fees: number;
  total_expenses: number;
  expenses_by_category: Record<string, number>;
  net_income: number;
}

interface BookingRow {
  property_id: string;
  status: string;
  total_amount: number | null;
  host_amount: number | null;
  service_fee: number | null;
  refunded_amount: number | null;
  host_reversed_amount: number | null;
  stripe_payment_intent_id: string | null;
  check_in_date: string;
  check_out_date: string;
}

// What the host received for a booking (öre): hostNetAmount in
// _shared/payout.ts, the same rule as the host dashboard and the financial
// views (share less what refunds take from it; a cancelled booking counts
// only if it was paid on the site; a full refund leaves 0)
const hostNet = (b: BookingRow) => hostNetAmount(b);

const nights = (b: BookingRow) =>
  Math.max(1, Math.round((Date.parse(b.check_out_date) - Date.parse(b.check_in_date)) / 86_400_000));

serve(async (req) => {
  // Origin validation
  const origin = req.headers.get('origin');
  const validOrigin = origin && allowedOrigins.includes(origin);
  const corsHeaders = {
    ...baseCorsHeaders,
    'Access-Control-Allow-Origin': validOrigin ? origin : allowedOrigins[0],
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const user = await getCallerUser(req, supabase);
    if (!user) return json({ error: 'Please sign in again' }, 401);

    const body = await req.json().catch(() => ({}));
    const currentYear = Number(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric' }).format(new Date()));
    const taxYear = body?.year == null ? currentYear - 1 : Number(body.year);
    if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > currentYear) {
      return json({ error: `Choose a year between 2000 and ${currentYear}` }, 400);
    }

    // The columns that exist: full_name, display_name, host_business_name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, host_business_name, is_host')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileError) throw new Error(`Could not read your profile: ${profileError.message}`);
    if (!profile?.is_host) return json({ error: 'Only hosts can create a tax report' }, 403);

    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, title, registration_number')
      .eq('host_id', profile.id);
    if (propertiesError) throw new Error(`Could not read your listings: ${propertiesError.message}`);
    if (!properties || properties.length === 0) return json({ error: 'You have no listings yet' }, 404);

    const propertyIds = properties.map((p) => p.id);
    const yearStart = `${taxYear}-01-01`;
    const yearEnd = `${taxYear}-12-31`;

    // Stays in the tax year, plus cancelled ones: after a late cancellation the
    // host keeps part of the payment, and that is income too
    const { data: bookingData, error: bookingsError } = await supabase
      .from('bookings')
      .select('property_id, status, total_amount, host_amount, service_fee, refunded_amount, host_reversed_amount, stripe_payment_intent_id, check_in_date, check_out_date')
      .in('property_id', propertyIds)
      .gte('check_in_date', yearStart)
      .lte('check_in_date', yearEnd)
      .in('status', ['confirmed', 'completed', 'cancelled']);
    if (bookingsError) throw new Error(`Could not read your bookings: ${bookingsError.message}`);
    const bookings = (bookingData ?? []) as BookingRow[];

    const { data: expenseData, error: expensesError } = await supabase
      .from('expenses')
      .select('property_id, category, amount')
      .in('property_id', propertyIds)
      .gte('expense_date', yearStart)
      .lte('expense_date', yearEnd);
    if (expensesError) throw new Error(`Could not read your expenses: ${expensesError.message}`);
    const expenses = expenseData ?? [];

    const propertyLines: TaxReportLine[] = properties.map((prop) => {
      const own = bookings.filter((b) => b.property_id === prop.id);
      const stays = own.filter((b) => b.status !== 'cancelled');
      const cancelled = own.filter((b) => b.status === 'cancelled' && hostNet(b) > 0);
      const stayRevenue = stays.reduce((sum, b) => sum + hostNet(b), 0);
      const cancellationIncome = cancelled.reduce((sum, b) => sum + hostNet(b), 0);
      const totalNights = stays.reduce((sum, b) => sum + nights(b), 0);

      const propExpenses = expenses.filter((e) => e.property_id === prop.id);
      const totalExpenses = propExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const expensesByCategory: Record<string, number> = {};
      for (const e of propExpenses) {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + (e.amount || 0);
      }

      const revenue = stayRevenue + cancellationIncome;
      return {
        property_title: prop.title,
        property_id: prop.id,
        registration_number: prop.registration_number || null,
        total_revenue: revenue,
        cancellation_income: cancellationIncome,
        total_bookings: stays.length,
        cancelled_bookings: cancelled.length,
        total_nights: totalNights,
        // Per night stayed, so cancellation income doesn't inflate it
        avg_nightly_rate: totalNights > 0 ? Math.round(stayRevenue / totalNights) : 0,
        // Fee model A: the platform's service fee is paid by the guest, not deducted from the host
        platform_fees: 0,
        total_expenses: totalExpenses,
        expenses_by_category: expensesByCategory,
        net_income: revenue - totalExpenses,
      };
    });

    const total = (pick: (line: TaxReportLine) => number) => propertyLines.reduce((s, line) => s + pick(line), 0);
    const totalGross = total((p) => p.total_revenue);

    // Skatteverket — privatuthyrning (inkomst av kapital):
    //   taxable = gross rental income − 40 000 kr − 20 % of gross rental income, at least 0
    //   tax     = 30 % of taxable
    // The deductions apply to GROSS income; actual costs are not deductible on
    // top of them. Computed in whole kronor, as on the tax return.
    const grossSek = totalGross / 100;
    const additionalDeductionSek = grossSek * ADDITIONAL_DEDUCTION_RATE;
    const taxableAmountSek = Math.max(0, grossSek - SCHABLONAVDRAG_SEK - additionalDeductionSek);

    const report = {
      host_name: profile.full_name || profile.display_name || profile.host_business_name || 'Host',
      business_name: profile.host_business_name || null,
      host_email: user.email || '',
      tax_year: taxYear,
      generated_at: new Date().toISOString(),
      currency: 'SEK',
      amounts_in: 'ore',
      properties: propertyLines,
      summary: {
        total_gross_revenue: totalGross,
        total_cancellation_income: total((p) => p.cancellation_income),
        total_platform_fees: 0,
        total_expenses: total((p) => p.total_expenses),
        total_net_income: total((p) => p.net_income),
        total_bookings: total((p) => p.total_bookings),
        total_cancelled_bookings: total((p) => p.cancelled_bookings),
        total_nights: total((p) => p.total_nights),
      },
      skatteverket: {
        inkomstslag: 'Kapital (privatuthyrning)',
        schablonavdrag: SCHABLONAVDRAG_SEK * 100,
        additional_deduction: Math.round(additionalDeductionSek) * 100,
        taxable_amount: Math.round(taxableAmountSek) * 100,
        estimated_tax: Math.round(taxableAmountSek * CAPITAL_INCOME_TAX_RATE) * 100,
        note:
          'Uthyrning av privatbostad beskattas som inkomst av kapital. Beskattningsbart belopp = hyresintäkter − 40 000 kr − 20 % av hyresintäkterna. Skattesats 30 % på överskottet. Faktiska kostnader dras inte av utöver schablonavdragen. ' +
          'Rapporten omfattar bara bokningar via Nordic Getaways. Avdraget på 40 000 kr gäller per person och år för all uthyrning, så räkna ihop med andra kanaler (t.ex. Airbnb). Hyr du ut genom ett företag gäller inte de här reglerna. ' +
          'Avbokningar där du fick behålla en del av betalningen räknas som intäkt. Detta är en beräkningshjälp – kontrollera alltid mot Skatteverkets regler.',
      },
    };

    return json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Tax report error:', message);
    return json({ error: message || 'Failed to generate tax report' }, 500);
  }
});
