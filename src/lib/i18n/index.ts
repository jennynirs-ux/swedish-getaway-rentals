import type { Locale, TranslationMessages } from './types';
import { en } from './en';
import { sv } from './sv';
import { no } from './no';
import { da } from './da';
import { de } from './de';

const translations: Record<string, TranslationMessages> = {
  en,
  sv,
  no,
  da,
  de,
};

/**
 * Get all translation messages for a given locale
 * @param locale - The locale to get translations for
 * @returns TranslationMessages object containing all translations for the locale
 */
export function getTranslations(locale: Locale): TranslationMessages {
  return translations[locale] || translations.en;
}

/**
 * Get a specific translation string using dot notation path
 * @param locale - The locale to get the translation from
 * @param path - Dot-separated path to the translation key (e.g., 'common.search')
 * @returns The translation string, or the path itself if not found
 */
export function t(locale: Locale, path: string): string {
  const msgs = getTranslations(locale);
  const keys = path.split('.');
  let result: any = msgs;

  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) {
      console.warn(`Translation not found for key: ${path}`);
      return path; // Fallback to path if not found
    }
  }

  return typeof result === 'string' ? result : path;
}

export { type Locale, type TranslationMessages } from './types';
