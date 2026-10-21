import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NORDIC_GETAWAYS_ONLY_LABEL, functionErrorMessage, stockholmYear } from '@/components/financials/reporting';
import { YearSelect } from '@/components/financials/YearSelect';
import { useFinancialYears } from '@/components/financials/useFinancialYears';
import {
  type TaxReport,
  assertTaxReport,
  estimatedTaxOre,
  formatKr,
  taxReportCsv,
} from '@/components/financials/taxReport';

/**
 * The host's annual tax summary (privatuthyrning). Every amount from
 * generate-tax-report is in öre; formatKr and the CSV/PDF helpers in
 * financials/taxReport.ts are the only places they are converted to kronor.
 */
export const HostTaxReport = () => {
  const [report, setReport] = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  // Default to last year (the one being declared). The list runs back to the
  // host's first check-in year and stops at the current year: the function
  // does not report on future years.
  const currentYear = stockholmYear();
  const { year: selectedYear, setYear, years } = useFinancialYears('host', {
    initialYear: currentYear - 1,
    maxYear: currentYear,
  });

  const selectYear = (year: number) => {
    request.current += 1; // drop a report still loading for the previous year
    setYear(year);
    setReport(null);
    setError(null);
    setLoading(false);
  };

  const generateReport = async () => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-tax-report', {
        body: { year: selectedYear },
      });
      if (fnError) throw fnError;
      const checked = assertTaxReport(data);
      if (id === request.current) setReport(checked);
    } catch (err) {
      // Show the function's own reason (e.g. "You have no listings yet"), not supabase-js's generic non-2xx message
      const message = await functionErrorMessage(err, 'Could not generate the tax report');
      if (id === request.current) {
        setReport(null);
        setError(message);
      }
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!report) return;
    const blob = new Blob(['﻿' + taxReportCsv(report)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skatteverket-tax-report-${report.tax_year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!report) return;
    try {
      const { generateTaxReportPdf } = await import('@/lib/generateFinancialPdf');
      await generateTaxReportPdf(report);
    } catch (err) {
      setError(err instanceof Error && err.message ? `Could not create the PDF: ${err.message}` : 'Could not create the PDF');
    }
  };

  /** A cost as "-1 234 kr", and "0 kr" rather than "-0 kr" */
  const formatCost = (ore: number) => (ore > 0 ? `-${formatKr(ore)}` : formatKr(0));
  const cancellationIncome = report?.summary.total_cancellation_income ?? 0;
  const additionalDeduction = report?.skatteverket.additional_deduction;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Report (Skatteverket)
          </CardTitle>
          <CardDescription>
            An annual summary of your rental income for Swedish tax filing, as a private person renting out
            (privatuthyrning, inkomst av kapital).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>
              {NORDIC_GETAWAYS_ONLY_LABEL}, counted by check-in date. Income from Airbnb, Booking.com or other channels
              is not included: add it yourself.
            </li>
            <li>
              The standard deduction is 40 000 kr per person and year across all your private rentals, plus 20% of the
              rental income for a house you own. If you also rent out elsewhere, the deduction shown here is too high.
            </li>
            <li>
              Rent out through a company or as a sole trader? Then this calculation does not apply: the income belongs
              in your business accounts.
            </li>
          </ul>
          <div className="flex items-center gap-3">
            <YearSelect years={years} value={selectedYear} onChange={selectYear} />
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
                <p className="text-xs text-muted-foreground">Gross Income</p>
                <p className="text-xl font-bold">{formatKr(report.summary.total_gross_revenue)}</p>
                {cancellationIncome > 0 && (
                  <p className="text-xs text-muted-foreground">
                    incl. {formatKr(cancellationIncome)} kept from cancellations
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-xl font-bold text-destructive">{formatCost(report.summary.total_expenses)}</p>
                <p className="text-xs text-muted-foreground">for your records, not deductible here</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Net Income</p>
                <p className="text-xl font-bold">{formatKr(report.summary.total_net_income)}</p>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground font-semibold">Taxable Amount</p>
                <p className="text-xl font-bold text-primary">{formatKr(report.skatteverket.taxable_amount)}</p>
                <p className="text-xs text-muted-foreground">
                  after {formatKr(report.skatteverket.schablonavdrag)}
                  {additionalDeduction != null && <> and 20% ({formatKr(additionalDeduction)})</>} deductions
                </p>
                <p className="text-xs text-muted-foreground">Tax ~{formatKr(estimatedTaxOre(report))}</p>
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
              <div>
                <CardTitle className="text-lg">Property Breakdown — {report.tax_year}</CardTitle>
                <CardDescription>{NORDIC_GETAWAYS_ONLY_LABEL}, by check-in date</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={downloadPdf}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Property</th>
                      <th className="text-right py-2 px-2">Stays</th>
                      <th className="text-right py-2 px-2">Nights</th>
                      <th className="text-right py-2 px-2">Gross</th>
                      <th className="text-right py-2 px-2">Expenses</th>
                      <th className="text-right py-2 pl-2">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.properties.map((p) => (
                      <tr key={p.property_id} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
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
                        <td className="text-right py-2 px-2">
                          {formatKr(p.total_revenue)}
                          {(p.cancellation_income ?? 0) > 0 && (
                            <p className="text-xs text-muted-foreground font-normal">
                              incl. {formatKr(p.cancellation_income)} cancellations
                            </p>
                          )}
                        </td>
                        <td className="text-right py-2 px-2 text-destructive">{formatCost(p.total_expenses)}</td>
                        <td className="text-right py-2 pl-2 font-medium">{formatKr(p.net_income)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="py-2 pr-4">Total</td>
                      <td className="text-right py-2 px-2">{report.summary.total_bookings}</td>
                      <td className="text-right py-2 px-2">{report.summary.total_nights}</td>
                      <td className="text-right py-2 px-2">{formatKr(report.summary.total_gross_revenue)}</td>
                      <td className="text-right py-2 px-2 text-destructive">{formatCost(report.summary.total_expenses)}</td>
                      <td className="text-right py-2 pl-2">{formatKr(report.summary.total_net_income)}</td>
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
