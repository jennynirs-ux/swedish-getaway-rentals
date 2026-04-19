/**
 * Swedish rental income tax calculation (Skatteverket — privatuthyrning).
 *
 * Reference: https://www.skatteverket.se/privat/skatter/arbeteochinkomst/
 *   inkomster/uthyrning/uthyrningavprivatbostad.4.html
 *
 * Rules:
 *   - Applies to private individuals renting their own home short-term
 *   - Schablonavdrag: 40,000 SEK standard deduction per year
 *   - Additional deduction: 20% of gross rental income
 *   - Taxable amount = max(0, gross - 40,000 - 20% of gross)
 *   - Taxed as capital income at 30%
 *   - Platform fees and actual expenses are NOT separately deductible
 *     (they are deemed covered by the standard deduction)
 *
 * All inputs/outputs here are in SEK (not ore). Callers are responsible
 * for converting to/from ore when reading from / writing to the database.
 *
 * This module is a PURE function with no side effects — safe to unit test.
 */

export const SKATTEVERKET_SCHABLONAVDRAG_SEK = 40_000;
export const SKATTEVERKET_ADDITIONAL_DEDUCTION_RATE = 0.20;
export const SKATTEVERKET_CAPITAL_TAX_RATE = 0.30;

export interface SkatteverketCalculation {
  /** Gross rental income before any deductions (SEK) */
  grossIncomeSek: number;
  /** Standard deduction (always 40,000 SEK) */
  schablonavdragSek: number;
  /** Additional 20% deduction of gross */
  additionalDeductionSek: number;
  /** Taxable amount: max(0, gross - schablonavdrag - additional) */
  taxableAmountSek: number;
  /** Estimated tax at 30% on taxable amount */
  estimatedTaxSek: number;
}

/**
 * Calculate Skatteverket tax for a given gross rental income.
 *
 * @example
 * // Gross 100,000 SEK: 100,000 - 40,000 - 20,000 = 40,000 taxable, 12,000 tax
 * calculateSkatteverketTax(100_000)
 * // => { grossIncomeSek: 100000, schablonavdragSek: 40000,
 * //      additionalDeductionSek: 20000, taxableAmountSek: 40000,
 * //      estimatedTaxSek: 12000 }
 *
 * @example
 * // Gross 30,000 SEK: below schablonavdrag threshold → taxable = 0
 * calculateSkatteverketTax(30_000)
 * // => { grossIncomeSek: 30000, schablonavdragSek: 40000,
 * //      additionalDeductionSek: 6000, taxableAmountSek: 0,
 * //      estimatedTaxSek: 0 }
 *
 * @example
 * // Gross 0: all zeros
 * calculateSkatteverketTax(0)
 * // => { grossIncomeSek: 0, schablonavdragSek: 40000,
 * //      additionalDeductionSek: 0, taxableAmountSek: 0,
 * //      estimatedTaxSek: 0 }
 *
 * @example
 * // Gross 50,000: 50,000 - 40,000 - 10,000 = 0 taxable (break-even)
 * calculateSkatteverketTax(50_000)
 * // => taxableAmountSek: 0
 *
 * @example
 * // Gross 200,000: 200,000 - 40,000 - 40,000 = 120,000 taxable, 36,000 tax
 * calculateSkatteverketTax(200_000)
 * // => { taxableAmountSek: 120000, estimatedTaxSek: 36000 }
 */
export function calculateSkatteverketTax(grossIncomeSek: number): SkatteverketCalculation {
  const gross = Math.max(0, grossIncomeSek);
  const additionalDeductionSek = gross * SKATTEVERKET_ADDITIONAL_DEDUCTION_RATE;
  const taxableAmountSek = Math.max(
    0,
    gross - SKATTEVERKET_SCHABLONAVDRAG_SEK - additionalDeductionSek,
  );
  const estimatedTaxSek = taxableAmountSek * SKATTEVERKET_CAPITAL_TAX_RATE;

  return {
    grossIncomeSek: gross,
    schablonavdragSek: SKATTEVERKET_SCHABLONAVDRAG_SEK,
    additionalDeductionSek,
    taxableAmountSek,
    estimatedTaxSek,
  };
}

/**
 * Format a SEK amount using Swedish locale (e.g., "42 500 kr").
 */
export function formatSek(amountSek: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amountSek);
}

/**
 * Convert ore (smallest currency unit, 1/100 SEK) to SEK.
 * Database stores amounts in ore; UI typically displays in SEK.
 */
export function oreToSek(amountOre: number): number {
  return amountOre / 100;
}

/**
 * Convert SEK to ore for database storage.
 */
export function sekToOre(amountSek: number): number {
  return Math.round(amountSek * 100);
}
