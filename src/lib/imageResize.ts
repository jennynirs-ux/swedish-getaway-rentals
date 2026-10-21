/**
 * Photos are shrunk in the browser before upload: phone photos are 3-15 MB
 * and were shown to guests at full size. Re-encoding also drops the EXIF
 * data, including the GPS position of the host's home.
 *
 * Storage keys are random: Supabase Storage rejects keys with å/ä/ö, brackets
 * or "#" (e.g. the Swedish Mac screenshot name "Skärmavbild ...").
 */

/** Largest photo a host may pick (before shrinking) */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
/** Longest side of the stored photo; src/lib/images.ts serves it as 1600w */
export const FULL_IMAGE_PX = 1600;
/** Longest side of the "-800.webp" copy for small screens (src/lib/images.ts) */
export const SMALL_IMAGE_PX = 800;

/** Scale (width, height) to fit within max × max, never enlarging */
export const fitWithin = (width: number, height: number, max: number) => {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

/** Why a picked file can't be used, in words a host understands; null when fine */
export const imageFileError = (file: { name: string; type: string; size: number }): string | null => {
  if (file.type && !file.type.startsWith("image/")) return `${file.name} is not a photo.`;
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB; photos can be at most 15 MB.`;
  }
  return null;
};

/** A folder path inside the bucket without leading/trailing slashes or empty parts */
const cleanFolder = (folder: string) =>
  folder
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");

const randomId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/**
 * Storage keys for one photo: "<folder>/<random>.<ext>" plus, for WebP, the
 * "<folder>/<random>-800.webp" copy that src/lib/images.ts looks for.
 */
export const imageStorageKeys = (folder: string, ext: "webp" | "jpg", id = randomId()) => {
  const base = `${cleanFolder(folder)}/${id.toLowerCase().replace(/[^a-z0-9-]/g, "")}`;
  return {
    full: `${base}.${ext}`,
    small: ext === "webp" ? `${base}-800.webp` : null,
  };
};

type Drawable = ImageBitmap | HTMLImageElement;

const loadImage = async (file: Blob): Promise<Drawable> => {
  if (typeof createImageBitmap === "function") {
    try {
      // from-image: turn phone photos upright using their EXIF orientation
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Older Safari: fall back to an <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const sizeOf = (img: Drawable) =>
  "naturalWidth" in img ? { width: img.naturalWidth, height: img.naturalHeight } : { width: img.width, height: img.height };

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** Draw img at most maxPx on its longest side, halving in steps so large photos stay sharp */
const drawScaled = (img: Drawable, maxPx: number): HTMLCanvasElement => {
  const source = sizeOf(img);
  const target = fitWithin(source.width, source.height, maxPx);
  let current: CanvasImageSource = img;
  let { width, height } = source;
  while (width / 2 >= target.width * 1.5) {
    width = Math.round(width / 2);
    height = Math.round(height / 2);
    const step = document.createElement("canvas");
    step.width = width;
    step.height = height;
    const ctx = step.getContext("2d");
    if (!ctx) break;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, width, height);
    current = step;
  }
  const canvas = document.createElement("canvas");
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot resize photos.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current, 0, 0, target.width, target.height);
  return canvas;
};

/** WebP where the browser can encode it, else JPEG */
const encode = async (canvas: HTMLCanvasElement): Promise<{ blob: Blob; ext: "webp" | "jpg" }> => {
  const webp = await toBlob(canvas, "image/webp", 0.82);
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("Could not convert the photo.");
  return { blob: jpeg, ext: "jpg" };
};

export interface PreparedImage {
  full: Blob;
  /** The 800 px copy; only for WebP, which src/lib/images.ts expects */
  small: Blob | null;
  ext: "webp" | "jpg";
  contentType: string;
}

/**
 * Shrink a picked photo to FULL_IMAGE_PX (and optionally an 800 px copy).
 * Throws an Error with a host-readable message when the browser can't read
 * the file (e.g. HEIC in Chrome).
 */
export const prepareImage = async (file: File, withSmallCopy = true): Promise<PreparedImage> => {
  const problem = imageFileError(file);
  if (problem) throw new Error(problem);
  let img: Drawable;
  try {
    img = await loadImage(file);
  } catch {
    throw new Error(`Could not read ${file.name}. Save it as JPG or PNG and try again.`);
  }
  try {
    const full = await encode(drawScaled(img, FULL_IMAGE_PX));
    const small = withSmallCopy && full.ext === "webp" ? (await encode(drawScaled(img, SMALL_IMAGE_PX))).blob : null;
    return { full: full.blob, small, ext: full.ext, contentType: full.ext === "webp" ? "image/webp" : "image/jpeg" };
  } finally {
    if ("close" in img) img.close();
  }
};
