import { describe, expect, it } from "vitest";
import { foundingHostOfferOpen, hostShareOre, withServiceFee } from "./constants";

describe("fee model A", () => {
  it("adds the 10% service fee on top of the host price", () => {
    expect(withServiceFee(11000)).toBeCloseTo(12100);
    expect(withServiceFee(2500)).toBeCloseTo(2750);
  });

  it("uses the property's own rate (5% during the founding-host offer)", () => {
    expect(withServiceFee(2500, 5)).toBeCloseTo(2625);
    expect(withServiceFee(2500, null)).toBeCloseTo(2750);
  });

  it("offers founding-host terms to hosts who join by 31 December 2026, Swedish time", () => {
    expect(foundingHostOfferOpen(new Date("2026-12-31T22:59:00Z"))).toBe(true);
    expect(foundingHostOfferOpen(new Date("2026-12-31T23:00:00Z"))).toBe(false);
  });

  it("uses the stored host share, else total minus service fee", () => {
    expect(hostShareOre({ total_amount: 2530000, host_amount: 2300000, service_fee: 230000 })).toBe(2300000);
    expect(hostShareOre({ total_amount: 2530000, service_fee: 230000 })).toBe(2300000);
    expect(hostShareOre({ total_amount: 1000 })).toBe(1000);
  });
});
