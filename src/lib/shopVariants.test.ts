import { describe, expect, it } from "vitest";
import { pickVariant } from "../../supabase/functions/_shared/shop-variants";

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
