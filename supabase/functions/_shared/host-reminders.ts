import { escapeHtml } from "./auth.ts";
import { HOST_TERMS_VERSION } from "./host-terms.ts";

// What send-host-reminders tells hosts (owner decision 31 Oct 2026): what is
// still missing before an unpublished listing can go live, and the DAC7
// request for tax details with its two reminders (lag 2022:1681: ask, remind
// twice, and after 60 days close the account or withhold payouts). Pure, so
// vitest can check the rules and the e-mail (src/lib/hostReminders.test.ts);
// the edge function reads the rows, sends with alert.ts sendEmail and records
// each notice in host_notices. Every value from the database is escaped.

const SITE = "https://nordic-getaways.com";
// Same address as alert.ts SUPPORT_EMAIL; alert.ts itself can't be imported in
// unit tests (it loads npm:resend)
const SUPPORT = "support@mojjo.se";
const DAY_MS = 24 * 60 * 60 * 1000;

/** A listing is reminded about once it has been unpublished this long */
export const LISTING_MIN_AGE_DAYS = 2;
export const LISTING_REMINDER_GAP_DAYS = 7;
export const LISTING_MAX_REMINDERS = 3;
/**
 * Only listings created this recently are reminded about (the 3 reminders fit
 * well inside): listings from before first_published_at existed may have
 * been live and unpublished on purpose, by the host or an admin
 */
export const LISTING_MAX_AGE_DAYS = 30;
/** Fewer gallery photos than this gets the 'photos' tip (the home page's "complete" listing has as many) */
export const MIN_GALLERY_IMAGES = 5;
export const DAC7_REMINDER_GAP_DAYS = 14;
export const DAC7_MAX_REMINDERS = 2;
/** After the request, two reminders and this many days, a person decides (close the account or keep withholding) */
export const DAC7_DEADLINE_DAYS = 60;
/** Shown instead of the host's name in a dry run */
export const PREVIEW_NAME = "[namn]";

/** Needed to publish, in the publish window's order; 'publish' when nothing is missing */
export type RequiredStep = "location" | "terms" | "payouts" | "calendar" | "publish";
/** Not needed to publish; 'tax' is needed before the first payout */
export type RecommendedStep = "photos" | "description" | "tax";
export type StepId = RequiredStep | RecommendedStep;
export type Dac7Kind = "dac7_request" | "dac7_reminder";
export type NoticeKind = "listing_unpublished" | Dac7Kind | "payout_held_tax";

export interface ReminderHost {
  id: string;
  email?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  host_business_name?: string | null;
  stripe_connect_ready?: boolean | null;
  host_terms_accepted_at?: string | null;
  host_terms_version?: string | null;
}

export interface ReminderListing {
  id: string;
  host_id: string | null;
  title: string | null;
  active: boolean | null;
  latitude: number | null;
  longitude: number | null;
  county: string | null;
  gallery_images: string[] | null;
  description: string | null;
  created_at: string;
  /** Set the first time the listing went live (prevent_self_publish): never reminded about after that */
  first_published_at?: string | null;
  /**
   * The listing has a calendar feed (ical_feeds; set by send-host-reminders).
   * The publish window's other answer, "Jag hyr bara ut här", is kept only in
   * the host's browser, so without a feed the e-mail asks the question.
   */
  has_calendar_feed?: boolean;
}

export interface HostNotice {
  kind: NoticeKind | string;
  property_id: string | null;
  sent_at: string;
}

export interface ListingReminder {
  propertyId: string;
  title: string;
  required: RequiredStep[];
  recommended: RecommendedStep[];
}

export interface HostReminderPlan {
  listings: ListingReminder[];
  /** The DAC7 notice due this run, if any */
  dac7: Dac7Kind | null;
  /** Request and both reminders sent, 60 days gone, details still missing: support decides */
  dac7Overdue: boolean;
  /** The host's tax details are incomplete (the e-mail's tax section, when it has anything else to say) */
  taxMissing: boolean;
  /** The host has a published listing (the DAC7 request applies) */
  hasPublished: boolean;
  /** The DAC7 request went out before: the reminders follow even after the host unpublished */
  dac7Asked: boolean;
}

/** A host_notices row to write once the e-mail went out (details: the step ids it named) */
export interface NoticeRow {
  profile_id: string;
  kind: NoticeKind;
  property_id: string | null;
  details: StepId[];
}

