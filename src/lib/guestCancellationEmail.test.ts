import { describe, expect, it } from "vitest";
// The guest's cancellation e-mail (cancel-booking) in the language they booked in
import { type CancellationFacts, guestCancellationEmail } from "../../supabase/functions/_shared/host-emails";
import { policyFor, policySummary, policyText } from "../../supabase/functions/_shared/cancellation";
import type { GuestLang } from "../../supabase/functions/_shared/guest-lang";

const LANGS: GuestLang[] = ["en", "sv", "de"];

// Host price 10 000 kr + 10 % fee; the guest cancels 30 days out
const guestCancels: CancellationFacts = {
  propertyTitle: "Lakehouse",
  checkIn: "2026-12-20",
  checkOut: "2026-12-27",
  guestName: "Anna",
  cancelledBy: "guest",
  requestedOn: "2026-11-20",
  daysBeforeArrival: 30,
  refundPercentage: 90,
  refundTarget: 900_000,
  refundAmount: 900_000,
  refundedEarlier: 0,
  serviceFeeKept: 100_000,
  hostTakenBack: 900_000,
  hostFromNextPayout: 0,
  hostRemaining: 100_000,
  cardFeeCharge: 0,
  payoutBefore: "held",
  payoutDueOn: "2026-12-21",
  hasPayment: true,
  currency: "SEK",
};
const withEarlier: CancellationFacts = { ...guestCancels, refundedEarlier: 200_000 };
const late: CancellationFacts = { ...guestCancels, daysBeforeArrival: 1, refundPercentage: 0, refundTarget: 0, refundAmount: 0 };
const hostCancels: CancellationFacts = {
  ...guestCancels,
  cancelledBy: "host",
  refundPercentage: 100,
  refundTarget: 1_100_000,
  refundAmount: 1_100_000,
  serviceFeeKept: 0,
};
const platformCancels: CancellationFacts = { ...hostCancels, cancelledBy: "platform" };

const policy = policyFor("standard");
const summary = (lang: GuestLang) => `${policyText(policy.key, lang).name}: ${policySummary(policy, lang)}`;
const email = (f: CancellationFacts, lang: GuestLang) => guestCancellationEmail(f, summary(lang), lang);

// Swedish digit grouping uses a no-break space; compare without it
const text = (html: string) => html.replace(/ /g, " ");
/** The amounts and percentages an e-mail states, in order ("90 %" and "90%" alike) */
const figures = (html: string) => [...text(html).matchAll(/\d[\d ]*(?:,\d+)? SEK|\d+ ?%/g)].map((m) => m[0].replace(/ %$/, "%"));

describe("guest cancellation e-mail in the guest's language", () => {
  it("is English by default, as it always was", () => {
    expect(guestCancellationEmail(guestCancels, summary("en"))).toEqual(email(guestCancels, "en"));
    expect(email(guestCancels, "en").subject).toBe("Your booking is cancelled – Lakehouse");
  });

  it("writes Swedish", () => {
    const { subject, html } = email(guestCancels, "sv");
    expect(subject).toBe("Din bokning är avbokad – Lakehouse");
    const body = text(html);
    expect(body).toContain("<p>Hej Anna,</p>");
    expect(body).toMatch(/Vi har avbokat din bokning av Lakehouse, söndag,? 20 december 2026 till söndag,? 27 december 2026, som du bad om\./);
    expect(body).toContain("Vi har betalat tillbaka 9 000 SEK: 90 % av priset för vistelsen");
    expect(body).toContain("30 dagar före ankomst");
    expect(body).toContain("Serviceavgiften (1 000 SEK) betalas inte tillbaka när en gäst avbokar.");
    expect(body).toContain(`Bokningens avbokningsregler – ${summary("sv")}.`);
    expect(body).toContain("Jenny &amp; Jon, Nordic Getaways");
  });

  it("writes German", () => {
    const { subject, html } = email(hostCancels, "de");
    expect(subject).toBe("Deine Buchung ist storniert – Lakehouse");
    const body = text(html);
    expect(body).toContain("<p>Hallo Anna,</p>");
    expect(body).toContain("Der Gastgeber musste deine Buchung für Lakehouse vom Sonntag, 20. Dezember 2026 bis Sonntag, 27. Dezember 2026 stornieren.");
    expect(body).toContain("auch die Servicegebühr: Wir haben dir 11 000 SEK erstattet.");
    expect(text(email(late, "de").html)).toContain("(1 Tag vor Anreise)");
  });

  it("states the same amounts and percentages in every language", () => {
    for (const f of [guestCancels, withEarlier, late, hostCancels, platformCancels, { ...guestCancels, hasPayment: false }]) {
      const english = figures(email(f, "en").html).sort();
      for (const lang of LANGS) expect(figures(email(f, lang).html).sort()).toEqual(english);
    }
  });

  it("tells who cancelled in every language", () => {
    const said: Record<GuestLang, [guest: string, host: string, platform: string]> = {
      en: ["as you asked", "the host has had to cancel", "we have had to cancel"],
      sv: ["som du bad om", "värden har behövt avboka", "vi har behövt avboka"],
      de: ["Wie gewünscht", "Der Gastgeber musste", "Wir mussten"],
    };
    for (const lang of LANGS) {
      const [guest, host, platform] = said[lang];
      const cases: [CancellationFacts, string][] = [[guestCancels, guest], [hostCancels, host], [platformCancels, platform]];
      for (const [f, expected] of cases) {
        const body = email(f, lang).html;
        for (const phrase of said[lang]) {
          if (phrase === expected) expect(body).toContain(phrase);
          else expect(body).not.toContain(phrase);
        }
      }
    }
  });

  it("escapes every value in every language", () => {
    for (const lang of LANGS) {
      const { html } = guestCancellationEmail(
        { ...guestCancels, guestName: "<script>x</script>", propertyTitle: "Sjö & <b>stuga</b>" },
        "<i>policy</i>",
        lang,
      );
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("Sjö &amp; &lt;b&gt;stuga&lt;/b&gt;");
      expect(html).toContain("&lt;i&gt;policy&lt;/i&gt;");
    }
  });
});
