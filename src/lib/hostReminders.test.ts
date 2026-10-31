import { describe, expect, it } from "vitest";
// What send-host-reminders e-mails hosts, and when
import {
  dac7Due,
  hasReminder,
  type HostNotice,
  hostDisplayName,
  hostReminderEmail,
  listingReminderDue,
  listingSteps,
  maskNames,
  noticeRows,
  planHostReminders,
  PREVIEW_NAME,
  previewEntry,
  publishUrl,
  type ReminderHost,
  type ReminderListing,
  TAX_URL,
} from "../../supabase/functions/_shared/host-reminders";
import { HOST_TERMS_VERSION } from "../../supabase/functions/_shared/host-terms";

const NOW = new Date("2026-11-01T08:00:00Z");
const daysBefore = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

const host = (overrides: Partial<ReminderHost> = {}): ReminderHost => ({
  id: "11111111-2222-3333-4444-555555555555",
  email: "anna@example.com",
  full_name: "Anna Svensson",
  display_name: null,
  host_business_name: null,
  stripe_connect_ready: true,
  host_terms_accepted_at: "2026-10-23T10:00:00Z",
  host_terms_version: HOST_TERMS_VERSION,
  ...overrides,
});

const listing = (overrides: Partial<ReminderListing> = {}): ReminderListing => ({
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  host_id: host().id,
  title: "Stugan vid sjön",
  active: false,
  latitude: 57.7,
  longitude: 12.0,
  county: "Västra Götalands län",
  gallery_images: ["1", "2", "3", "4", "5"],
  description: "Ett rött hus vid vattnet.",
  created_at: daysBefore(8),
  first_published_at: null,
  has_calendar_feed: true,
  ...overrides,
});

const notice = (kind: string, days: number, propertyId: string | null = null): HostNotice => ({
  kind,
  property_id: propertyId,
  sent_at: daysBefore(days),
});

describe("listingSteps", () => {
  it("names what is missing to publish, in the publish window's order", () => {
    const steps = listingSteps(
      listing({ latitude: null }),
      host({ stripe_connect_ready: false, host_terms_accepted_at: null }),
      true,
    );
    expect(steps.required).toEqual(["location", "terms", "payouts"]);
    expect(steps.recommended).toEqual([]);
  });

  it("needs the county too, and the current version of the terms", () => {
    expect(listingSteps(listing({ county: null }), host(), true).required).toEqual(["location"]);
    expect(listingSteps(listing(), host({ host_terms_version: "2026-01-01" }), true).required).toEqual(["terms"]);
  });

  it("says 'publish' when nothing is missing", () => {
    expect(listingSteps(listing(), host(), true)).toEqual({ required: ["publish"], recommended: [] });
  });

  it("asks about other booking sites without a calendar feed (the publish window requires an answer)", () => {
    expect(listingSteps(listing({ has_calendar_feed: false }), host(), true).required).toEqual(["calendar"]);
    expect(listingSteps(listing({ has_calendar_feed: undefined, county: null }), host(), true).required).toEqual([
      "location",
      "calendar",
    ]);
  });

  it("recommends photos, a description and tax details without requiring them", () => {
    const steps = listingSteps(listing({ gallery_images: ["1", "2", "3", "4"], description: "<p> </p>" }), host(), false);
    expect(steps).toEqual({ required: ["publish"], recommended: ["photos", "description", "tax"] });
    expect(listingSteps(listing({ gallery_images: null, description: null }), host(), true).recommended).toEqual([
      "photos",
      "description",
    ]);
  });
});

describe("listingReminderDue", () => {
  const id = listing().id;

  it("waits until the listing is two days old", () => {
    expect(listingReminderDue(listing({ created_at: daysBefore(1) }), [], NOW)).toBe(false);
    expect(listingReminderDue(listing({ created_at: daysBefore(2) }), [], NOW)).toBe(true);
  });

  it("never reminds about a published listing", () => {
    expect(listingReminderDue(listing({ active: true }), [], NOW)).toBe(false);
  });

  it("never reminds about a listing that was live once (unpublished on purpose)", () => {
    expect(listingReminderDue(listing({ first_published_at: daysBefore(5) }), [], NOW)).toBe(false);
  });

  it("only reminds about listings created in the last 30 days", () => {
    expect(listingReminderDue(listing({ created_at: daysBefore(30) }), [], NOW)).toBe(true);
    expect(listingReminderDue(listing({ created_at: daysBefore(31) }), [], NOW)).toBe(false);
  });

  it("leaves at least 7 days between reminders", () => {
    expect(listingReminderDue(listing(), [notice("listing_unpublished", 6, id)], NOW)).toBe(false);
    expect(listingReminderDue(listing(), [notice("listing_unpublished", 7, id)], NOW)).toBe(true);
  });

  it("stops after 3 reminders", () => {
    const three = [20, 13, 7].map((d) => notice("listing_unpublished", d, id));
    expect(listingReminderDue(listing({ created_at: daysBefore(22) }), three.slice(0, 2), NOW)).toBe(true);
    expect(listingReminderDue(listing({ created_at: daysBefore(22) }), three, NOW)).toBe(false);
  });

  it("counts only this listing's reminders", () => {
    const other = [20, 13, 1].map((d) => notice("listing_unpublished", d, "bbbbbbbb-0000-0000-0000-000000000002"));
    expect(listingReminderDue(listing(), [...other, notice("dac7_request", 1)], NOW)).toBe(true);
  });
});

