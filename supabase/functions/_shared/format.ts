// Dates and times for guest e-mails: "Saturday 3 October 2026", "16:00"

/** "2026-10-03" -> "Saturday 3 October 2026" */
export const longDate = (isoDate: string): string =>
  new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
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
