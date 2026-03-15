/**
 * Generate a URL-friendly slug from a property title.
 * Handles Swedish characters: å→a, ä→a, ö→o, Å→A, Ä→A, Ö→O
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Parse a slug back into readable text */
export function parseSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