describe("dac7Due", () => {
  it("sends the request first", () => {
    expect(dac7Due([], NOW)).toEqual({ kind: "dac7_request", overdue: false });
  });

  it("reminds at least 14 days after the previous notice", () => {
    expect(dac7Due([notice("dac7_request", 13)], NOW).kind).toBeNull();
    expect(dac7Due([notice("dac7_request", 14)], NOW).kind).toBe("dac7_reminder");
    expect(dac7Due([notice("dac7_request", 30), notice("dac7_reminder", 10)], NOW).kind).toBeNull();
    expect(dac7Due([notice("dac7_request", 30), notice("dac7_reminder", 15)], NOW).kind).toBe("dac7_reminder");
  });

  it("ignores listing reminders when spacing DAC7 notices", () => {
    expect(dac7Due([notice("dac7_request", 20), notice("listing_unpublished", 1, listing().id)], NOW).kind).toBe(
      "dac7_reminder",
    );
  });

  it("stops at two reminders and tells support once 60 days have passed since the request", () => {
    const sent = [notice("dac7_reminder", 45), notice("dac7_reminder", 31)];
    expect(dac7Due([notice("dac7_request", 59), ...sent], NOW)).toEqual({ kind: null, overdue: false });
    expect(dac7Due([notice("dac7_request", 60), ...sent], NOW)).toEqual({ kind: null, overdue: true });
  });

  it("is not overdue after 60 days while a reminder is still to come", () => {
    expect(dac7Due([notice("dac7_request", 70), notice("dac7_reminder", 50)], NOW)).toEqual({
      kind: "dac7_reminder",
      overdue: false,
    });
  });
});

describe("planHostReminders", () => {
  const published = listing({ id: "cccccccc-0000-0000-0000-000000000003", active: true, created_at: daysBefore(40) });

  it("asks a host with a published listing for tax details", () => {
    const plan = planHostReminders(host(), [published], false, [], NOW);
    expect(plan).toMatchObject({ listings: [], dac7: "dac7_request", dac7Overdue: false, taxMissing: true });
    expect(hasReminder(plan)).toBe(true);
  });

  it("does not ask for tax details from hosts without a published listing, only recommends them", () => {
    const plan = planHostReminders(host(), [listing()], false, [], NOW);
    expect(plan.dac7).toBeNull();
    expect(plan.listings).toEqual([
      { propertyId: listing().id, title: "Stugan vid sjön", required: ["publish"], recommended: ["tax"] },
    ]);
  });

  it("keeps reminding about tax details after the host unpublished, once asked", () => {
    const unpublished = { ...published, active: false };
    expect(planHostReminders(host(), [unpublished], false, [], NOW).dac7).toBeNull();
    const plan = planHostReminders(host(), [unpublished], false, [notice("dac7_request", 14)], NOW);
    expect(plan).toMatchObject({ dac7: "dac7_reminder", hasPublished: false, dac7Asked: true });
    const overdue = [notice("dac7_request", 60), notice("dac7_reminder", 45), notice("dac7_reminder", 31)];
    expect(planHostReminders(host(), [unpublished], false, overdue, NOW).dac7Overdue).toBe(true);
  });

  it("has nothing to send when the tax details are complete and every listing is published", () => {
    const plan = planHostReminders(host(), [published], true, [], NOW);
    expect(hasReminder(plan)).toBe(false);
    expect(plan.dac7Overdue).toBe(false);
  });

  it("only looks at the host's own listings", () => {
    const plan = planHostReminders(host(), [listing({ host_id: "someone-else" })], true, [], NOW);
    expect(plan.listings).toEqual([]);
  });

  it("records one notice per listing and one for the DAC7 notice, with the step ids", () => {
    const plan = planHostReminders(host({ stripe_connect_ready: false }), [listing(), published], false, [], NOW);
    expect(noticeRows(host().id, plan)).toEqual([
      { profile_id: host().id, kind: "listing_unpublished", property_id: listing().id, details: ["payouts", "tax"] },
      { profile_id: host().id, kind: "dac7_request", property_id: null, details: ["tax"] },
    ]);
  });
});

