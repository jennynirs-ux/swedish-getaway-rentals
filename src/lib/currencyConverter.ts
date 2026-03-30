/**
 * Multi-currency display-only converter.
 *
 * Fetches live rates from frankfurter.app (free, no API key),
 * caches in localStorage for 24 hours, falls back to hardcoded rates.
 *
 * This is display-only — Stripe charges in the property's base currency.
 */

export interface ConvertedPrice {
  amount: number;
  currency: string;
  symbol: string;
  formatted: string;
}

// Fallback rates if API is unreachable (last updated: Mar 2026)
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
  "de": "EUR", "de-DE": "EUR", "de-AT": "EUR",
  "fr": "EUR", "fr-FR": "EUR",
  "es": "EUR", "es-ES": "EUR",
  "it": "EUR", "it-IT": "EUR",
  "nl": "EUR", "nl-NL": "EUR",
  "fi": "EUR", "fi-FI": "EUR",
  "nb": "NOK", "nb-NO": "NOK", "nn-NO": "NOK",
  "da": "DKK", "da-DK": "DKK",
  "sv": "SEK", "sv-SE": "SEK",
};

const CACHE_KEY = "ng_exchange_rates";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch live exchange rates from Frankfurter API (free, no key needed).
 * Caches in localStorage for 24 hours.
 */
async function getLiveRates(): Promise<Record<string, number>> {
  if (typeof window === "undefined") return FALLBACK_RATES;

  // Check cache
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { rates, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL && rates) {
        return rates;
      }
    }
  } catch {
    // Corrupted cache — ignore
  }

  // Fetch live rates
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=SEK&to=EUR,USD,GBP,NOK,DKK");
    if (res.ok) {
      const data = await res.json();
      const rates: Record<string, number> = { SEK: 1, ...data.rates };
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
      return rates;
    }
  } catch {
    // API unreachable — use fallback
  }

  return FALLBACK_RATES;
}

// Pre-fetch rates on module load (non-blocking)
let _cachedRates: Record<string, number> = FALLBACK_RATES;
if (typeof window !== "undefined") {
  getLiveRates().then((rates) => { _cachedRates = rates; });
}

/**
 * Detect user's likely currency from browser locale.
 */
export function detectUserCurrency(): string {
  if (typeof navigator === "undefined") return "SEK";

  const locale = navigator.language || "sv-SE";
  if (LOCALE_CURRENCY_MAP[locale]) return LOCALE_CURRENCY_MAP[locale];
  const lang = locale.split("-")[0];
  if (lang && LOCALE_CURRENCY_MAP[lang]) return LOCALE_CURRENCY_MAP[lang];

  // Default to EUR for European locales, USD for others
  if (locale.match(/^(de|fr|es|it|nl|pt|fi|el|pl|cs|sk|hu|ro|bg|hr|sl|lt|lv|et)/)) return "EUR";
  return "USD";
}

/**
 * Convert amount from base currency to user's detected currency.
 * Returns null if same currency.
 *
 * @param amount - Amount in smallest unit (öre/cents)
 * @param baseCurrency - Property's base currency (usually "SEK")
 */
export function convertForDisplay(
  amount: number,
  baseCurrency: string = "SEK"
): ConvertedPrice | null {
  const userCurrency = detectUserCurrency();
  if (userCurrency === baseCurrency.toUpperCase()) return null;

  const baseRate = _cachedRates[baseCurrency.toUpperCase()] || 1;
  const targetRate = _cachedRates[userCurrency];
  if (!targetRate) return null;

  // Convert: amount in base → SEK → target
  const amountInSek = amount / baseRate;
  const converted = Math.round(amountInSek * targetRate);

  const symbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;
  const formatted = `≈ ${symbol}${(converted / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  return { amount: converted, currency: userCurrency, symbol, formatted };
}
