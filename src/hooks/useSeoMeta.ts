import { useEffect } from 'react';

interface SeoMetaOptions {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
}

/**
 * Hook to dynamically update page-level SEO meta tags for the SPA.
 * This is critical because Vite SPAs serve a single index.html —
 * meta tags must be updated client-side per route.
 */
export function useSeoMeta(options: SeoMetaOptions) {
  useEffect(() => {
    if (options.title) {
      document.title = options.title.includes('Nordic Getaways')
        ? options.title
        : `${options.title} | Nordic Getaways`;
    }

    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    if (options.description) setMeta('description', options.description);
    if (options.ogTitle) setMeta('og:title', options.ogTitle, 'property');
    if (options.ogDescription) setMeta('og:description', options.ogDescription, 'property');
    if (options.ogImage) setMeta('og:image', options.ogImage, 'property');
    if (options.ogUrl) setMeta('og:url', options.ogUrl, 'property');

    if (options.canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', options.canonical);
    }

    // Cleanup: restore defaults on unmount
    return () => {
      document.title = 'Nordic Getaways - Premium Nordic Vacation Rentals';
    };
  }, [options.title, options.description, options.ogTitle, options.ogDescription, options.ogImage, options.ogUrl, options.canonical]);
}
