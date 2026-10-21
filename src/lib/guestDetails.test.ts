import { describe, expect, it } from "vitest";
import { isValidGuestName, isValidGuestPhone, phoneDigitCount } from "./guestDetails";

describe("isValidGuestName", () => {
  it.each([
    "Åsa Öberg",
    "Zoë Müller",
    "Łukasz Nowak",
    "Šimon Novák",
    "Ősz Péter",
    "Çağrı Yılmaz",
    "Nguyễn Văn An",
    "O'Brien",
    "O’Brien",
    "John Jr.",
    "Anna-Karin",
  ])("accepts %s", (name) => {
    expect(isValidGuestName(name)).toBe(true);
  });

  it.each(["<b>Bob</b>", "Bob & Alice", "R2D2", "--", ". '", "a@b"])("rejects %s", (name) => {
    expect(isValidGuestName(name)).toBe(false);
  });
});

describe("isValidGuestPhone", () => {
  it.each([
    "+46 70 123 45 67",
    "+44 20 7946 0958",
    "+1 (555) 123-4567",
    "+49 151 2345 6789",
    "070-123 45 67",
    "0046701234567",
  ])("accepts %s", (phone) => {
    expect(isValidGuestPhone(phone)).toBe(true);
  });

  it.each([
    ["123 45", "too few digits"],
    ["+46 70 123 45 67 89 01 2", "more than 15 digits"],
    ["070 123 45 67 ext 2", "letters"],
    ["46+70 123 45 67", "+ in the middle"],
  ])("rejects %s (%s)", (phone) => {
    expect(isValidGuestPhone(phone)).toBe(false);
  });

  it("counts digits, not characters", () => {
    expect(phoneDigitCount("+46 (0)70-123 45 67")).toBe(12);
  });
});
