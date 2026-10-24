// The text hosts write on a listing, as one flat list of fields, so it can be
// translated for guests (translate-content) and the translations put back in
// place on the guest site (src/i18n/listingTexts.ts). Shared by both; no
// Deno or browser APIs here.
//
// A field's id says where its text lives: "description",
// "guidebook_sections.2.blocks.0.content", "amenity:Fire Pit" (the amenity
// names are matched to icons in English, so they are translated on the side,
// by name), "extra:<pricing rule id>". Index-based ids change when a host
// reorders a list, which only means those fields are translated again.

export const CONTENT_LANGS = ["en", "sv", "de"] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

/** Plain text columns guests see */
export const LISTING_TEXT_COLUMNS = [
  "title",
  "tagline_line1",
  "tagline_line2",
  "introduction_text",
  "description",
  "availability_text",
  "contact_response_time",
  "what_makes_special",
  "local_tips",
  "parking_info",
] as const;

/** JSON columns guests see, and the keys in them that hold text */
const LISTING_JSON_COLUMNS: Record<string, readonly string[]> = {
  amenities_data: ["title", "tagline", "description", "features"],
  featured_amenities: ["title", "tagline", "description", "features"],
  special_highlights: ["title", "description"],
  gallery_metadata: ["title", "description", "alt"],
  guidebook_sections: ["title", "blocks", "content", "items", "label", "text", "description"],
};

/** Everything translate-content reads from properties */
export const LISTING_SOURCE_COLUMNS = ["id", "active", ...LISTING_TEXT_COLUMNS, ...Object.keys(LISTING_JSON_COLUMNS), "amenities"].join(", ");

export type ListingTexts = Record<string, string>;

// Ids, URLs, icon names and the like are no text to translate
const looksLikeText = (value: string) => {
  const text = value.trim();
  return text.length > 0 && !/^(https?:\/\/|www\.|\/)\S*$/i.test(text) && /\p{L}/u.test(text);
};

function collectJson(value: unknown, keys: readonly string[], path: string, out: ListingTexts) {
  if (typeof value === "string") {
    if (looksLikeText(value)) out[path] = value;
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => collectJson(item, keys, `${path}.${i}`, out));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (keys.includes(key)) collectJson(child, keys, `${path}.${key}`, out);
    }
  }
}

/** The fields to translate on one listing (and its extras: pricing rules with a name guests see) */
export function listingTexts(property: Record<string, unknown>, extras: { id: string; name: string | null }[] = []): ListingTexts {
  const out: ListingTexts = {};
  for (const column of LISTING_TEXT_COLUMNS) {
    const value = property[column];
    if (typeof value === "string" && looksLikeText(value)) out[column] = value;
  }
  for (const [column, keys] of Object.entries(LISTING_JSON_COLUMNS)) {
    const value = property[column];
    if (Array.isArray(value)) value.forEach((item, i) => collectJson(item, keys, `${column}.${i}`, out));
  }
  if (Array.isArray(property.amenities)) {
    for (const name of property.amenities) if (typeof name === "string" && looksLikeText(name)) out[`amenity:${name}`] = name;
  }
  for (const extra of extras) if (extra.name && looksLikeText(extra.name)) out[`extra:${extra.id}`] = extra.name;
  return out;
}

/** The listing with translated text in place of the host's (a copy; anything without a translation stays as it was) */
export function applyListingTexts<T extends Record<string, unknown>>(property: T, translated: ListingTexts): T {
  const copy: Record<string, unknown> = { ...property };
  for (const [path, text] of Object.entries(translated)) {
    if (path.includes(":")) continue;
    const parts = path.split(".");
    let target: Record<string, unknown> | unknown[] = copy;
    let ok = true;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const child = (target as Record<string, unknown>)[key];
      if (!child || typeof child !== "object") {
        ok = false;
        break;
      }
      const cloned = Array.isArray(child) ? [...child] : { ...(child as Record<string, unknown>) };
      (target as Record<string, unknown>)[key] = cloned;
      target = cloned;
    }
    const last = parts[parts.length - 1];
    if (ok && typeof (target as Record<string, unknown>)[last] === "string") (target as Record<string, unknown>)[last] = text;
  }
  return copy as T;
}

/**
 * What hosts write for booked guests only (entity "property_private", never
 * readable on the site): check-in instructions, parking, and the e-mail
 * templates the e-mails use (booking confirmation, pre-arrival). The
 * templates' placeholders, such as {guest_name}, are kept in translation.
 */
export const PRIVATE_TEMPLATE_KEYS = ["booking_confirmation", "pre_arrival"] as const;

export function privateListingTexts(
  details: { check_in_instructions?: string | null; parking_info?: string | null } | null | undefined,
  emailTemplates: unknown,
): ListingTexts {
  const out: ListingTexts = {};
  for (const column of ["check_in_instructions", "parking_info"] as const) {
    const value = details?.[column];
    if (typeof value === "string" && looksLikeText(value)) out[column] = value;
  }
  const templates = emailTemplates && typeof emailTemplates === "object" ? (emailTemplates as Record<string, unknown>) : {};
  for (const key of PRIVATE_TEMPLATE_KEYS) {
    const template = templates[key] as { enabled?: unknown; subject?: unknown; message?: unknown } | undefined;
    if (!template?.enabled) continue;
    for (const part of ["subject", "message"] as const) {
      const value = template[part];
      if (typeof value === "string" && looksLikeText(value)) out[`email_templates.${key}.${part}`] = value;
    }
  }
  return out;
}

/**
 * A short fingerprint of a text (cyrb53), saved with each translation: a
 * translation whose fingerprint no longer matches the host's text is out of
 * date, so guests see the host's own words until it is translated again.
 */
export function textHash(text: string): string {
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
