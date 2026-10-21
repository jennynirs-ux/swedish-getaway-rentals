import { describe, expect, it } from "vitest";
import { listedPrice, pickVariant, variantPriceRange } from "../../supabase/functions/_shared/shop-variants";

const hat = { printful_data: { variants: [{ id: 4963911206, name: "Corduroy hat / Black" }] } };
const shirt = { printful_data: JSON.stringify({ variants: [{ id: 1, name: "S" }, { id: 2, name: "M" }] }) };

describe("pickVariant (which Printful variant an order line ships)", () => {
  it("uses the only variant when the customer didn't choose", () => {
    expect(pickVariant(hat, null)?.id).toBe(4963911206);
  });
  it("needs a choice when there are several", () => {
    expect(pickVariant(shirt, null)).toBeNull();
    expect(pickVariant(shirt, "2")?.name).toBe("M");
  });
  it("rejects a variant that isn't the product's", () => {
    expect(pickVariant(shirt, "99")).toBeNull();
    expect(pickVariant({ printful_data: null }, null)).toBeNull();
  });
});

describe("variantPriceRange (what a product is listed at)", () => {
  const blanket = [
    { id: 1, retail_price: "1149.00" },
    { id: 2, retail_price: "649.00" },
    { id: 3, retail_price: "649.00" },
    { id: 4, retail_price: "99.00", is_ignored: true },
  ];
  it("takes the cheapest and dearest variant a customer can buy", () => {
    const range = variantPriceRange(blanket);
    expect(range).toMatchObject({ min: 64900, max: 114900 });
    expect(range?.cheapest.id).toBe(2);
  });
  it("is null without prices", () => {
    expect(variantPriceRange([{ retail_price: null }])).toBeNull();
    expect(variantPriceRange([])).toBeNull();
  });
});

describe("listedPrice (the price before a size is picked)", () => {
  it("says from when sizes cost different amounts", () => {
    expect(listedPrice({ price: 64900, price_max: 114900 })).toEqual({ price: 64900, from: true });
    expect(listedPrice({ price: 39900, price_max: 39900 })).toEqual({ price: 39900, from: false });
    expect(listedPrice({ price: 39900 })).toEqual({ price: 39900, from: false });
  });
  it("shows an admin override as it is", () => {
    expect(listedPrice({ price: 64900, price_max: 114900, price_override: 79900 })).toEqual({ price: 79900, from: false });
  });
});
