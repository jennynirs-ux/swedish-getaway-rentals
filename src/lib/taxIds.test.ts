import { describe, expect, it } from "vitest";
import { maskTail, parseForeignTin, parseOrgNumber, parsePersonnummer, parseVatNumber } from "../../supabase/functions/_shared/tax-ids";

const today = "2026-10-22";

describe("parsePersonnummer", () => {
  it("accepts the 12- and 10-digit forms and gives the date of birth", () => {
    for (const input of ["19850312-1231", "198503121231", "850312-1231", " 850312 1231 "]) {
      const r = parsePersonnummer(input, today);
      expect(r).toMatchObject({ ok: true, value: { normalized: "198503121231", dateOfBirth: "1985-03-12", masked: "19850312-••••" } });
    }
  });

  it("puts a 10-digit number in the right century", () => {
    expect(parsePersonnummer("000101-1238", today)).toMatchObject({ ok: true, value: { dateOfBirth: "2000-01-01" } });
    // 100 or older: written with "+"
    expect(parsePersonnummer("121212+1212", today)).toMatchObject({ ok: true, value: { dateOfBirth: "1912-12-12" } });
    expect(parsePersonnummer("121212-1212", today)).toMatchObject({ ok: true, value: { dateOfBirth: "2012-12-12" } });
  });

  it("reads a samordningsnummer's day (60 added)", () => {
    expect(parsePersonnummer("19850372-1238", today)).toMatchObject({
      ok: true,
      value: { dateOfBirth: "1985-03-12", samordningsnummer: true },
    });
  });

  it("refuses wrong check digits, impossible dates and other shapes", () => {
    expect(parsePersonnummer("19850312-1232", today)).toMatchObject({ ok: false });
    expect(parsePersonnummer("19850230-1231", today)).toMatchObject({ ok: false });
    expect(parsePersonnummer("1985-03-12", today)).toMatchObject({ ok: false });
    expect(parsePersonnummer("20300101-1234", today)).toMatchObject({ ok: false });
  });
});

describe("parseOrgNumber", () => {
  it("accepts Mojjo AB's number with or without the 16 prefix", () => {
    expect(parseOrgNumber("559477-3912")).toEqual({ ok: true, value: { normalized: "5594773912", formatted: "559477-3912" } });
    expect(parseOrgNumber("165594773912")).toMatchObject({ ok: true, value: { formatted: "559477-3912" } });
  });

  it("refuses a personnummer and wrong check digits", () => {
    expect(parseOrgNumber("850312-1231")).toMatchObject({ ok: false });
    expect(parseOrgNumber("559477-3913")).toMatchObject({ ok: false });
  });
});

describe("parseVatNumber and others", () => {
  it("tidies VAT numbers and checks Swedish ones closely", () => {
    expect(parseVatNumber("se 5594 7739 1201")).toEqual({ ok: true, value: "SE559477391201" });
    expect(parseVatNumber("")).toEqual({ ok: true, value: null });
    expect(parseVatNumber("SE5594773912")).toMatchObject({ ok: false });
    expect(parseVatNumber("DE123456789")).toEqual({ ok: true, value: "DE123456789" });
  });

  it("keeps a foreign tax number as written and masks tails", () => {
    expect(parseForeignTin(" 12345678901 ")).toEqual({ ok: true, value: "12345678901" });
    expect(parseForeignTin("x")).toMatchObject({ ok: false });
    expect(maskTail("DE-123 456 789")).toBe("••••6789");
  });
});
