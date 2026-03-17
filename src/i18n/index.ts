import en from './locales/en.json';
import sv from './locales/sv.json';
import no from './locales/no.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import de from './locales/de.json';

export type Locale = 'en' | 'sv' | 'no' | 'da' | 'fi' | 'de';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
  currency: string;
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', currency: 'SEK' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', currency: 'SEK' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', currency: 'NOK' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', currency: 'DKK' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', currency: 'EUR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', currency: 'EUR' },
];

const translations: Record<Locale, typeof en> = { en, sv, no, da, fi, de };

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K) : never }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;

/**
 * Get a translated string by dot-notation key
 */
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: unknown = translations[locale] || translations.en;

  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Fallback to English
      value = translations.en;
      for (const fk of keys) {
        if (typeof value === 'object' && value !== null && fk in value) {
          value = (value as Record<string, unknown>)[fk];
        } else {
          return key; // Return key if translation missing
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') return key;

  // Replace params like {year} with actual values
  if (params) {
    return Object.entries(params).reduce(
      (str, [param, val]) => str.replace(`{${param}}`, String(val)),
      value
    );
  }

  return value;
}

/**
 * Detect preferred locale from browser settings
 */
export function detectLocale(): Locale {
  // 1. Check URL ?lang= param (critical for SEO crawlers following hreflang)
  if (typeof window !== 'undefined') {
    const urlParam = new URLSearchParams(window.location.search).get('lang') as Locale | null;
    if (urlParam && SUPPORTED_LOCALES.some((l) => l.code === urlParam)) return urlParam;
  }

  // 2. Check stored preference
  const stored = localStorage.getItem('nordic-locale') as Locale | null;
  if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) return stored;

  // 3. Check browser language
  const browserLang = navigator.language.split('-')[0];
  const match = SUPPORTED_LOCALES.find((l) => l.code === browserLang);
  return match?.code || 'en';
}

/**
 * Store locale preference
 */
export function setLocale(locale: Locale): void {
  localStorage.setItem('nordic-locale', locale);
  document.documentElement.lang = locale;

  // Update URL ?lang= param for bookmark/share consistency
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (locale === 'en') {
      url.searchParams.delete('lang');
    } else {
      url.searchParams.set('lang', locale);
    }
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Update hreflang meta tags based on current page path
 */
export function updateHreflangTags(): void {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  const base = 'https://nordic-getaways.com';

  // Remove existing hreflang links
  document.querySelectorAll('link[hreflang]').forEach((el) => el.remove());

  // Add hreflang for each locale
  for (const locale of SUPPORTED_LOCALES) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', locale.code);
    link.setAttribute('href', locale.code === 'en' ? `${base}${path}` : `${base}${path}?lang=${locale.code}`);
    document.head.appendChild(link);
  }

  // x-default
  const xdefault = document.createElement('link');
  xdefault.setAttribute('rel', 'alternate');
  xdefault.setAttribute('hreflang', 'x-default');
  xdefault.setAttribute('href', `${base}${path}`);
  document.head.appendChild(xdefault);
}