const msOf = (iso: string) => Date.parse(iso) || 0;
const daysAgo = (now: Date, days: number) => now.getTime() - days * DAY_MS;

/** Accepted the terms on /host-terms as they are now (what the publish window checks) */
export const acceptedCurrentTerms = (host: ReminderHost) =>
  !!host.host_terms_accepted_at && host.host_terms_version === HOST_TERMS_VERSION;

/** A name to greet the host by, never an e-mail address (full_name sometimes holds one) */
export const hostDisplayName = (host: ReminderHost): string | null =>
  [host.display_name, host.full_name, host.host_business_name]
    .map((name) => name?.trim())
    .find((name) => name && !name.includes("@")) ?? null;

/** The description as text: the editor may leave empty markup behind */
const hasDescription = (description: string | null) =>
  !!description && description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "";

/** What one unpublished listing still needs, and what would make it better */
export function listingSteps(
  listing: ReminderListing,
  host: ReminderHost,
  dac7Complete: boolean,
): { required: RequiredStep[]; recommended: RecommendedStep[] } {
  const required: RequiredStep[] = [];
  if (listing.latitude == null || listing.longitude == null || !listing.county) required.push("location");
  if (!acceptedCurrentTerms(host)) required.push("terms");
  if (!host.stripe_connect_ready) required.push("payouts");
  if (!listing.has_calendar_feed) required.push("calendar");
  if (required.length === 0) required.push("publish");
  const recommended: RecommendedStep[] = [];
  if ((listing.gallery_images?.length ?? 0) < MIN_GALLERY_IMAGES) recommended.push("photos");
  if (!hasDescription(listing.description)) recommended.push("description");
  if (!dac7Complete) recommended.push("tax");
  return { required, recommended };
}

/**
 * A listing that has never been published, at least 2 days and at most 30
 * days old, is reminded about at most 3 times, at least 7 days apart. One that
 * was live once and is unpublished now was unpublished on purpose.
 */
export function listingReminderDue(listing: ReminderListing, notices: HostNotice[], now: Date): boolean {
  if (listing.active || listing.first_published_at) return false;
  if (msOf(listing.created_at) > daysAgo(now, LISTING_MIN_AGE_DAYS)) return false;
  if (msOf(listing.created_at) < daysAgo(now, LISTING_MAX_AGE_DAYS)) return false;
  const sent = notices.filter((n) => n.kind === "listing_unpublished" && n.property_id === listing.id);
  if (sent.length >= LISTING_MAX_REMINDERS) return false;
  const last = Math.max(0, ...sent.map((n) => msOf(n.sent_at)));
  return last <= daysAgo(now, LISTING_REMINDER_GAP_DAYS);
}

/**
 * DAC7 for a host with a published listing (or asked before, published or
 * not) and incomplete tax details: the request first, then a reminder at
 * least 14 days after the previous notice, at most two. Once both reminders
 * are out and 60 days have passed since the request, support is told
 * (overdue) instead.
 */
export function dac7Due(notices: HostNotice[], now: Date): { kind: Dac7Kind | null; overdue: boolean } {
  const requests = notices.filter((n) => n.kind === "dac7_request");
  if (requests.length === 0) return { kind: "dac7_request", overdue: false };
  const reminders = notices.filter((n) => n.kind === "dac7_reminder");
  const firstRequest = Math.min(...requests.map((n) => msOf(n.sent_at)));
  if (reminders.length >= DAC7_MAX_REMINDERS) {
    return { kind: null, overdue: firstRequest <= daysAgo(now, DAC7_DEADLINE_DAYS) };
  }
  const last = Math.max(...[...requests, ...reminders].map((n) => msOf(n.sent_at)));
  return { kind: last <= daysAgo(now, DAC7_REMINDER_GAP_DAYS) ? "dac7_reminder" : null, overdue: false };
}

/** Everything due for one approved host this run (listings: all of the host's) */
export function planHostReminders(
  host: ReminderHost,
  listings: ReminderListing[],
  dac7Complete: boolean,
  notices: HostNotice[],
  now: Date,
): HostReminderPlan {
  const own = listings.filter((l) => l.host_id === host.id);
  const due = own
    .filter((l) => listingReminderDue(l, notices, now))
    .sort((a, b) => msOf(a.created_at) - msOf(b.created_at) || a.id.localeCompare(b.id))
    .map((l) => ({ propertyId: l.id, title: l.title?.trim() || "", ...listingSteps(l, host, dac7Complete) }));
  const hasPublished = own.some((l) => l.active);
  // Once asked, the reminders and the 60-day escalation go on even if the host unpublishes
  const dac7Asked = notices.some((n) => n.kind === "dac7_request");
  const dac7 = !dac7Complete && (hasPublished || dac7Asked) ? dac7Due(notices, now) : { kind: null, overdue: false };
  return { listings: due, dac7: dac7.kind, dac7Overdue: dac7.overdue, taxMissing: !dac7Complete, hasPublished, dac7Asked };
}

