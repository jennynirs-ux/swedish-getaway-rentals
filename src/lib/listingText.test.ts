import { describe, expect, it } from "vitest";
import { applyListingTexts, listingTexts, textHash } from "../../supabase/functions/_shared/listing-text";

const property = {
  id: "p1",
  title: "Stuga vid sjön",
  description: "Mysig stuga.\nBastu vid bryggan.",
  tagline_line1: null,
  amenities: ["Sauna", "WiFi"],
  amenities_data: [{ title: "Bastu", icon: "Flame", image_url: "https://x/y.jpg", features: ["Vedeldad", "Utsikt"] }],
  guidebook_sections: [{ id: "s1", title: "Ankomst", blocks: [{ id: "b1", type: "list", title: "Handla", items: ["ICA Kvantum Lerum"], content: "" }] }],
};

describe("listingTexts", () => {
  it("collects the text guests see, and nothing else", () => {
    const texts = listingTexts(property, [{ id: "r1", name: "Badtunna" }]);
    expect(texts).toEqual({
      title: "Stuga vid sjön",
      description: "Mysig stuga.\nBastu vid bryggan.",
      "amenities_data.0.title": "Bastu",
      "amenities_data.0.features.0": "Vedeldad",
      "amenities_data.0.features.1": "Utsikt",
      "guidebook_sections.0.title": "Ankomst",
      "guidebook_sections.0.blocks.0.title": "Handla",
      "guidebook_sections.0.blocks.0.items.0": "ICA Kvantum Lerum",
      "amenity:Sauna": "Sauna",
      "amenity:WiFi": "WiFi",
      "extra:r1": "Badtunna",
    });
  });
});

describe("applyListingTexts", () => {
  it("puts translations in place without touching the original", () => {
    const translated = applyListingTexts(property, {
      title: "Cabin by the lake",
      "amenities_data.0.features.1": "View",
      "guidebook_sections.0.blocks.0.title": "Shopping",
      "amenity:Sauna": "Bastu",
      "guidebook_sections.9.title": "Nothing here",
    });
    expect(translated.title).toBe("Cabin by the lake");
    expect(translated.amenities_data[0].features).toEqual(["Vedeldad", "View"]);
    expect(translated.guidebook_sections[0].blocks[0].title).toBe("Shopping");
    expect(translated.amenities).toEqual(["Sauna", "WiFi"]);
    expect(property.title).toBe("Stuga vid sjön");
    expect(property.amenities_data[0].features).toEqual(["Vedeldad", "Utsikt"]);
    expect(property.guidebook_sections[0].blocks[0].title).toBe("Handla");
  });
});

describe("textHash", () => {
  it("is stable and tells texts apart", () => {
    expect(textHash("Bastu")).toBe(textHash("Bastu"));
    expect(textHash("Bastu")).not.toBe(textHash("Bastu "));
    expect(textHash("")).toMatch(/^[0-9a-z]+$/);
  });
});
