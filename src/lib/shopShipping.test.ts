import { describe, expect, it } from "vitest";
import { regionFor, shippingCost } from "../../supabase/functions/_shared/shop-shipping";

const settings = {
  fallback_rates: [
    { region: "Sweden", rate: 14896 },
    { region: "Europe", rate: 19900 },
    { region: "World", rate: 29900 },
  ],
  free_shipping_threshold: 100000,
};

describe("shop shipping", () => {
  it("groups countries into regions", () => {
    expect(regionFor("SE")).toBe("Sweden");
    expect(regionFor("DE")).toBe("Europe");
    expect(regionFor("GB")).toBe("Europe");
    expect(regionFor("US")).toBe("World");
  });

  it("charges more abroad", () => {
    expect(shippingCost(settings, "SE", 24900)).toBe(14896);
    expect(shippingCost(settings, "DK", 24900)).toBe(19900);
    expect(shippingCost(settings, "CA", 24900)).toBe(29900);
  });

  it("is free above the threshold within Sweden only", () => {
    expect(shippingCost(settings, "SE", 120000)).toBe(0);
    expect(shippingCost(settings, "DE", 120000)).toBe(19900);
  });
});
