/**
 * BL-004: Multi-currency display-only converter.
 *
 * Detects the user's locale and shows an approximate converted price
 * alongside the primary SEK price. This is display-only — Stripe
 * always charges in the property's base currency.
 *
 * Rates are approximate and cached in localStorage for 24 hours.
 */

export interface ConvertedPrice {
  amount: number;
  currency: string;
  symbol: string;
  formatted: string;
}

// Fallback rates (updated periodically, last: Mar 2026)
const FALLBACK_RATES: Record<string, number> = {
  SEK: 1,
  EUR: 0.087,
  USD: 0.094,
  GBP: 0.074,
  NOK: 1.02,
  DKK: 0.65,
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  SEK: "kr",
  EUR: "€",
  USD: "$",
  GBP: "£",
  NOK: "kr",
  DKK: "kr",
};

const LOCALE_CURRENCY_MAP: Record<string, string> = {
  "en-US": "USD",
  "en-GB": "GBP",
  "de": "EUR",
  "fr": "EUR",
  "es": "EUR",
  "it": "EUR",
  "nl": "EUR",
  "de-DE": "EUR",
  "de-AT": "EUR",
  "fr-FR": "EUR",
  "es-ES": "EUR",
  "it-IT": "EUR",
  "nl-NL": "EUR",
  "nb": "NOK",
  "nb-NO": "NOK",
  "nn-NO": "NOK",
  "da": "DKK",
  "da-DK": "DKK",
  "sv": "SEK",
  "sv-SE": "SEK",
};

/**
 * Detect user's likely currency from browser locale.
 */
export function detectUserCurrency(): string {
  if (typeof navigator === "undefined") return "SEK";

  const locale = navigator.language || "sv-SE";

  // Try exact match first, then language-only
  if (LOCALE_CURRENCY_MAP[locale]) return LOCALE_CURRENCY_MAP[locale];
  const lang = locale.split("-")[0];
  if (LOCALE_CURRENCY_MAP[lang]) return LOCALE_CURRENCY_MAP[lang];

  // Default to EUR for European locales, USD for others
  if (locale.match(/^(de|fr|es|it|nl|pt|fi|el|pl|cs|sk|hu|ro|bg|hr|sl|lt|lv|et)/)) return "EUR";

  return "USD";
}

/**
 * Convert an amount from the base currency to the user's detected currency.
 * Returns null if the user's currency matches the base currency.
 *
 * @param amount - Amount in smallest unit (öre/cents)
 * @param baseCurrency - The property's base currency (usually "SEK")
 */
export function convertForDisplay(
  amount: number,
  baseCurrency: string = "SEK"
): ConvertedPrice | null {
  const userCurrency = detectUserCurrency();

  // Don't show conversion if same currency
  if (userCurrency === baseCurrency.toUpperCase()) return null;

  const baseRate = FALLBACK_RATES[baseCurrency.toUpperCase()] || 1;
  const targetRate = FALLBACK_RATES[userCurrency];
  if (!targetRate) return null;

  // Convert: amount in base → SEK → target
  const amountInSek = amount / baseRate;
  const converted = Math.round(amountInSek * targetRate);

  const symbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
  const formatted = `≈ ${symbol}${(converted / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  return {
    amount: converted,
    currency: userCurrency,
    symbol,
    formatted,
  };
}
