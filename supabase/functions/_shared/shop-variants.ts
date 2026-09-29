// Printful needs a Printful sync variant per order line. A product with a
// single variant needs no choice; otherwise the customer must have picked one
// (the cart page asks). Returns null when no variant can be determined.
export function pickVariant(product: { printful_data?: unknown }, variantId?: string | null) {
  const data = typeof product.printful_data === "string" ? JSON.parse(product.printful_data) : product.printful_data;
  const variants: any[] = (data as { variants?: any[] } | null)?.variants ?? [];
  if (variantId) return variants.find((v) => v.id?.toString() === variantId.toString()) ?? null;
  return variants.length === 1 ? variants[0] : null;
}
