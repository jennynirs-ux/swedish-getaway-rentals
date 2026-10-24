import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isLocalizedPath, LANGS, localizedPath, OG_LOCALES, stripLang, useLangOrNull } from "@/i18n";

export const SITE_URL = "https://nordic-getaways.com";
export const SITE_NAME = "Nordic Getaways";
/** Home page description, also the fallback in index.html (keep the two in sync) */
export const SITE_DESCRIPTION =
  "Rent a holiday cabin or stuga in Sweden directly from its host. Every cost shown before you pay, secure card payment and clear cancellation rules.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface PageMeta {
  title: string;
  /** Defaults to SITE_DESCRIPTION; only noindex pages should leave it out */
  description?: string;
  /** Path such as "/contact"; defaults to the current path. On the guest site
   *  it is put in the page's language ("/sv/contact"), with links to the other languages */
  path?: string;
  image?: string | null;
  /** schema.org objects rendered as one JSON-LD script */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Hold off until the page's data has loaded, so prerendering captures real values */
  ready?: boolean;
  /** Keep the page out of search results (pages only reached from a booking or an emailed link) */
  noindex?: boolean;
  /** The language of a page outside the guest site, e.g. "sv" (guest pages take theirs from the URL) */
  lang?: string;
  /** The same page in other languages, outside the guest site: { en: "/become-host", sv: "/bli-vard" } */
  alternates?: Record<string, string>;
}

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
};

/**
 * Per-page title, description, canonical URL, social tags and structured data.
 * Updates the tags already in index.html instead of adding duplicates; the
 * build-time prerender (scripts/prerender.mjs) snapshots the result so search
 * engines and AI assistants get it without running JavaScript.
 */
export const usePageMeta = ({
  title,
  description = SITE_DESCRIPTION,
  path,
  image,
  jsonLd,
  ready = true,
  noindex = false,
  lang: pageLang = "en",
  alternates: pageAlternates,
}: PageMeta) => {
  const { pathname } = useLocation();
  // /bli-vard sets a language for its navigation but has addresses of its own
  const contextLang = useLangOrNull();
  const siteLang = contextLang && isLocalizedPath(path ?? pathname) ? contextLang : null;
  // On the guest site: the page in its language, and the same page in the
  // others (hreflang; x-default is the English one)
  const basePath = stripLang(path ?? pathname);
  const pagePath = siteLang ? localizedPath(basePath, siteLang) : path ?? pathname;
  const lang = siteLang ?? pageLang;
  const alternates =
    siteLang && !noindex
      ? { ...Object.fromEntries(LANGS.map((l) => [l, localizedPath(basePath, l)])), "x-default": localizedPath(basePath, "en") }
      : pageAlternates;

  // Listing titles come from hosts unreviewed; an escaped "<" keeps a
  // "</script>" in one from ending the script tag in the prerendered HTML
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd).replace(/</g, "\\u003c") : "";

  useEffect(() => {
    if (!ready) return;

    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    const url = `${SITE_URL}${pagePath}`;
    const img = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("property", "og:locale", OG_LOCALES[lang as keyof typeof OG_LOCALES] ?? OG_LOCALES.en);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", img);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    let script = document.getElementById("page-jsonld");
    if (jsonLdString) {
      if (!script) {
        script = document.createElement("script");
        script.id = "page-jsonld";
        script.setAttribute("type", "application/ld+json");
        document.head.appendChild(script);
      }
      script.textContent = jsonLdString;
    } else {
      script?.remove();
    }

    document.documentElement.dataset.metaReady = "true";
  }, [title, description, pagePath, lang, image, jsonLdString, ready]);

  // Language, and links to the same page in other languages (hreflang), so
  // search engines show Swedish speakers the Swedish page. Restored on the way out.
  const alternatesKey = alternates ? JSON.stringify(alternates) : "";
  useEffect(() => {
    document.documentElement.lang = lang;
    const links = Object.entries(alternatesKey ? (JSON.parse(alternatesKey) as Record<string, string>) : {}).map(([hreflang, href]) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = hreflang;
      link.href = `${SITE_URL}${href}`;
      document.head.appendChild(link);
      return link;
    });
    return () => {
      document.documentElement.lang = "en";
      links.forEach((link) => link.remove());
    };
  }, [lang, alternatesKey]);

  // These pages load from the home page snapshot, so without this they'd be
  // indexed as near-copies of it. Removed again on the way out, like NotFound
  useEffect(() => {
    if (!noindex) return;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, [noindex]);
};
