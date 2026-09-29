import { describe, expect, it } from "vitest";
import { hostShareOre, withServiceFee } from "./constants";

describe("fee model A", () => {
  it("adds the 10% service fee on top of the host price", () => {
    expect(withServiceFee(11000)).toBeCloseTo(12100);
    expect(withServiceFee(2500)).toBeCloseTo(2750);
  });

  it("uses the stored host share, else total minus service fee", () => {
    expect(hostShareOre({ total_amount: 2530000, host_amount: 2300000, service_fee: 230000 })).toBe(2300000);
    expect(hostShareOre({ total_amount: 2530000, service_fee: 230000 })).toBe(2300000);
    expect(hostShareOre({ total_amount: 1000 })).toBe(1000);
  });
});
