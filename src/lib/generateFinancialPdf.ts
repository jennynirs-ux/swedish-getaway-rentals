/**
 * The PDF version of the host's tax report (HostTaxReport), built with jsPDF.
 *
 * The report comes straight from generate-tax-report, so every amount is in
 * öre; formatKr (src/components/financials/taxReport.ts) is the one place it
 * is divided by 100, as on the page and in the CSV.
 */
import type { jsPDF as JsPdf } from 'jspdf';
import { stockholmDate } from '@/lib/constants';
import {
  type TaxReport,
  TAX_REPORT_SCOPE_NOTE,
  assertTaxReport,
  estimatedTaxOre,
  formatKr,
} from '@/components/financials/taxReport';

const LEFT = 14;
/**
 * jsPDF's built-in Helvetica draws Latin-1 (å, ä, ö are fine) but not the
 * Unicode minus, dashes or narrow spaces that sv-SE text and the function's
 * note contain; map those to plain characters.
 */
export const pdfSafe = (text: string): string =>
  String(text ?? '')
    .replace(/[\u2212\u2010-\u2015]/g, '-')
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f]/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/[^\t\n\r\x20-\x7e\u00a0-\u00ff]/g, '?');

const RIGHT = 196;
const PAGE_BOTTOM = 280;

/** Builds the PDF document (separate from saving it, so it can be tested). */
export async function buildTaxReportPdf(input: TaxReport): Promise<JsPdf> {
  const report = assertTaxReport(input);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 20;
  const put = (text: string, x: number, at: number, options?: { align: 'right' }) =>
    doc.text(pdfSafe(text), x, at, options);

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_BOTTOM) {
      doc.addPage();
      y = 20;
    }
  };
  const heading = (text: string) => {
    ensureSpace(14);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    put(text, LEFT, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 8;
  };
  /** A label on the left and an amount (öre) or count right-aligned */
  const line = (label: string, value: string) => {
    ensureSpace(6);
    put(label, LEFT, y);
    put(value, 110, y, { align: 'right' });
    y += 6;
  };
  const paragraph = (text: string, size = 8) => {
    doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(pdfSafe(text), RIGHT - LEFT);
    for (const l of lines) {
      ensureSpace(4);
      put(l, LEFT, y);
      y += 4;
    }
  };

  // Header
  doc.setFontSize(18);
  put('Nordic Getaways - Tax Report', LEFT, y);
  y += 10;
  doc.setFontSize(11);
  put(`Host: ${report.host_name}`, LEFT, y);
  y += 6;
  if (report.business_name && report.business_name !== report.host_name) {
    put(`Business name: ${report.business_name}`, LEFT, y);
    y += 6;
  }
  put(`Tax year: ${report.tax_year}`, LEFT, y);
  y += 6;
  put(`Generated: ${stockholmDate(report.generated_at || new Date())}`, LEFT, y);
  y += 12;

  // Summary
  const s = report.summary;
  heading('Summary');
  line('Gross income', formatKr(s.total_gross_revenue));
  if ((s.total_cancellation_income ?? 0) > 0) {
    line('  of which kept from cancellations', formatKr(s.total_cancellation_income));
  }
  line('Expenses (for your records)', s.total_expenses > 0 ? `-${formatKr(s.total_expenses)}` : formatKr(0));
  line('Net income', formatKr(s.total_net_income));
  line('Stays', String(s.total_bookings));
  line('Nights', String(s.total_nights));
  y += 4;

  // Skatteverket
  const skv = report.skatteverket;
  heading('Skatteverket - Inkomstdeklaration');
  line('Inkomstslag', skv.inkomstslag);
  line('Gross rental income', formatKr(s.total_gross_revenue));
  line('Schablonavdrag (standard deduction)', `-${formatKr(skv.schablonavdrag)}`);
  if (skv.additional_deduction != null) {
    line('20% avdrag (20% of gross income)', `-${formatKr(skv.additional_deduction)}`);
  }
  line('Taxable amount', formatKr(skv.taxable_amount));
  line('Estimated tax (30%)', formatKr(estimatedTaxOre(report)));
  y += 4;

  // Per-property breakdown
  heading('Property breakdown');
  const columns = () => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    put('Property', LEFT, y);
    put('Stays', 105, y, { align: 'right' });
    put('Nights', 122, y, { align: 'right' });
    put('Gross', 150, y, { align: 'right' });
    put('Expenses', 173, y, { align: 'right' });
    put('Net', RIGHT, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 6;
  };
  columns();

  for (const p of report.properties) {
    if (y + 10 > PAGE_BOTTOM) {
      doc.addPage();
      y = 20;
      columns();
    }
    doc.setFontSize(9);
    put(p.property_title.substring(0, 34), LEFT, y);
    put(String(p.total_bookings), 105, y, { align: 'right' });
    put(String(p.total_nights), 122, y, { align: 'right' });
    put(formatKr(p.total_revenue), 150, y, { align: 'right' });
    put(p.total_expenses > 0 ? `-${formatKr(p.total_expenses)}` : formatKr(0), 173, y, { align: 'right' });
    put(formatKr(p.net_income), RIGHT, y, { align: 'right' });
    y += 4;
    const details = [
      p.registration_number ? `Reg: ${p.registration_number}` : '',
      (p.cancellation_income ?? 0) > 0 ? `incl. ${formatKr(p.cancellation_income)} kept from cancellations` : '',
    ].filter(Boolean);
    if (details.length) {
      doc.setFontSize(7);
      doc.setTextColor(110);
      put(details.join('  |  '), LEFT, y);
      doc.setTextColor(0);
      y += 4;
    }
    y += 1;
  }

  // Notes
  y += 6;
  doc.setTextColor(90);
  paragraph(TAX_REPORT_SCOPE_NOTE);
  y += 2;
  paragraph(skv.note);
  y += 2;
  paragraph('OBS: Detta är en beräkningshjälp - kontrollera alltid mot Skatteverkets aktuella regler. Not tax advice.');
  doc.setTextColor(0);

  return doc;
}

/** Downloads the tax report as a PDF */
export async function generateTaxReportPdf(report: TaxReport): Promise<void> {
  const doc = await buildTaxReportPdf(report);
  doc.save(`nordic-getaways-tax-report-${report.tax_year}.pdf`);
}