describe("hostDisplayName", () => {
  it("never greets with an e-mail address", () => {
    expect(hostDisplayName(host({ display_name: "Anna", full_name: "anna@example.com" }))).toBe("Anna");
    expect(hostDisplayName(host({ full_name: "anna@example.com" }))).toBeNull();
    expect(hostDisplayName(host({ full_name: " ", host_business_name: "Sjöstugor AB" }))).toBe("Sjöstugor AB");
  });
});

describe("hostReminderEmail", () => {
  it("lists each listing's missing steps in Swedish with a button to its publish window", () => {
    const plan = planHostReminders(
      host({ stripe_connect_ready: false }),
      [listing({ latitude: null, gallery_images: [] })],
      true,
      [],
      NOW,
    );
    const { subject, html } = hostReminderEmail("Anna", plan);
    expect(subject).toBe("Några steg kvar innan din annons kan publiceras");
    expect(html).toContain("<p>Hej Anna!</p>");
    expect(html).toContain("Stugan vid sjön");
    expect(html).toContain("Sätt ut boendet på kartan och välj län.");
    expect(html).toContain("Gör klart utbetalningarna via Stripe");
    expect(html).toContain("Lägg till minst fem bilder");
    expect(html).toContain("Här är det som är kvar:");
    expect(html).toContain(`href="${publishUrl(listing().id)}"`);
    expect(publishUrl(listing().id)).toBe(`https://nordic-getaways.com/host-dashboard?publish=${listing().id}`);
    expect(html).toContain("Gör klart annonsen");
    // Tax details complete: no tax section
    expect(html).not.toContain(TAX_URL);
    expect(html).toContain("Jenny &amp; Jon, Nordic Getaways");
  });

  it("never says everything is done while the question about other booking sites is open", () => {
    const plan = planHostReminders(host(), [listing({ has_calendar_feed: false })], true, [], NOW);
    const { subject, html } = hostReminderEmail("Anna", plan);
    expect(subject).toBe("Några steg kvar innan din annons kan publiceras");
    expect(html).not.toContain("Allt som behövs är klart");
    expect(html).toContain("Berätta om boendet också finns på andra bokningssajter");
    expect(html).toContain("Jag hyr bara ut här");
  });

  it("tells a host who was asked before and has since unpublished that the details are still needed", () => {
    const plan = planHostReminders(host(), [listing()], false, [notice("dac7_request", 3)], NOW);
    expect(plan.dac7).toBeNull();
    const { html } = hostReminderEmail("Anna", plan);
    expect(html).toContain("Vi behöver fortfarande dina skatteuppgifter.");
    expect(html).not.toContain("Du kan publicera utan skatteuppgifter");
  });

  it("tells a host who has done everything to press Publicera", () => {
    const plan = planHostReminders(host(), [listing()], true, [], NOW);
    const { subject, html } = hostReminderEmail(null, plan);
    expect(subject).toBe("Din annons är redo att publiceras");
    expect(html).toContain("<p>Hej!</p>");
    expect(html).toContain("Tryck på Publicera");
    expect(html).toContain("Publicera annonsen");
    expect(html).not.toContain("Kvar innan du kan publicera");
    expect(html).not.toContain("Här är det som är kvar");
  });

  it("adds one tax section with a button to the payouts tab and why it is needed", () => {
    const second = listing({ id: "dddddddd-0000-0000-0000-000000000004", title: "Torpet" });
    const plan = planHostReminders(host(), [listing(), second], false, [], NOW);
    const { subject, html } = hostReminderEmail("Anna", plan);
    expect(subject).toBe("Dina annonser är redo att publiceras");
    expect(html.split(`href="${TAX_URL}"`)).toHaveLength(2);
    expect(TAX_URL).toBe("https://nordic-getaways.com/host-dashboard?tab=payouts");
    // The law makes us collect them; holding the payouts until then is our rule
    expect(html).toContain("Lagen (EU:s DAC7-regler) kräver att vi samlar in dem från alla värdar");
    expect(html).toContain("vi betalar ut pengar till dig när de är ifyllda");
    expect(html).not.toContain("Skatteverket");
    expect(html).toContain("Du kan publicera utan skatteuppgifter");
  });

  it("sends the DAC7 request and reminder on their own", () => {
    const published = listing({ active: true });
    const request = hostReminderEmail("Anna", planHostReminders(host(), [published], false, [], NOW));
    expect(request.subject).toBe("Vi behöver dina skatteuppgifter");
    expect(request.html).toContain("Nu när du har en publicerad annons");
    expect(request.html).not.toContain("Tack för att du har lagt upp");
    const reminder = hostReminderEmail(
      "Anna",
      planHostReminders(host(), [published], false, [notice("dac7_request", 14)], NOW),
    );
    expect(reminder.subject).toBe("Påminnelse: vi behöver dina skatteuppgifter");
    expect(reminder.html).toContain("En påminnelse");
  });

  it("escapes the host's name and the listing's title", () => {
    const plan = planHostReminders(host(), [listing({ title: `<img src=x onerror="alert(1)"> & co` })], true, [], NOW);
    const { html } = hostReminderEmail("<b>Anna</b>", plan);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>Anna");
    expect(html).toContain("&lt;b&gt;Anna&lt;/b&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; co");
  });

  it("uses no pressure wording", () => {
    const plan = planHostReminders(
      host({ stripe_connect_ready: false }),
      [listing(), listing({ id: "eeeeeeee-0000-0000-0000-000000000005", active: true })],
      false,
      [notice("dac7_request", 20)],
      NOW,
    );
    const { subject, html } = hostReminderEmail("Anna", plan);
    expect(`${subject} ${html}`).not.toMatch(/omedelbart|senast|sista chansen|stäng|brådskande|!!/i);
  });
});

