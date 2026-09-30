// Shop shipping, shared by the cart page and create-cart-payment so the price
// shown is the price charged. Rates come from platform_settings.shipping_settings
// (Admin → Shop → Shipping): one rate per region, in öre.

export const SHIP_COUNTRIES: Record<string, string> = {
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  DE: "Germany",
  NL: "Netherlands",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
};

const EUROPE = new Set(["NO", "DK", "FI", "DE", "NL", "FR", "ES", "IT", "GB"]);

export type ShippingRegion = "Sweden" | "Europe" | "World";

export const regionFor = (country: string): ShippingRegion =>
  country === "SE" ? "Sweden" : EUROPE.has(country) ? "Europe" : "World";

export interface ShippingSettings {
  fallback_rates?: { region: string; rate: number }[];
  free_shipping_threshold?: number | null;
}

/** Shipping in öre. Free shipping above the threshold applies within Sweden only. */
export function shippingCost(settings: ShippingSettings | null | undefined, country: string, subtotal: number): number {
  const region = regionFor(country);
  const threshold = settings?.free_shipping_threshold;
  if (region === "Sweden" && threshold && subtotal >= threshold) return 0;
  const rates = settings?.fallback_rates ?? [];
  return rates.find((r) => r.region === region)?.rate ?? rates.find((r) => r.region === "World")?.rate ?? 4900;
}
