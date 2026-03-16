import { useState, useEffect } from "react";

interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  SEK: "kr",
  EUR: "€",
  USD: "$",
  GBP: "£",
  NOK: "kr",
  DKK: "kr",
};

// Fallback rates for Nordic currencies (approximate rates relative to SEK)
const FALLBACK_RATES: Record<string, number> = {
  SEK: 1,
  NOK: 0.95,
  DKK: 0.13,
  EUR: 10.5,
  USD: 10.2,
  GBP: 12.8,
};

export const useCurrencyConversion = () => {
  const [rates, setRates] = useState<ExchangeRates>({ SEK: 1 });
  const [userCurrency, setUserCurrency] = useState<CurrencyInfo>({
    code: "SEK",
    symbol: "kr",
    rate: 1,
  });

  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Create an AbortController with 5-second timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          // Using free API with SEK as base currency
          const response = await fetch(
            "https://api.exchangerate-api.com/v4/latest/SEK",
            { signal: controller.signal }
          );

          clearTimeout(timeoutId);

          // Check if response is successful before parsing JSON
          if (!response.ok) {
            throw new Error(`Exchange rate API returned status ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          setRates(data.rates || FALLBACK_RATES);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error("Exchange rate fetch timeout after 5 seconds");
          }
          throw fetchError;
        }
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
        // Log warning to inform user that fallback rates are being used
        console.warn("Using fallback exchange rates. Live rates may be unavailable. Please refresh the page later for updated rates.");
        // Use fallback rates when API fails
        setRates(FALLBACK_RATES);
      }
    };

    fetchRates();
    // Refresh rates every 24 hours
    const interval = setInterval(fetchRates, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const detectUserCurrency = () => {
      // Try to detect from browser locale
      const locale = navigator.language || "sv-SE";
      const country = locale.split("-")[1] || "SE";

      const currencyMap: Record<string, string> = {
        SE: "SEK",
        NO: "NOK",
        DK: "DKK",
        GB: "GBP",
        US: "USD",
      };

      // Default to EUR for other EU countries
      const euCountries = [
        "DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI", "GR"
      ];
      
      let detectedCurrency = currencyMap[country];
      if (!detectedCurrency && euCountries.includes(country)) {
        detectedCurrency = "EUR";
      }
      
      const currencyCode = detectedCurrency || "SEK";
      const rate = rates[currencyCode] || 1;

      setUserCurrency({
        code: currencyCode,
        symbol: CURRENCY_SYMBOLS[currencyCode] || currencyCode,
        rate,
      });
    };

    detectUserCurrency();
  }, [rates]);

  const convertPrice = (priceInSEK: number, targetCurrency?: string): number => {
    const currency = targetCurrency || userCurrency.code;
    // If rate is undefined for unknown currencies, fallback to original SEK amount
    const rate = rates[currency] !== undefined ? rates[currency] : 1;
    const converted = Math.round(priceInSEK * rate);
    // Return original amount if conversion resulted in NaN
    return isNaN(converted) ? priceInSEK : converted;
  };

  const formatPrice = (priceInSEK: number, targetCurrency?: string): string => {
    const currency = targetCurrency || userCurrency.code;
    const converted = convertPrice(priceInSEK, currency);
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${converted.toLocaleString()} ${symbol}`;
  };

  return {
    userCurrency,
    rates,
    convertPrice,
    formatPrice,
  };
};
