import { MetadataRoute } from 'next';
import { createServerClient } from './lib/supabase-server';

const BASE_URL = 'https://nordic-getaways.com';
const LOCALES = ['en', 'sv', 'no', 'da', 'fi', 'de'] as const;

function withAlternates(url: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = locale === 'en' ? url : `${url}${url.includes('?') ? '&' : '?'}lang=${locale}`;
  }
  languages['x-default'] = url;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();

  // Fetch all active properties (include slug for SEO-friendly URLs)
  const { data: properties } = await supabase
    .from('properties')
    .select('id, slug, updated_at')
    .eq('active', true);

  // Fetch all visible shop products
  const { data: products } = await supabase
    .from('shop_products')
    .select('id, updated_at')
    .eq('is_visible_shop', true);

  // Static routes with locale alternates
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0, alternates: withAlternates(BASE_URL) },
    { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8, alternates: withAlternates(`${BASE_URL}/shop`) },
    { url: `${BASE_URL}/gallery`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6, alternates: withAlternates(`${BASE_URL}/gallery`) },
    { url: `${BASE_URL}/amenities`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: withAlternates(`${BASE_URL}/amenities`) },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: withAlternates(`${BASE_URL}/contact`) },
    { url: `${BASE_URL}/first-time-in-sweden`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7, alternates: withAlternates(`${BASE_URL}/first-time-in-sweden`) },
    { url: `${BASE_URL}/pricing-guide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6, alternates: withAlternates(`${BASE_URL}/pricing-guide`) },
    { url: `${BASE_URL}/become-host`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5, alternates: withAlternates(`${BASE_URL}/become-host`) },
    { url: `${BASE_URL}/destinations`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9, alternates: withAlternates(`${BASE_URL}/destinations`) },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8, alternates: withAlternates(`${BASE_URL}/blog`) },
  ];

  // Static destination pages
  const destinationSlugs = ['stockholm-archipelago', 'swedish-lapland', 'dalarna', 'west-coast-sweden', 'lofoten', 'finnish-lakeland', 'danish-coast', 'varmland'];
  const destinationRoutes: MetadataRoute.Sitemap = destinationSlugs.map((slug) => ({
    url: `${BASE_URL}/destinations/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    alternates: withAlternates(`${BASE_URL}/destinations/${slug}`),
  }));

  // Static blog posts
  const blogSlugs = ['ultimate-guide-midsommar-sweden', 'best-northern-lights-spots-scandinavia', 'swedish-stuga-culture-explained', 'first-time-renting-scandinavia', 'sustainable-travel-nordic-countries', 'winter-activities-swedish-lapland'];
  const blogRoutes: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${BASE_URL}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
    alternates: withAlternates(`${BASE_URL}/blog/${slug}`),
  }));

  // Dynamic property routes (use slug if available, fallback to id)
  const propertyRoutes: MetadataRoute.Sitemap = (properties || []).map((prop) => {
    const propUrl = `${BASE_URL}/property/${prop.slug || prop.id}`;
    return {
      url: propUrl,
      lastModified: new Date(prop.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      alternates: withAlternates(propUrl),
    };
  });

  // Dynamic product routes
  const productRoutes: MetadataRoute.Sitemap = (products || []).map((prod) => {
    const prodUrl = `${BASE_URL}/shop/${prod.id}`;
    return {
      url: prodUrl,
      lastModified: new Date(prod.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: withAlternates(prodUrl),
    };
  });

  return [...staticRoutes, ...destinationRoutes, ...blogRoutes, ...propertyRoutes, ...productRoutes];
}
