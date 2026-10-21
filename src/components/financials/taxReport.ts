/**
 * The tax report returned by the generate-tax-report edge function, and the
 * helpers that turn it into text for the page (HostTaxReport), the CSV and the
 * PDF (src/lib/generateFinancialPdf.ts).
 *
 * Units: every amount in the response is in öre, like the database
 * (`amounts_in: "ore"`). The page, CSV and PDF keep the raw öre values and
 * convert only through oreToKr/formatKr/wholeKr below, so each amount is
 * divided by 100 exactly once.
 */
import { NORDIC_GETAWAYS_ONLY_LABEL } from "./reporting";

export interface TaxReportProperty {
  property_title: string;
  property_id: string;
  registration_number: string | null;
  /** What the host received (öre): stays plus cancellation income */
  total_revenue: number;
  /** Part of total_revenue the host kept from cancelled bookings (öre); absent on older function versions */
  cancellation_income?: number;
  /** Stays (confirmed and completed bookings) */
  total_bookings: number;
  cancelled_bookings?: number;
  total_nights: number;
  /** Öre per night stayed */
  avg_nightly_rate: number;
  total_expenses: number;
  expenses_by_category: Record<string, number>;
  net_income: number;
}

export interface TaxReport {
  host_name: string;
  business_name?: string | null;
  host_email: string;
  tax_year: number;
  generated_at: string;
  currency: string;
  /** Unit of every amount; missing on older function versions, which also returned öre */
  amounts_in?: "ore";
  properties: TaxReportProperty[];
  summary: {
    total_gross_revenue: number;
    /** Part of total_gross_revenue kept from cancelled bookings (öre) */
    total_cancellation_income?: number;
    total_expenses: number;
    total_net_income: number;
    total_bookings: number;
    total_cancelled_bookings?: number;
    total_nights: number;
  };
  skatteverket: {
    inkomstslag: string;
    /** The 40 000 kr standard deduction (öre) */
    schablonavdrag: number;
    /** 20% of the gross rental income (öre) */
    additional_deduction?: number;
    taxable_amount: number;
    /** 30% of taxable_amount (öre) */
    estimated_tax?: number;
    note: string;
  };
}

/**
 * Checks the unit before anything is shown: a response in any unit other than
 * öre would make every amount 100 times off.
 */
export function assertTaxReport(data: unknown): TaxReport {
  const report = data as TaxReport | null;
  if (!report || typeof report !== "object" || !Array.isArray(report.properties) || !report.summary || !report.skatteverket) {
    throw new Error("The tax report came back incomplete. Please try again.");
  }
  if (report.amounts_in != null && report.amounts_in !== "ore") {
    throw new Error(`The tax report came back in an unexpected unit (${String(report.amounts_in)}).`);
  }
  return report;
}

/** Öre to kronor. The only place a tax report amount is divided by 100. */
export const oreToKr = (ore: number | null | undefined): number => (Number(ore) || 0) / 100;

/** Whole kronor, halves rounded away from zero so a cost and its negative match; never -0 */
export const wholeKr = (ore: number | null | undefined): number => {
  const kr = oreToKr(ore);
  return Math.round(Math.abs(kr)) === 0 ? 0 : Math.sign(kr) * Math.round(Math.abs(kr));
};

/**
 * "12 345 kr" from öre. Plain ASCII minus and spaces (sv-SE formatting uses
 * U+2212 and no-break spaces, which the PDF's built-in font cannot draw).
 */
export function formatKr(ore: number | null | undefined): string {
  const kr = wholeKr(ore);
  return `${kr < 0 ? "-" : ""}${Math.abs(kr).toLocaleString("sv-SE").replace(/\s/g, " ")} kr`;
}

/** Estimated tax (öre): the function's figure, or 30% of the taxable amount on older versions */
export const estimatedTaxOre = (report: TaxReport): number =>
  report.skatteverket.estimated_tax ?? Math.round(report.skatteverket.taxable_amount * 0.3);

/**
 * One CSV cell: text is always quoted with inner quotes doubled, and text that
 * a spreadsheet would run as a formula (= + - @, tab, CR) gets a leading
 * apostrophe. Numbers are written as they are.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Explains the scope of the report, for the CSV and the PDF */
export const TAX_REPORT_SCOPE_NOTE =
  `${NORDIC_GETAWAYS_ONLY_LABEL}, by check-in date. The 40 000 kr deduction is per person and year across all ` +
  "your private rentals, so add income from other channels yourself. Actual costs are not deductible on top of the " +
  "standard deductions; expenses are shown for your own records.";

/** The CSV file (amounts in whole kronor) */
export function taxReportCsv(report: TaxReport): string {
  const headers = [
    "Property",
    "Registration #",
    "Stays",
    "Nights",
    "Gross income (SEK)",
    "of which cancellations (SEK)",
    "Expenses (SEK)",
    "Net (SEK)",
  ];
  const width = headers.length;
  const labelled = (label: string, ore: number) => {
    const row: (string | number)[] = Array(width).fill("");
    row[0] = label;
    row[width - 1] = wholeKr(ore);
    return row;
  };

  const rows: (string | number | null)[][] = report.properties.map((p) => [
    p.property_title,
    p.registration_number,
    p.total_bookings,
    p.total_nights,
    wholeKr(p.total_revenue),
    wholeKr(p.cancellation_income),
    wholeKr(p.total_expenses),
    wholeKr(p.net_income),
  ]);
  const s = report.summary;
  rows.push([]);
  rows.push([
    "TOTAL",
    "",
    s.total_bookings,
    s.total_nights,
    wholeKr(s.total_gross_revenue),
    wholeKr(s.total_cancellation_income),
    wholeKr(s.total_expenses),
    wholeKr(s.total_net_income),
  ]);
  rows.push([]);
  rows.push(labelled("Gross rental income", s.total_gross_revenue));
  rows.push(labelled("Schablonavdrag (standard deduction)", -report.skatteverket.schablonavdrag));
  if (report.skatteverket.additional_deduction != null) {
    rows.push(labelled("20% avdrag (20% of gross income)", -report.skatteverket.additional_deduction));
  }
  rows.push(labelled("Taxable amount", report.skatteverket.taxable_amount));
  rows.push(labelled("Estimated tax (30%)", estimatedTaxOre(report)));
  rows.push([]);
  rows.push([TAX_REPORT_SCOPE_NOTE]);

  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
