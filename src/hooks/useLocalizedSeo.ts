import { useEffect } from 'react';
import { useLocale } from '@/i18n/useLocale';
import { updateHreflangTags } from '@/i18n/index';

/**
 * Localized SEO metadata per page.
 * Updates document title and meta description based on current locale.
 */

interface PageSeoConfig {
  titleKey: string;     // i18n key for page title
  descriptionKey: string; // i18n key for meta description
  fallbackTitle?: string;
  fallbackDescription?: string;
}

const PAGE_SEO: Record<string, PageSeoConfig> = {
  '/': {
    titleKey: 'home.hero_title',
    descriptionKey: 'home.hero_subtitle',
    fallbackTitle: 'Nordic Getaways - Premium Nordic Vacation Rentals',
    fallbackDescription: 'Discover your perfect Nordic retreat. Unique stays across Scandinavia.',
  },
  '/shop': {
    titleKey: 'nav.properties',
    descriptionKey: 'home.hero_subtitle',
    fallbackTitle: 'The Nordic Collection',
    fallbackDescription: 'Shop authentic Nordic products and souvenirs.',
  },
  '/contact': {
    titleKey: 'nav.contact',
    descriptionKey: 'footer.contact',
    fallbackTitle: 'Contact Us',
    fallbackDescription: 'Get in touch with Nordic Getaways for bookings and inquiries.',
  },
  '/gallery': {
    titleKey: 'property.amenities',
    descriptionKey: 'home.hero_subtitle',
    fallbackTitle: 'Gallery',
    fallbackDescription: 'Browse photos of our Nordic vacation rentals.',
  },
  '/pricing-guide': {
    titleKey: 'host.settings',
    descriptionKey: 'home.hero_subtitle',
    fallbackTitle: 'Pricing Guide',
    fallbackDescription: 'Learn how to price your Nordic vacation rental for maximum bookings.',
  },
  '/become-host': {
    titleKey: 'nav.become_host',
    descriptionKey: 'home.hero_subtitle',
    fallbackTitle: 'Become a Host',
    fallbackDescription: 'List your property on Nordic Getaways and earn from vacation rentals.',
  },
};

export function useLocalizedSeo(pathname?: string) {
  const { locale, t } = useLocale();
  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');

  useEffect(() => {
    const config = PAGE_SEO[path];
    if (!config) return;

    const title = t(config.titleKey) || config.fallbackTitle || '';
    const description = t(config.descriptionKey) || config.fallbackDescription || '';

    // Update document title
    const fullTitle = path === '/'
      ? `Nordic Getaways - ${title}`
      : `${title} | Nordic Getaways`;
    document.title = fullTitle;

    // Update meta description
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // Update OG tags
    const setOg = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
      if (el) el.setAttribute('content', content);
    };
    setOg('og:title', fullTitle);
    setOg('og:description', description);

    // Update hreflang for current path
    updateHreflangTags();
  }, [locale, path, t]);
}
