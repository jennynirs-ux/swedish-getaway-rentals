import { useState, useCallback, useMemo } from 'react';
import { t as translate, getTranslations, type Locale, type TranslationMessages } from './index';

/**
 * React hook for managing translations and locale state
 * @param initialLocale - The initial locale to use (default: 'en')
 * @returns Object containing translation function, current locale, setter, and all messages
 */
export function useTranslation(initialLocale: Locale = 'en') {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  /**
   * Translate a key using the current locale
   * Uses dot notation (e.g., 'common.search')
   */
  const t = useCallback((path: string, fallback?: string): string => {
    const result = translate(locale, path);
    return result === path && fallback ? fallback : result;
  }, [locale]);

  /**
   * Get all messages for the current locale
   */
  const messages = useMemo((): TranslationMessages => {
    return getTranslations(locale);
  }, [locale]);

  /**
   * Change the current locale
   */
  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
  }, []);

  return {
    t,
    locale,
    setLocale: changeLocale,
    messages,
  };
}
