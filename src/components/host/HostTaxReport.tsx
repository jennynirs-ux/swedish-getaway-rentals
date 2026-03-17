import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaxReportProperty {
  property_title: string;
  property_id: string;
  registration_number: string | null;
  total_revenue: number;
  total_bookings: number;
  total_nights: number;
  avg_nightly_rate: number;
  platform_fees: number;
  net_income: number;
}

interface TaxReport {
  host_name: string;
  host_email: string;
  tax_year: number;
  generated_at: string;
  currency: string;
  properties: TaxReportProperty[];
  summary: {
    total_gross_revenue: number;
    total_platform_fees: number;
    total_net_income: number;
    total_bookings: number;
    total_nights: number;
  };
  skatteverket: {
    inkomstslag: string;
    schablonavdrag: number;
    taxable_amount: number;
    note: string;
  };
}

export const HostTaxReport = () => {
  const [report, setReport] = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);

  const formatSEK = (amount: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('generate-tax-report', {
        body: { year: selectedYear },
      });

      if (fnError) throw fnError;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!report) return;

    const headers = ['Property', 'Registration #', 'Bookings', 'Nights', 'Gross Revenue (SEK)', 'Platform Fees (SEK)', 'Net Income (SEK)'];
    const rows = report.properties.map((p) => [
      `"${p.property_title}"`,
      p.registration_number || '',
      p.total_bookings,
      p.total_nights,
      p.total_revenue,
      p.platform_fees,
      p.net_income,
    ]);

    rows.push([]);
    rows.push(['TOTAL', '', report.summary.total_bookings, report.summary.total_nights, report.summary.total_gross_revenue, report.summary.total_platform_fees, report.summary.total_net_income]);
    rows.push([]);
    rows.push(['Schablonavdrag', '', '', '', '', '', report.skatteverket.schablonavdrag]);
    rows.push(['Taxable Amount', '', '', '', '', '', report.skatteverket.taxable_amount]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${report.tax_year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Report (Skatteverket)
          </CardTitle>
          <CardDescription>
            Generate annual revenue summaries for Swedish tax filing. Reports follow Skatteverket rules for rental income (inkomst av kapital).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border rounded-md px-3 py-2 text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Button onClick={generateReport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Gross Revenue</p>
                <p className="text-xl font-bold">{formatSEK(report.summary.total_gross_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Platform Fees</p>
                <p className="text-xl font-bold text-destructive">-{formatSEK(report.summary.total_platform_fees)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Net Income</p>
                <p className="text-xl font-bold">{formatSEK(report.summary.total_net_income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Taxable Amount</p>
                <p className="text-xl font-bold text-primary">{formatSEK(report.skatteverket.taxable_amount)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Skatteverket info */}
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Skatteverket — {report.skatteverket.inkomstslag}</strong>
              <br />
              {report.skatteverket.note}
            </AlertDescription>
          </Alert>

          {/* Per-property breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Property Breakdown — {report.tax_year}</CardTitle>
              <Button variant="outline" size="sm" onClick={downloadCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Property</th>
                      <th className="text-right py-2 px-2">Bookings</th>
                      <th className="text-right py-2 px-2">Nights</th>
                      <th className="text-right py-2 px-2">Gross</th>
                      <th className="text-right py-2 px-2">Fees</th>
                      <th className="text-right py-2 pl-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.properties.map((p) => (
                      <tr key={p.property_id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{p.property_title}</p>
                              {p.registration_number && (
                                <p className="text-xs text-muted-foreground">Reg: {p.registration_number}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-2 px-2">{p.total_bookings}</td>
                        <td className="text-right py-2 px-2">{p.total_nights}</td>
                        <td className="text-right py-2 px-2">{formatSEK(p.total_revenue)}</td>
                        <td className="text-right py-2 px-2 text-destructive">-{formatSEK(p.platform_fees)}</td>
                        <td className="text-right py-2 pl-2 font-medium">{formatSEK(p.net_income)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="py-2 pr-4">Total</td>
                      <td className="text-right py-2 px-2">{report.summary.total_bookings}</td>
                      <td className="text-right py-2 px-2">{report.summary.total_nights}</td>
                      <td className="text-right py-2 px-2">{formatSEK(report.summary.total_gross_revenue)}</td>
                      <td className="text-right py-2 px-2 text-destructive">-{formatSEK(report.summary.total_platform_fees)}</td>
                      <td className="text-right py-2 pl-2">{formatSEK(report.summary.total_net_income)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