describe("dry runs", () => {
  const anna = host({ display_name: "Anna", email: "anna.svensson@example.com" });

  it("masks the host's names and e-mail address, also inside titles", () => {
    expect(maskNames("Anna Svenssons stuga", anna)).toBe(`${PREVIEW_NAME}s stuga`);
    expect(maskNames("Stuga hos ANNA", anna)).toBe(`Stuga hos ${PREVIEW_NAME}`);
    expect(maskNames("Skriv till anna.svensson@example.com", anna)).toBe(`Skriv till ${PREVIEW_NAME}`);
    expect(maskNames("Stugan vid sjön", anna)).toBe("Stugan vid sjön");
  });

  it("masks each part of the full name and the e-mail when there is no display name", () => {
    const fullOnly = host({ display_name: null, full_name: "Anna Svensson", email: "a.lindqvist@example.com" });
    expect(maskNames("Annas stuga", fullOnly)).toBe(`${PREVIEW_NAME}s stuga`);
    expect(maskNames("Villa Svensson", fullOnly)).toBe(`Villa ${PREVIEW_NAME}`);
    expect(maskNames("Lindqvists torp", fullOnly)).toBe(`${PREVIEW_NAME}s torp`);
    expect(maskNames("Stugan vid sjön", fullOnly)).toBe("Stugan vid sjön");
    const entry = previewEntry(fullOnly, planHostReminders(fullOnly, [listing({ title: "Annas stuga" })], true, [], NOW));
    expect(JSON.stringify(entry)).not.toMatch(/anna|svensson|lindqvist/i);
  });

  it("returns the start of the profile id, ids, kinds, steps and the e-mail without the name", () => {
    const plan = planHostReminders(
      anna,
      [listing({ title: "Annas stuga" }), listing({ id: "ffffffff-0000-0000-0000-000000000006", active: true })],
      false,
      [],
      NOW,
    );
    const entry = previewEntry(anna, plan);
    expect(entry.profile).toBe("11111111");
    expect(entry.listing_ids).toEqual([listing().id]);
    expect(entry.kinds).toEqual(["listing_unpublished", "dac7_request"]);
    expect(entry.notices).toEqual([
      { kind: "listing_unpublished", property_id: listing().id, steps: ["publish", "tax"] },
      { kind: "dac7_request", property_id: null, steps: ["tax"] },
    ]);
    expect(entry.subject).toBe("Din annons är redo att publiceras");
    expect(entry.html).toContain(`Hej ${PREVIEW_NAME}!`);
    expect(entry.html).toContain(`${PREVIEW_NAME}s stuga`);
    const shown = JSON.stringify(entry);
    expect(shown).not.toMatch(/anna|svensson|example\.com/i);
    expect(shown).not.toContain(anna.id);
  });

  it("greets without a placeholder when the host has no name to show", () => {
    const nameless = host({ full_name: "anna@example.com" });
    const entry = previewEntry(nameless, planHostReminders(nameless, [listing()], true, [], NOW));
    expect(entry.html).toContain("<p>Hej!</p>");
    expect(JSON.stringify(entry)).not.toContain("anna@example.com");
  });
});
