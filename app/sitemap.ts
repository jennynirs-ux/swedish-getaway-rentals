import { MetadataRoute } from 'next';
import { createServerClient } from './lib/supabase-server';

const BASE_URL = 'https://nordic-getaways.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();

  // Fetch all active properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, updated_at')
    .eq('active', true);

  // Fetch all visible shop products
  const { data: products } = await supabase
    .from('shop_products')
    .select('id, updated_at')
    .eq('is_visible_shop', true);

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/gallery`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/amenities`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/first-time-in-sweden`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/pricing-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/become-host`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Dynamic property routes
  const propertyRoutes: MetadataRoute.Sitemap = (properties || []).map((prop) => ({
    url: `${BASE_URL}/property/${prop.id}`,
    lastModified: new Date(prop.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Dynamic product routes
  const productRoutes: MetadataRoute.Sitemap = (products || []).map((prod) => ({
    url: `${BASE_URL}/shop/${prod.id}`,
    lastModified: new Date(prod.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...propertyRoutes, ...productRoutes];
}
