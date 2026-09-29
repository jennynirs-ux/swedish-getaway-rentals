import { describe, expect, it } from "vitest";
import { imageSrcSet, smallImage } from "./images";

const base = "https://x.supabase.co/storage/v1/object/public/property-images";

describe("imageSrcSet", () => {
  it("offers the 800 px copy of optimized photos", () => {
    expect(imageSrcSet(`${base}/optimized/properties/a.webp`)).toBe(
      `${base}/optimized/properties/a-800.webp 800w, ${base}/optimized/properties/a.webp 1600w`,
    );
  });

  it("leaves other images alone", () => {
    expect(imageSrcSet(`${base}/properties/a.jpeg`)).toBeUndefined();
    expect(imageSrcSet("/assets/hero.webp")).toBeUndefined();
    expect(imageSrcSet(undefined)).toBeUndefined();
    expect(smallImage(`${base}/properties/a.jpeg`)).toBe(`${base}/properties/a.jpeg`);
  });
});
