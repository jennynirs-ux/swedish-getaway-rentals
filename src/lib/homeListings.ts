// Which cabins the home page shows, and in what order. Kept out of Index.tsx
// so the rules can be tested.

/** Cards on the home page before "Browse all"; keeps the page short as more hosts join */
export const HOME_CABIN_LIMIT = 6;
/** The "{N} cabins from {H} hosts" line waits until the numbers say something good */
export const COUNT_LINE_MIN_CABINS = 10;
export const COUNT_LINE_MIN_HOSTS = 3;

const NEW_LISTING_DAYS = 30;
const COMPLETE_MIN_GALLERY_IMAGES = 5;

export interface HomeListing {
  id: string;
  host_id: string;
  hero_image_url?: string | null;
  gallery_images?: string[] | null;
  created_at?: string | null;
  review_count?: number | null;
}

const isComplete = (p: HomeListing) =>
  !!p.hero_image_url && (p.gallery_images?.length ?? 0) >= COMPLETE_MIN_GALLERY_IMAGES;

const createdMs = (p: HomeListing) => (p.created_at ? Date.parse(p.created_at) || 0 : 0);

/**
 * Complete listings (hero photo and a full gallery) first, then newest. Not
 * by reviews: new hosts start at 0, so that would pin the first cabins on top
 * for good. The id tie-break keeps the order stable (the first two cabins
 * share a created_at).
 */
export function sortForHome<T extends HomeListing>(properties: T[]): T[] {
  return [...properties].sort(
    (a, b) =>
      Number(isComplete(b)) - Number(isComplete(a)) ||
      createdMs(b) - createdMs(a) ||
      a.id.localeCompare(b.id)
  );
}

/**
 * The cards on the home page. Once there are more cabins than cards, a host
 * gets at most `maxPerHost` of them so one big host can't fill the shelf;
 * if that leaves gaps (too few hosts), the skipped cabins fill them.
 */
export function rankForHome<T extends HomeListing>(
  properties: T[],
  { limit = HOME_CABIN_LIMIT, maxPerHost = 2 }: { limit?: number; maxPerHost?: number } = {}
): T[] {
  const sorted = sortForHome(properties);
  if (sorted.length <= limit) return sorted;

  const perHost = new Map<string, number>();
  const picked: T[] = [];
  const skipped: T[] = [];
  for (const p of sorted) {
    const n = perHost.get(p.host_id) ?? 0;
    if (picked.length < limit && n < maxPerHost) {
      picked.push(p);
      perHost.set(p.host_id, n + 1);
    } else {
      skipped.push(p);
    }
  }
  return [...picked, ...skipped].slice(0, limit);
}

/** "New" on a card: listed in the last 30 days and no reviews yet */
export const isNewListing = (p: HomeListing, now = new Date()) =>
  !p.review_count &&
  !!p.created_at &&
  now.getTime() - Date.parse(p.created_at) < NEW_LISTING_DAYS * 24 * 60 * 60 * 1000;
