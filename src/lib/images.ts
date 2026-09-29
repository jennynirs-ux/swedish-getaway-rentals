// Property photos are stored as "<name>.webp" (max 1600 px) with a
// "<name>-800.webp" copy for small screens (migration 20260929190000).
const OPTIMIZED = /\/property-images\/optimized\/.+\.webp$/;

export const imageSrcSet = (url?: string | null): string | undefined =>
  url && OPTIMIZED.test(url) && !url.endsWith("-800.webp")
    ? `${url.replace(/\.webp$/, "-800.webp")} 800w, ${url} 1600w`
    : undefined;

/** The small copy, for thumbnails and cards that never need 1600 px */
export const smallImage = (url?: string | null): string | undefined =>
  url && OPTIMIZED.test(url) && !url.endsWith("-800.webp") ? url.replace(/\.webp$/, "-800.webp") : url ?? undefined;
