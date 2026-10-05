import { SITE_NAME, SITE_URL } from "@/hooks/usePageMeta";
import { shippingCost, type ShippingSettings } from "../../supabase/functions/_shared/shop-shipping";

// Product data for Google (merchant listings and Shopping). The product feed in
// scripts/prerender.mjs uses the same brand, description fallback and price, so
// keep them in step.
export const SHOP_BRAND = "The Nordic Collection";

export interface ProductSeo {
  id: string;
  title: string;
  description?: string | null;
  /** In öre: the price the page shows before a variant is picked */
  price: number;
  currency?: string | null;
  images: string[];
}

export const productPath = (id: string) => `/product/${id}`;

/** Most Printful descriptions are just the product name */
export const productDescription = (p: Pick<ProductSeo, "title" | "description">) => {
  const description = p.description?.trim();
  return description && description !== p.title.trim()
    ? description
    : `${p.title} from ${SHOP_BRAND}, printed to order.`;
};

export function buildProductJsonLd(p: ProductSeo, shipping: ShippingSettings | null) {
  const currency = p.currency || "SEK";
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: `${SITE_URL}${productPath(p.id)}`,
    price: (p.price / 100).toFixed(2),
    priceCurrency: currency,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: SITE_NAME },
    // Booking terms: 14 days to return a shop order, return shipping paid by the customer
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "SE",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
    },
  };
  if (shipping) {
    offer.shippingDetails = {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: (shippingCost(shipping, "SE", p.price) / 100).toFixed(2),
        currency,
      },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "SE" },
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: productDescription(p),
    image: p.images.slice(0, 10),
    sku: p.id,
    brand: { "@type": "Brand", name: SHOP_BRAND },
    offers: offer,
  };
}
