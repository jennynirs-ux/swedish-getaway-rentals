import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { applyListingTexts, type ContentLang, type ListingTexts, textHash } from "./listing-text.ts";

// E-mails to guests in the language they booked in (bookings.guest_lang;
// the site's /sv or /de). The words around the host's text are written per
// language in each e-mail; what the host wrote (listing title, guide, extras,
// check-in instructions, their e-mail templates) comes from the translations
// translate-content saves, and stays as the host wrote it until there is one.

export type GuestLang = ContentLang;

export const guestLang = (value: unknown): GuestLang => (value === "sv" || value === "de" ? value : "en");

/** For dates and numbers */
export const GUEST_LOCALES: Record<GuestLang, string> = { en: "en-GB", sv: "sv-SE", de: "de-DE" };

/** A page on the site in the guest's language: ("sv", "/property/x/guide") → https://…/sv/property/x/guide */
export function guestPageUrl(baseUrl: string, lang: GuestLang, path: string): string {
  if (lang === "en") return `${baseUrl}${path}`;
  return path === "/" ? `${baseUrl}/${lang}` : `${baseUrl}/${lang}${path}`;
}

type Entity = "property" | "property_private";

export interface GuestTexts {
  /** The listing with its text in the guest's language (a copy) */
  listing<T extends Record<string, unknown>>(property: T): T;
  /** One text in the guest's language: ("property", "extra:<id>", name), ("property_private", "check_in_instructions", text) */
  text(entity: Entity, field: string, original: string | null | undefined): string;
}

const IDENTITY: GuestTexts = {
  listing: (property) => property,
  text: (_entity, _field, original) => original ?? "",
};

function valueAt(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined), value);
}

/**
 * The host's text for one listing in the guest's language. Only translations
 * of the text as it is now are used (fingerprint), so a host's later change
 * shows in their own words rather than as an old translation. Never throws:
 * without translations the e-mail goes out with the host's own words.
 */
export async function guestTexts(supabase: SupabaseClient, propertyId: string | null | undefined, lang: GuestLang): Promise<GuestTexts> {
  if (!propertyId) return IDENTITY;
  const { data, error } = await supabase
    .from("content_translations")
    .select("entity_type, field, text, source_hash")
    .eq("entity_id", propertyId)
    .eq("lang", lang)
    .eq("refused", false)
    .in("entity_type", ["property", "property_private"]);
  if (error) {
    console.error("[GUEST-LANG] Reading translations failed:", error.message);
    return IDENTITY;
  }
  const rows = new Map<string, { text: string; hash: string }>();
  for (const row of data ?? []) {
    if (row.text) rows.set(`${row.entity_type}\n${row.field}`, { text: row.text, hash: row.source_hash });
  }
  if (!rows.size) return IDENTITY;
  const lookup = (entity: Entity, field: string, original: unknown): string | null => {
    if (typeof original !== "string" || !original) return null;
    const row = rows.get(`${entity}\n${field}`);
    return row && row.hash === textHash(original) ? row.text : null;
  };
  return {
    listing(property) {
      const current: ListingTexts = {};
      for (const key of rows.keys()) {
        const [entity, field] = key.split("\n");
        if (entity !== "property" || field.includes(":")) continue;
        const text = lookup("property", field, valueAt(property, field));
        if (text !== null) current[field] = text;
      }
      return applyListingTexts(property, current);
    },
    text(entity, field, original) {
      return lookup(entity, field, original) ?? original ?? "";
    },
  };
}
