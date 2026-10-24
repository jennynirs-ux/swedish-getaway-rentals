// Dates and times for guest e-mails: "Saturday 3 October 2026", "16:00"

const DATE_LOCALES = { en: "en-GB", sv: "sv-SE", de: "de-DE" } as const;

/** "2026-10-03" -> "Saturday 3 October 2026" ("lördag 3 oktober 2026", "Samstag, 3. Oktober 2026") */
export const longDate = (isoDate: string, lang: keyof typeof DATE_LOCALES = "en"): string =>
  new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString(DATE_LOCALES[lang] ?? "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** "16:00:00" -> "16:00" */
export const hhmm = (time: string | null | undefined, fallback: string): string =>
  (time || fallback).slice(0, 5);

/** Today's date in Sweden, "YYYY-MM-DD" */
export const stockholmToday = (): string =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(new Date());
