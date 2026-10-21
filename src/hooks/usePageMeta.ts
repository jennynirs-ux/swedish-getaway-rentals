import { useEffect } from "react";

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
  /** Path such as "/contact"; defaults to the current path */
  path?: string;
  image?: string | null;
  /** schema.org objects rendered as one JSON-LD script */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Hold off until the page's data has loaded, so prerendering captures real values */
  ready?: boolean;
  /** Keep the page out of search results (pages only reached from a booking or an emailed link) */
  noindex?: boolean;
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
}: PageMeta) => {
  // Listing titles come from hosts unreviewed; an escaped "<" keeps a
  // "</script>" in one from ending the script tag in the prerendered HTML
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd).replace(/</g, "\\u003c") : "";

  useEffect(() => {
    if (!ready) return;

    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    const url = `${SITE_URL}${path ?? window.location.pathname}`;
    const img = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
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
  }, [title, description, path, image, jsonLdString, ready]);

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
