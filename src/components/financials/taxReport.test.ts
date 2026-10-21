import { describe, expect, it } from "vitest";
import { type TaxReport, assertTaxReport, csvCell, estimatedTaxOre, formatKr, taxReportCsv, wholeKr } from "./taxReport";
import { buildTaxReportPdf, pdfSafe } from "@/lib/generateFinancialPdf";

/** As generate-tax-report returns it: every amount in öre */
const report: TaxReport = {
  host_name: "Anna Host",
  host_email: "anna@example.com",
  tax_year: 2025,
  generated_at: "2026-01-10T09:00:00Z",
  currency: "SEK",
  amounts_in: "ore",
  properties: [
    {
      property_title: 'Stuga "Fjället", Åre',
      property_id: "p1",
      registration_number: "=HYPERLINK(1)",
      total_revenue: 10_000_000, // 100 000 kr
      cancellation_income: 500_000, // 5 000 kr
      total_bookings: 8,
      cancelled_bookings: 1,
      total_nights: 30,
      avg_nightly_rate: 316_667,
      total_expenses: 1_250_050, // 12 500,50 kr
      expenses_by_category: { cleaning: 1_250_050 },
      net_income: 8_749_950,
    },
  ],
  summary: {
    total_gross_revenue: 10_000_000,
    total_cancellation_income: 500_000,
    total_expenses: 1_250_050,
    total_net_income: 8_749_950,
    total_bookings: 8,
    total_cancelled_bookings: 1,
    total_nights: 30,
  },
  skatteverket: {
    inkomstslag: "Kapital (privatuthyrning)",
    schablonavdrag: 4_000_000,
    additional_deduction: 2_000_000,
    taxable_amount: 4_000_000,
    estimated_tax: 1_200_000,
    note: "Beskattningsbart belopp = hyresintäkter − 40 000 kr − 20 % av hyresintäkterna.",
  },
};

describe("tax report amounts", () => {
  it("divides öre by 100 exactly once", () => {
    expect(formatKr(10_000_000)).toBe("100 000 kr");
    expect(formatKr(-1_250_050)).toBe("-12 501 kr");
    expect(formatKr(0)).toBe("0 kr");
    expect(formatKr(-40)).toBe("0 kr"); // never "-0 kr"
    expect(formatKr(undefined)).toBe("0 kr");
    expect(wholeKr(4_000_000)).toBe(40_000);
  });

  it("uses the function's estimated tax, or 30% of the taxable amount on older versions", () => {
    expect(estimatedTaxOre(report)).toBe(1_200_000);
    expect(estimatedTaxOre({ ...report, skatteverket: { ...report.skatteverket, estimated_tax: undefined } })).toBe(1_200_000);
  });

  it("refuses a report in another unit and accepts older reports without one", () => {
    expect(() => assertTaxReport({ ...report, amounts_in: "sek" })).toThrow(/unexpected unit/);
    expect(assertTaxReport({ ...report, amounts_in: undefined }).tax_year).toBe(2025);
    expect(() => assertTaxReport({ error: "x" })).toThrow(/incomplete/);
  });
});

describe("tax report CSV", () => {
  it("quotes text, doubles quotes and neutralises formulas", () => {
    expect(csvCell('Stuga "Fjället", Åre')).toBe('"Stuga ""Fjället"", Åre"');
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("+46")).toBe(`"'+46"`);
    expect(csvCell("@x")).toBe(`"'@x"`);
    expect(csvCell(-500)).toBe("-500");
    expect(csvCell(null)).toBe("");
  });

  it("writes whole kronor, the 20% deduction and the estimated tax", () => {
    const lines = taxReportCsv(report).split("\n");
    expect(lines[0]).not.toContain("Platform");
    expect(lines[1]).toBe(`"Stuga ""Fjället"", Åre","'=HYPERLINK(1)",8,30,100000,5000,12501,87500`);
    expect(lines).toContain(`"TOTAL","",8,30,100000,5000,12501,87500`);
    expect(lines).toContain(`"Schablonavdrag (standard deduction)","","","","","","",-40000`);
    expect(lines).toContain(`"20% avdrag (20% of gross income)","","","","","","",-20000`);
    expect(lines).toContain(`"Taxable amount","","","","","","",40000`);
    expect(lines).toContain(`"Estimated tax (30%)","","","","","","",12000`);
  });
});

describe("tax report PDF", () => {
  it("prints kronor (öre divided once), cancellations and the 20% deduction", async () => {
    const doc = await buildTaxReportPdf(report);
    const pdf = doc.output();
    expect(pdf).toContain("(100 000 kr)");
    expect(pdf).toContain("(-40 000 kr)");
    expect(pdf).toContain("(-20 000 kr)");
    expect(pdf).toContain("(12 000 kr)");
    expect(pdf).toContain("kept from cancellations");
    expect(pdf).not.toContain("10 000 000");
    expect(pdf).not.toContain("Platform");
  });

  it("only draws characters the built-in font has", () => {
    expect(pdfSafe("intäkter − 40 000 kr – 20 %")).toBe("intäkter - 40 000 kr - 20 %");
    expect(pdfSafe("a b ✓")).toBe("a b ?");
  });
});
