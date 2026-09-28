import { useEffect } from "react";

export const SITE_URL = "https://nordic-getaways.com";
export const SITE_NAME = "Nordic Getaways";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

interface PageMeta {
  title: string;
  description: string;
  /** Path such as "/contact"; defaults to the current path */
  path?: string;
  image?: string | null;
  /** schema.org objects rendered as one JSON-LD script */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Hold off until the page's data has loaded, so prerendering captures real values */
  ready?: boolean;
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
export const usePageMeta = ({ title, description, path, image, jsonLd, ready = true }: PageMeta) => {
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    if (!ready) return;

    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    const url = `${SITE_URL}${path ?? window.location.pathname}`;
    const img = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta("name", "description", description);
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
};
