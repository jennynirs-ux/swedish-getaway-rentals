import { describe, expect, it } from "vitest";
// The guestbook invitation (send-guestbook-invitations) in the language the guest booked in
import { guestbookInvitationEmail } from "../../supabase/functions/_shared/guestbook-email";
import { guestPageUrl } from "../../supabase/functions/_shared/guest-lang";

const invitation = {
  guestName: "Anna",
  propertyTitle: "Lakehouse",
  checkIn: "2026-10-03",
  checkOut: "2026-10-05",
};
const url = (lang: "en" | "sv" | "de") =>
  `${guestPageUrl("https://nordic-getaways.com", lang, "/property/p1/guestbook")}?token=abc-123`;

describe("guestbook invitation in the guest's language", () => {
  it("English is the e-mail as it always was", () => {
    const { subject, html } = guestbookInvitationEmail({ ...invitation, lang: "en", url: url("en") });
    expect(subject).toBe("🌿 Share Your Experience at Lakehouse");
    expect(html).toContain("\n          <html>\n");
    expect(html).toContain("<p>Dear Anna,</p>");
    expect(html).toContain(
      `<p>We hope you had a wonderful and relaxing stay at <strong>Lakehouse</strong>. It was our pleasure to host you from ${new Date("2026-10-03").toLocaleDateString()} to ${new Date("2026-10-05").toLocaleDateString()}.</p>`,
    );
    expect(html).toContain('<a href="https://nordic-getaways.com/property/p1/guestbook?token=abc-123" class="button">Write in Our Guestbook 🌿</a>');
    expect(html).toContain("<strong>The Nordic Getaways Team</strong>");
  });

  it("writes Swedish, with the Swedish guestbook page", () => {
    const { subject, html } = guestbookInvitationEmail({ ...invitation, lang: "sv", url: url("sv") });
    expect(subject).toBe("🌿 Berätta om din vistelse på Lakehouse");
    expect(html).toContain('<html lang="sv">');
    expect(html).toContain("<p>Hej Anna,</p>");
    expect(html).toMatch(/vistelse på <strong>Lakehouse<\/strong>\. .* från lördag,? 3 oktober 2026 till måndag,? 5 oktober 2026\./);
    expect(html).toContain('<a href="https://nordic-getaways.com/sv/property/p1/guestbook?token=abc-123" class="button">Skriv i vår gästbok 🌿</a>');
    expect(html).toContain("30 dagar");
  });

  it("writes German, with the German guestbook page", () => {
    const { subject, html } = guestbookInvitationEmail({ ...invitation, lang: "de", url: url("de") });
    expect(subject).toBe("🌿 Erzähl uns von deinem Aufenthalt – Lakehouse");
    expect(html).toContain('<html lang="de">');
    expect(html).toContain("<p>Hallo Anna,</p>");
    expect(html).toContain("vom Samstag, 3. Oktober 2026 bis Montag, 5. Oktober 2026");
    expect(html).toContain('href="https://nordic-getaways.com/de/property/p1/guestbook?token=abc-123"');
    expect(html).toContain("Gästebuch");
    expect(html).toContain("30 Tage");
  });
});
