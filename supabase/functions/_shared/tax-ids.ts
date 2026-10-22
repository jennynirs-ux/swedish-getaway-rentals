// Checks for the tax numbers hosts give for DAC7 (save-host-tax-profile; the
// host's form shows the same messages). Pure functions, no secrets: the
// numbers are encrypted elsewhere and never logged.

/** Luhn check digit over a string of digits (Swedish personnummer and organisationsnummer use it) */
function luhnOk(digits: string): boolean {
  let total = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
  }
  return total % 10 === 0;
}

const validDate = (year: number, month: number, day: number) => {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
};

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface Personnummer {
  /** 12 digits, YYYYMMDDNNNN */
  normalized: string;
  /** "YYYY-MM-DD" (a samordningsnummer's day has 60 added; this is the real day) */
  dateOfBirth: string;
  /** "19850312-••••" */
  masked: string;
  samordningsnummer: boolean;
}

/**
 * A Swedish personnummer or samordningsnummer, written YYYYMMDD-NNNN,
 * YYMMDD-NNNN or YYMMDD+NNNN (100 or older). `today` is "YYYY-MM-DD".
 */
export function parsePersonnummer(input: string, today: string): Parsed<Personnummer> {
  const raw = input.trim().replace(/\s/g, "");
  const centenarian = raw.includes("+");
  const digits = raw.replace(/[-+]/g, "");
  if (!/^\d{10}(\d{2})?$/.test(digits)) {
    return { ok: false, error: "Write your personnummer as YYYYMMDD-NNNN." };
  }
  let full = digits;
  if (digits.length === 10) {
    const [ty, tm, td] = today.split("-").map(Number);
    const yy = Number(digits.slice(0, 2));
    let year = Math.floor(ty / 100) * 100 + yy;
    const mmdd = Number(digits.slice(2, 6));
    if (year > ty || (year === ty && mmdd > tm * 100 + td)) year -= 100;
    if (centenarian) year -= 100;
    full = `${year}${digits.slice(2)}`;
  }
  const year = Number(full.slice(0, 4));
  const month = Number(full.slice(4, 6));
  let day = Number(full.slice(6, 8));
  const samordningsnummer = day > 60;
  if (samordningsnummer) day -= 60;
  if (!validDate(year, month, day)) {
    return { ok: false, error: "The date in your personnummer is not a real date." };
  }
  const dateOfBirth = `${full.slice(0, 4)}-${full.slice(4, 6)}-${String(day).padStart(2, "0")}`;
  if (dateOfBirth > today) {
    return { ok: false, error: "The date in your personnummer is in the future." };
  }
  if (!luhnOk(full.slice(2))) {
    return { ok: false, error: "That personnummer does not add up. Check the last four digits." };
  }
  return { ok: true, value: { normalized: full, dateOfBirth, masked: `${full.slice(0, 8)}-••••`, samordningsnummer } };
}

export interface OrgNumber {
  /** 10 digits */
  normalized: string;
  /** "559477-3912" (public, so not masked) */
  formatted: string;
}

/** A Swedish organisationsnummer: NNNNNN-NNNN, also with the "16" prefix */
export function parseOrgNumber(input: string): Parsed<OrgNumber> {
  let digits = input.trim().replace(/[\s-]/g, "");
  if (/^16\d{10}$/.test(digits)) digits = digits.slice(2);
  if (!/^\d{10}$/.test(digits)) {
    return { ok: false, error: "Write the organisationsnummer as NNNNNN-NNNN." };
  }
  // Legal entities have 20 or more in the "month" digits; a sole trader uses their personnummer
  if (Number(digits.slice(2, 4)) < 20) {
    return { ok: false, error: "That looks like a personnummer. A sole trader rents out as a private person here." };
  }
  if (!luhnOk(digits)) {
    return { ok: false, error: "That organisationsnummer does not add up. Check the digits." };
  }
  return { ok: true, value: { normalized: digits, formatted: `${digits.slice(0, 6)}-${digits.slice(6)}` } };
}

/** A VAT number, e.g. SE559477391201; empty means none */
export function parseVatNumber(input: string): Parsed<string | null> {
  const v = input.trim().replace(/[\s.-]/g, "").toUpperCase();
  if (!v) return { ok: true, value: null };
  if (v.startsWith("SE") ? !/^SE\d{10}01$/.test(v) : !/^[A-Z]{2}[0-9A-Z+*]{2,13}$/.test(v)) {
    return { ok: false, error: "Write the VAT number with its country code, e.g. SE559477391201." };
  }
  return { ok: true, value: v };
}

/** Another country's tax number: kept as written, just tidied */
export function parseForeignTin(input: string): Parsed<string> {
  const v = input.trim().replace(/\s+/g, " ");
  if (!/^[0-9A-Za-z][0-9A-Za-z ./-]{2,29}$/.test(v)) {
    return { ok: false, error: "Write the tax number as it appears on your tax documents." };
  }
  return { ok: true, value: v };
}

/** "••••1234": never more than half of a short number */
export const maskTail = (value: string) => {
  const clean = value.replace(/[^0-9A-Za-z]/g, "");
  return `••••${clean.length >= 8 ? clean.slice(-4) : clean.length >= 5 ? clean.slice(-2) : ""}`;
};
