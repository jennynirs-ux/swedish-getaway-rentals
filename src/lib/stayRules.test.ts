import { describe, expect, it } from "vitest";
import { houseRuleLines, isPartyNight, stayRuleError } from "./stayRules";

// The owners' cabins: 2 nights, 3 over the party nights
const owners = { min_nights: 2, holiday_min_nights: 3, min_guest_age: 25 };

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
    expect(stayRuleError(checkIn, checkOut, owners) === null).toBe(allowed);
  });

  it("follows each listing's own minimum", () => {
    expect(stayRuleError("2026-10-09", "2026-10-10", { min_nights: 1 })).toBeNull();
    expect(stayRuleError("2026-10-09", "2026-10-10", {})).toBeNull();
    expect(stayRuleError("2026-10-09", "2026-10-12", { min_nights: 4 })).toBe("The minimum stay is 4 nights.");
    // No longer holiday minimum: a single night over New Year's Eve is fine
    expect(stayRuleError("2026-12-31", "2027-01-01", { min_nights: 1 })).toBeNull();
    // A holiday minimum no longer than the normal one changes nothing
    expect(stayRuleError("2026-12-30", "2027-01-01", { min_nights: 2, holiday_min_nights: 2 })).toBeNull();
  });
});

describe("houseRuleLines", () => {
  it("states every rule, with the holiday minimum only when it is longer", () => {
    expect(houseRuleLines({ ...owners, pets_allowed: false, smoking_allowed: false, events_allowed: false })).toEqual([
      "Minimum stay 2 nights (3 over Valborg, Midsummer and New Year's Eve)",
      "No pets",
      "No smoking",
      "No parties or events",
      "The person booking is at least 25 and stays at the place",
    ]);
    expect(houseRuleLines({ min_nights: 1, pets_allowed: true, min_guest_age: 16 })).toEqual([
      "Minimum stay 1 night",
      "Pets allowed",
      "No smoking",
      "No parties or events",
      "The person booking is at least 18 and stays at the place",
    ]);
  });
});

describe("in Swedish and German", () => {
  it("explains why a stay is too short", () => {
    expect(stayRuleError("2026-10-09", "2026-10-10", { min_nights: 2 }, "sv")).toBe("Minsta vistelse är 2 nätter.");
    expect(stayRuleError("2026-10-09", "2026-10-10", { min_nights: 2 }, "de")).toBe("Der Mindestaufenthalt beträgt 2 Nächte.");
    expect(stayRuleError("2026-12-30", "2027-01-01", owners, "sv")).toBe(
      "Över valborg, midsommar och nyårsafton är minsta vistelse 3 nätter.",
    );
    expect(stayRuleError("2026-12-30", "2027-01-01", owners, "de")).toBe(
      "Über Walpurgisnacht, Mittsommer und Silvester beträgt der Mindestaufenthalt 3 Nächte.",
    );
    expect(stayRuleError("2026-10-09", "2026-10-11", owners, "de")).toBeNull();
    // English unless asked: the payment function's answers
    expect(stayRuleError("2026-10-09", "2026-10-10", { min_nights: 2 }, "en")).toBe("The minimum stay is 2 nights.");
  });

  it("states the house rules", () => {
    expect(houseRuleLines({ ...owners, pets_allowed: false, smoking_allowed: false, events_allowed: false }, "sv")).toEqual([
      "Minsta vistelse 2 nätter (3 över valborg, midsommar och nyårsafton)",
      "Inga husdjur",
      "Ingen rökning",
      "Inga fester eller evenemang",
      "Den som bokar är minst 25 år och bor själv på boendet",
    ]);
    expect(houseRuleLines({ min_nights: 1, pets_allowed: true, smoking_allowed: true, events_allowed: true }, "de")).toEqual([
      "Mindestaufenthalt 1 Nacht",
      "Haustiere erlaubt",
      "Rauchen erlaubt",
      "Partys und Veranstaltungen erlaubt",
      "Die buchende Person ist mindestens 18 Jahre alt und übernachtet selbst in der Unterkunft",
    ]);
    expect(houseRuleLines(owners, "en")).toEqual(houseRuleLines(owners));
  });
});

describe("isPartyNight", () => {
  it("finds Midsummer Eve as the Friday between 19 and 25 June", () => {
    expect(isPartyNight("2028-06-23")).toBe(true);
    expect(isPartyNight("2028-06-24")).toBe(false);
  });
});
