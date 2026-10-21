// Printful needs a Printful sync variant per order line. A product with a
// single variant needs no choice; otherwise the customer must have picked one
// (the cart page asks). Returns null when no variant can be determined.
export function pickVariant(product: { printful_data?: unknown }, variantId?: string | null) {
  const data = typeof product.printful_data === "string" ? JSON.parse(product.printful_data) : product.printful_data;
  const variants: any[] = (data as { variants?: any[] } | null)?.variants ?? [];
  if (variantId) return variants.find((v) => v.id?.toString() === variantId.toString()) ?? null;
  return variants.length === 1 ? variants[0] : null;
}

type PricedVariant = { retail_price?: string | null; is_ignored?: boolean | null };

/** A Printful variant's retail price in öre, or null when it has none */
export function variantPrice(variant: PricedVariant | null | undefined): number | null {
  const kronor = parseFloat(variant?.retail_price ?? "");
  return Number.isFinite(kronor) ? Math.round(kronor * 100) : null;
}

/** Cheapest and dearest variant a customer can buy, in öre (null without prices) */
export function variantPriceRange<T extends PricedVariant>(variants: T[]): { min: number; max: number; cheapest: T } | null {
  let range: { min: number; max: number; cheapest: T } | null = null;
  for (const v of variants.filter((v) => !v.is_ignored)) {
    const price = variantPrice(v);
    if (price === null) continue;
    if (!range) range = { min: price, max: price, cheapest: v };
    else {
      if (price < range.min) range = { ...range, min: price, cheapest: v };
      if (price > range.max) range.max = price;
    }
  }
  return range;
}

/** The price a product is listed at before a size is picked: an admin override
 * as it is, otherwise the cheapest variant ("from" when sizes cost different amounts) */
export function listedPrice(p: {
  price: number;
  price_max?: number | null;
  price_override?: number | null;
  custom_price?: number | null;
}): { price: number; from: boolean } {
  const fixed = p.price_override || p.custom_price;
  if (fixed) return { price: fixed, from: false };
  return { price: p.price, from: (p.price_max ?? p.price) > p.price };
}