/** Whether the plan has anything to e-mail */
export const hasReminder = (plan: HostReminderPlan) => plan.listings.length > 0 || plan.dac7 !== null;

/** The host_notices rows for an e-mail that went out */
export function noticeRows(profileId: string, plan: HostReminderPlan): NoticeRow[] {
  const rows: NoticeRow[] = plan.listings.map((l) => ({
    profile_id: profileId,
    kind: "listing_unpublished",
    property_id: l.propertyId,
    details: [...l.required, ...l.recommended],
  }));
  if (plan.dac7) rows.push({ profile_id: profileId, kind: plan.dac7, property_id: null, details: ["tax"] });
  return rows;
}

// ---------------------------------------------------------------------------
// The e-mail (Swedish, like the host panel)

const STEP_TEXT: Record<Exclude<StepId, "publish" | "tax">, string> = {
  location: "Sätt ut boendet på kartan och välj län.",
  terms: "Godkänn värdvillkoren.",
  payouts: "Gör klart utbetalningarna via Stripe, så att din del av varje bokning kan betalas ut till din bank.",
  // The publish window's "Andra bokningssajter" step
  calendar:
    "Berätta om boendet också finns på andra bokningssajter, som Airbnb: koppla då ihop kalendrarna, annars väljer du ”Jag hyr bara ut här”.",
  // "fem": MIN_GALLERY_IMAGES
  photos: "Lägg till minst fem bilder, så att gästerna ser hur det ser ut.",
  description: "Skriv några rader om boendet.",
};

export const publishUrl = (propertyId: string) => `${SITE}/host-dashboard?publish=${encodeURIComponent(propertyId)}`;
export const TAX_URL = `${SITE}/host-dashboard?tab=payouts`;

const button = (href: string, text: string) =>
  `<p style="margin: 16px 0 24px;"><a href="${escapeHtml(href)}" style="display: inline-block; background: #2D5F5D; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">${text}</a></p>`;
