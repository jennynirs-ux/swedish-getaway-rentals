import { describe, expect, it } from "vitest";
import { guestLang, guestPageUrl } from "../../supabase/functions/_shared/guest-lang";
import { longDate } from "../../supabase/functions/_shared/format";
import { privateListingTexts } from "../../supabase/functions/_shared/listing-text";

describe("guest language helpers", () => {
  it("only knows our languages", () => {
    expect(guestLang("sv")).toBe("sv");
    expect(guestLang("de")).toBe("de");
    expect(guestLang("fr")).toBe("en");
    expect(guestLang(undefined)).toBe("en");
  });

  it("links to the page in the guest's language", () => {
    expect(guestPageUrl("https://x.com", "en", "/property/a/guide")).toBe("https://x.com/property/a/guide");
    expect(guestPageUrl("https://x.com", "sv", "/property/a/guide")).toBe("https://x.com/sv/property/a/guide");
    expect(guestPageUrl("https://x.com", "de", "/")).toBe("https://x.com/de");
  });

  it("writes dates in the guest's language", () => {
    // ICU versions differ on the comma after the weekday
    expect(longDate("2026-10-03")).toMatch(/^Saturday,? 3 October 2026$/);
    expect(longDate("2026-10-03", "sv")).toMatch(/^lördag,? 3 oktober 2026$/);
    expect(longDate("2026-10-03", "de")).toBe("Samstag, 3. Oktober 2026");
  });

  it("collects the private texts of enabled templates only", () => {
    expect(
      privateListingTexts(
        { check_in_instructions: "Nyckeln finns i boxen", parking_info: null },
        {
          booking_confirmation: { enabled: true, subject: "Välkommen {guest_name}", message: "Hej!" },
          pre_arrival: { enabled: false, subject: "Snart", message: "Snart dags" },
          check_out: { enabled: true, subject: "Hej då", message: "Tack" },
        },
      ),
    ).toEqual({
      check_in_instructions: "Nyckeln finns i boxen",
      "email_templates.booking_confirmation.subject": "Välkommen {guest_name}",
      "email_templates.booking_confirmation.message": "Hej!",
    });
  });
});
