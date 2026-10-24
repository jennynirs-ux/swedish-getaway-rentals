import { createContext, useContext } from "react";

// The guest site in English (no prefix: /cabins), Swedish (/sv/cabins) and
// German (/de/cabins). Text written in code lives next to the component that
// shows it, as one object per language (useCopy); text hosts write is
// translated automatically (useContentTranslations). The host panel, admin and
// sign-in pages stay outside: they have one language and no prefix.

export const LANGS = ["en", "sv", "de"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

/** Each language in its own language, for the language menu */
export const LANG_NAMES: Record<Lang, string> = { en: "English", sv: "Svenska", de: "Deutsch" };
/** For toLocaleString / Intl: dates, numbers and prices */
export const LOCALES: Record<Lang, string> = { en: "en-GB", sv: "sv-SE", de: "de-DE" };
/** og:locale */
export const OG_LOCALES: Record<Lang, string> = { en: "en_GB", sv: "sv_SE", de: "de_DE" };

export const isLang = (value: unknown): value is Lang => (LANGS as readonly unknown[]).includes(value);

/** The same text in every language; TypeScript flags a language that misses a key */
export type Copy<T> = Record<Lang, T>;

const LangContext = createContext<Lang | null>(null);
export const LangProvider = LangContext.Provider;

/** The language of the page; English outside the guest site */
export const useLang = (): Lang => useContext(LangContext) ?? DEFAULT_LANG;
/** null outside the guest site (host panel, admin, sign-in), where pages have one language */
export const useLangOrNull = (): Lang | null => useContext(LangContext);
export const useLocale = (): string => LOCALES[useLang()];

/** The copy for the page's language: const t = useCopy(COPY) */
export function useCopy<T>(copy: Copy<T>): T {
  return copy[useLang()];
}

// Pages with one language and no prefix. /become-host has a Swedish twin of
// its own, /bli-vard
const SINGLE_LANGUAGE = /^\/(auth|admin|host-[^/]*|profile|become-host|bli-vard|pricing-guide)(\/|$|[?#])/;
const PREFIX = /^\/(sv|de)(?=\/|$|[?#])/;

/** A path in a language: "/cabins" → "/sv/cabins"; paths of single-language pages and links elsewhere are left alone */
export function localizedPath(path: string, lang: Lang): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const base = stripLang(path).replace(/^\/bli-vard(?=$|[?#])/, "/become-host");
  // The host page is in English and Swedish, at addresses of their own
  if (/^\/become-host(?=$|[?#])/.test(base)) return lang === "sv" ? base.replace("/become-host", "/bli-vard") : base;
  if (lang === DEFAULT_LANG || SINGLE_LANGUAGE.test(base)) return base;
  return base === "/" ? `/${lang}` : /^\/[?#]/.test(base) ? `/${lang}${base.slice(1)}` : `/${lang}${base}`;
}

/** "/sv/cabins" → "/cabins", "/sv" → "/" */
export function stripLang(path: string): string {
  const stripped = path.replace(PREFIX, "");
  return stripped === "" ? "/" : stripped.startsWith("/") ? stripped : `/${stripped}`;
}

/** The language a path is in: "/de/cabins" → "de" */
export function langOfPath(path: string): Lang {
  const match = path.match(PREFIX);
  return match ? (match[1] as Lang) : DEFAULT_LANG;
}

/** Whether a page exists in every language (the language menu only shows there) */
export const isLocalizedPath = (path: string) => path.startsWith("/") && !SINGLE_LANGUAGE.test(stripLang(path));

// The language a guest picked, so a link to the English page takes them to
// theirs next time
const PREFERENCE_KEY = "lang";

export function savedLang(): Lang | null {
  try {
    const value = localStorage.getItem(PREFERENCE_KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(PREFERENCE_KEY, lang);
  } catch {
    // Private mode: the choice lasts this visit only
  }
}

/** The browser's language, when it is one of ours */
export function browserLang(): Lang | null {
  const preferred = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language];
  for (const tag of preferred) {
    const code = tag?.slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return null;
}