const list = (items: string[]) =>
  `<ul style="margin: 4px 0 12px; padding-left: 20px;">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
const heading = (text: string) => `<h2 style="font-size: 18px; margin: 28px 0 8px;">${text}</h2>`;

function listingSection(l: ListingReminder): string {
  const parts = [heading(escapeHtml(l.title || "Din annons"))];
  const ready = l.required.includes("publish");
  if (ready) {
    parts.push("<p>Allt som behövs är klart. Tryck på Publicera, så syns annonsen för gästerna.</p>");
  } else {
    parts.push('<p style="margin: 8px 0 4px;">Kvar innan du kan publicera:</p>');
    parts.push(list(l.required.map((step) => STEP_TEXT[step as Exclude<RequiredStep, "publish">])));
  }
  // Tax details belong to the host, not the listing: their own section below
  const tips = l.recommended.filter((step): step is "photos" | "description" => step !== "tax");
  if (tips.length) {
    parts.push('<p style="margin: 8px 0 4px;">Bra att lägga till:</p>');
    parts.push(list(tips.map((step) => STEP_TEXT[step])));
  }
  parts.push(button(publishUrl(l.propertyId), ready ? "Publicera annonsen" : "Gör klart annonsen"));
  return parts.join("\n");
}

function taxSection(plan: HostReminderPlan): string {
  const ask =
    plan.dac7 === "dac7_reminder"
      ? "En påminnelse: vi behöver fortfarande dina skatteuppgifter."
      : plan.dac7 === "dac7_request" || plan.hasPublished
        ? "Nu när du har en publicerad annons behöver vi dina skatteuppgifter."
        : plan.dac7Asked
          ? "Vi behöver fortfarande dina skatteuppgifter."
          : "Du kan publicera utan skatteuppgifter, men fyll gärna i dem när du har en stund.";
  return [
    heading("Skatteuppgifter"),
    `<p>${ask} Lagen (EU:s DAC7-regler) kräver att vi samlar in dem från alla värdar, och vi betalar ut pengar till dig när de är ifyllda.</p>`,
    button(TAX_URL, "Fyll i skatteuppgifter"),
  ].join("\n");
}

export function reminderSubject(plan: HostReminderPlan): string {
  const many = plan.listings.length > 1;
  if (plan.listings.length) {
    return plan.listings.every((l) => l.required.includes("publish"))
      ? many ? "Dina annonser är redo att publiceras" : "Din annons är redo att publiceras"
      : many ? "Några steg kvar innan dina annonser kan publiceras" : "Några steg kvar innan din annons kan publiceras";
  }
  return plan.dac7 === "dac7_reminder" ? "Påminnelse: vi behöver dina skatteuppgifter" : "Vi behöver dina skatteuppgifter";
}

/** The one e-mail for a host this run; name: hostDisplayName (null greets without one) */
export function hostReminderEmail(name: string | null, plan: HostReminderPlan): { subject: string; html: string } {
  const many = plan.listings.length > 1;
  const parts = [`<p>Hej${name ? ` ${escapeHtml(name)}` : ""}!</p>`];
  if (plan.listings.length) {
    const left = plan.listings.some((l) => !l.required.includes("publish")) ? " Här är det som är kvar:" : "";
    parts.push(
      many
        ? `<p>Tack för att du har lagt upp dina boenden hos oss! Annonserna är inte publicerade än, så gästerna kan inte se dem.${left}</p>`
        : `<p>Tack för att du har lagt upp ditt boende hos oss! Annonsen är inte publicerad än, så gästerna kan inte se den.${left}</p>`,
    );
    parts.push(...plan.listings.map(listingSection));
  }
  if (plan.dac7 || (plan.taxMissing && plan.listings.length)) parts.push(taxSection(plan));
  parts.push(
    `<p>Frågor? Svara på det här mejlet eller skriv till ${SUPPORT}.</p>`,
    "<p>Varma hälsningar<br>Jenny &amp; Jon, Nordic Getaways</p>",
  );
  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nordic Getaways</title>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #2c3e50; line-height: 1.6;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px 28px;">
${parts.join("\n")}
</div>
</body>
</html>`;
  return { subject: reminderSubject(plan), html };
}

// ---------------------------------------------------------------------------
// Dry runs: what would be sent, without the host's name or e-mail address

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Replaces the host's names and e-mail address in text with [namn]: each name
 * whole and each word of it (full_name "Anna Svensson" masks "Annas stuga"
 * and "Villa Svensson"), and the e-mail's local part and its pieces
 */
export function maskNames(text: string, host: ReminderHost): string {
  const names = new Set<string>();
  for (const value of [host.display_name, host.full_name, host.host_business_name, host.email]) {
    const whole = value?.trim() ?? "";
    // An e-mail address (full_name sometimes holds one): its local part
    const own = whole.includes("@") ? whole.slice(0, whole.lastIndexOf("@")) : whole;
    for (const name of [whole, own, ...own.split(/[^\p{L}\p{N}]+/u)]) if (name.length >= 2) names.add(name);
  }
  if (!names.size) return text;
  // One pass (a short name never matches inside an inserted [namn]), longest
  // first, so "Anna Svensson" goes before "Anna"
  const pattern = [...names].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return text.replace(new RegExp(pattern, "giu"), PREVIEW_NAME);
}

/** The e-mail as a dry run shows it: [namn] for the host's name, also inside listing titles */
export function previewReminderEmail(host: ReminderHost, plan: HostReminderPlan): { subject: string; html: string } {
  const masked = { ...plan, listings: plan.listings.map((l) => ({ ...l, title: maskNames(l.title, host) })) };
  return hostReminderEmail(hostDisplayName(host) ? PREVIEW_NAME : null, masked);
}

/** A dry run's line for one host: no name, no e-mail address, only the start of the profile id */
export function previewEntry(host: ReminderHost, plan: HostReminderPlan) {
  const notices = noticeRows(host.id, plan).map(({ kind, property_id, details }) => ({ kind, property_id, steps: details }));
  const email = hasReminder(plan) ? previewReminderEmail(host, plan) : null;
  return {
    profile: host.id.slice(0, 8),
    listing_ids: plan.listings.map((l) => l.propertyId),
    kinds: [...new Set(notices.map((n) => n.kind))],
    notices,
    dac7_overdue: plan.dac7Overdue,
    subject: email?.subject ?? null,
    html: email?.html ?? null,
  };
}
