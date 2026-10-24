import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Lang, useLang } from "./index";
import { applyListingTexts, type ListingTexts, textHash } from "../../supabase/functions/_shared/listing-text";

// What hosts wrote, in the guest's language: translations saved by the
// translate-content function (Claude), per listing. Out-of-date translations
// (the host changed the text since) are left out, so guests see the host's
// own words until the new translation is in.

export interface ListingTranslation {
  /** Field id → translated text, for the page's language */
  texts: ListingTexts;
  /** Field id → its fingerprint when translated */
  hashes: Record<string, string>;
  /** The language most of the listing is written in, when it isn't the page's: "Translated from Swedish" */
  translatedFrom: Lang | "other" | null;
}

const EMPTY: ListingTranslation = { texts: {}, hashes: {}, translatedFrom: null };

async function fetchTranslations(ids: string[], lang: Lang): Promise<Record<string, ListingTranslation>> {
  const { data, error } = await supabase
    .from("content_translations")
    .select("entity_id, field, text, source_lang, source_hash")
    .eq("entity_type", "property")
    .eq("lang", lang)
    .eq("refused", false)
    .in("entity_id", ids);
  if (error) throw error;
  const out: Record<string, ListingTranslation> = {};
  const sources: Record<string, Record<string, number>> = {};
  for (const row of data ?? []) {
    if (!row.text) continue;
    const entry = (out[row.entity_id] ??= { texts: {}, hashes: {}, translatedFrom: null });
    entry.texts[row.field] = row.text;
    entry.hashes[row.field] = row.source_hash;
    const source = row.source_lang ?? "other";
    if (source !== lang) {
      const counts = (sources[row.entity_id] ??= {});
      counts[source] = (counts[source] ?? 0) + row.text.length;
    }
  }
  for (const [id, counts] of Object.entries(sources)) {
    const [top] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (top) out[id].translatedFrom = top[0] as Lang | "other";
  }
  return out;
}

/** Translations for some listings in the page's language (none while loading, or if there are none) */
export function useListingTranslations(ids: (string | null | undefined)[]): Record<string, ListingTranslation> {
  const lang = useLang();
  const wanted = [...new Set(ids.filter((id): id is string => !!id))].sort();
  const { data } = useQuery({
    queryKey: ["listing-translations", lang, wanted],
    queryFn: () => fetchTranslations(wanted, lang),
    enabled: wanted.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  return data ?? {};
}

/** One listing's translation */
export function useListingTranslation(id: string | null | undefined): ListingTranslation {
  return useListingTranslations([id])[id ?? ""] ?? EMPTY;
}

/** Only translations of the text as it is now */
function current(translation: ListingTranslation, originals: ListingTexts): ListingTexts {
  const out: ListingTexts = {};
  for (const [field, text] of Object.entries(translation.texts)) {
    const original = originals[field];
    if (original !== undefined && textHash(original) === translation.hashes[field]) out[field] = text;
  }
  return out;
}

/** The listing with its text in the page's language; pass the same fields listingTexts reads */
export function translateListing<T extends Record<string, unknown>>(property: T, translation: ListingTranslation | undefined, originals: ListingTexts): T {
  if (!translation || !Object.keys(translation.texts).length) return property;
  return applyListingTexts(property, current(translation, originals));
}

/** An amenity's or extra's name in the page's language: field "amenity:<name>" or "extra:<rule id>" */
export function translatedName(translation: ListingTranslation | undefined, field: string, original: string): string {
  if (!translation) return original;
  const text = translation.texts[field];
  return text && translation.hashes[field] === textHash(original) ? text : original;
}

/** "Translated from Swedish", in the page's language */
export function translatedFromText(pageLang: Lang, source: Lang | "other"): string {
  switch (pageLang) {
    case "sv":
      return `Översatt från ${{ en: "engelska", sv: "svenska", de: "tyska", other: "ett annat språk" }[source]}`;
    case "de":
      return source === "other" ? "Aus einer anderen Sprache übersetzt" : `Aus dem ${{ en: "Englischen", sv: "Schwedischen", de: "Deutschen" }[source]} übersetzt`;
    default:
      return `Translated from ${{ en: "English", sv: "Swedish", de: "German", other: "another language" }[source]}`;
  }
}

/** The link that switches between the translation and the host's own words */
export const SHOW_ORIGINAL: Record<Lang, { original: string; translation: string }> = {
  en: { original: "Show original", translation: "Show translation" },
  sv: { original: "Visa original", translation: "Visa översättning" },
  de: { original: "Original anzeigen", translation: "Übersetzung anzeigen" },
};
