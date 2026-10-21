import { describe, expect, it } from "vitest";
import { fitWithin, imageFileError, imageStorageKeys, MAX_IMAGE_BYTES } from "./imageResize";

describe("fitWithin", () => {
  it("shrinks the longest side to the limit and keeps the shape", () => {
    expect(fitWithin(4032, 3024, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3024, 4032, 800)).toEqual({ width: 600, height: 800 });
  });

  it("never enlarges a small photo", () => {
    expect(fitWithin(1200, 900, 1600)).toEqual({ width: 1200, height: 900 });
  });

  it("handles an unreadable size", () => {
    expect(fitWithin(0, 0, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe("imageFileError", () => {
  it("accepts photos up to 15 MB", () => {
    expect(imageFileError({ name: "Skärmavbild 2026-10-21 kl. 10.00.png", type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
    // Some phones give HEIC files no type; the browser decides if it can read them
    expect(imageFileError({ name: "IMG_0001.HEIC", type: "", size: 2_000_000 })).toBeNull();
  });

  it("rejects other files and large photos with a readable reason", () => {
    expect(imageFileError({ name: "prices.pdf", type: "application/pdf", size: 1000 })).toBe("prices.pdf is not a photo.");
    expect(imageFileError({ name: "big.jpg", type: "image/jpeg", size: 20 * 1024 * 1024 })).toBe(
      "big.jpg is 20.0 MB; photos can be at most 15 MB.",
    );
  });
});

describe("imageStorageKeys", () => {
  const pid = "6618e8ae-e1ff-4a3b-8f6b-b3287c881d12";

  it("puts a safe random name in the listing's folder", () => {
    expect(imageStorageKeys(pid, "webp", "AB12-cd34")).toEqual({
      full: `${pid}/ab12-cd34.webp`,
      small: `${pid}/ab12-cd34-800.webp`,
    });
    expect(imageStorageKeys(`/${pid}/amenities/`, "jpg", "x1")).toEqual({ full: `${pid}/amenities/x1.jpg`, small: null });
  });

  it("only ever uses ASCII letters, digits and dashes in the name", () => {
    const { full } = imageStorageKeys(`${pid}/guide`, "webp");
    expect(full).toMatch(new RegExp(`^${pid}/guide/[a-z0-9-]+\\.webp$`));
    expect(imageStorageKeys(pid, "webp", "sjön [1]#").full).toBe(`${pid}/sjn1.webp`);
  });

  it("can't climb out of the folder", () => {
    expect(imageStorageKeys(`../${pid}/./guide`, "webp", "a").full).toBe(`${pid}/guide/a.webp`);
  });

  it("puts the small copy next to the photo as <name>-800.webp, one folder deep", () => {
    // A real gallery key: <propertyId>/<uuid>.webp
    const id = "0b5c2a8e-3f1d-4c6a-9e7b-2d4f6a8c0e1f";
    const { full, small } = imageStorageKeys(pid, "webp", id);
    expect(full).toBe(`${pid}/${id}.webp`);
    expect(small).toBe(full.replace(/\.webp$/, "-800.webp"));
  });

  // src/lib/images.ts only serves "-800.webp" copies under /property-images/optimized/,
  // so host gallery photos (<propertyId>/<uuid>.webp) still get the 1600 px file on phones
  it.todo("is served by imageSrcSet once src/lib/images.ts matches <propertyId>/<uuid>.webp");
});
