import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPartyNight, stayRuleError } from "./stayRules";

describe("stayRuleError", () => {
  it.each([
    ["2026-10-09", "2026-10-10", false, "one night"],
    ["2026-10-09", "2026-10-11", true, "a normal weekend"],
    ["2026-12-30", "2027-01-01", false, "two nights over New Year's Eve"],
    ["2026-12-30", "2027-01-02", true, "three nights over New Year's Eve"],
    ["2027-04-29", "2027-05-01", false, "two nights over Valborg"],
    ["2027-06-24", "2027-06-26", false, "two nights over Midsummer Eve 2027 (Fri 25 June)"],
    ["2026-06-18", "2026-06-20", false, "two nights over Midsummer Eve 2026 (Fri 19 June)"],
    ["2027-06-18", "2027-06-20", true, "18-19 June 2027 is not Midsummer"],
  ])("%s to %s is %s (%s)", (checkIn, checkOut, allowed) => {
    expect(stayRuleError(checkIn, checkOut) === null).toBe(allowed);
  });
});

describe("isPartyNight", () => {
  it("finds Midsummer Eve as the Friday between 19 and 25 June", () => {
    expect(isPartyNight("2028-06-23")).toBe(true);
    expect(isPartyNight("2028-06-24")).toBe(false);
  });
});

// The payment function enforces the same rules from its own copy
it("matches supabase/functions/_shared/stay-rules.ts", () => {
  const code = (path: string) =>
    readFileSync(path, "utf8").split("\n").slice(2).join("\n").replace(/["']/g, "'");
  expect(code("src/lib/stayRules.ts")).toBe(code("supabase/functions/_shared/stay-rules.ts"));
});
