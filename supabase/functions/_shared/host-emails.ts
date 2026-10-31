import { escapeHtml } from "./auth.ts";
import { longDate } from "./format.ts";
import type { GuestLang } from "./guest-lang.ts";
import type { CancelledBy } from "./payout.ts";

// The e-mails a cancellation sends: the guest's (in the language they booked
// in) and (M8) the host's (English). Built as pure functions so vitest can
// check them (src/lib/hostEmails.test.ts, src/lib/guestCancellationEmail.test.ts);
// callers send them with alert.ts sendEmail. Every value from the database or
// the admin is escaped. Amounts are öre.

// Same address as alert.ts SUPPORT_EMAIL; alert.ts itself can't be imported in
// unit tests (it loads npm:resend)
const SUPPORT = "support@mojjo.se";
const SIGNATURE = "<p>Jenny &amp; Jon, Nordic Getaways</p>";

export type { CancelledBy };

/** Where the host's share was before the cancellation */
export type PayoutBefore = "held" | "paid_out" | "manual" | "none";

export interface CancellationFacts {
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  cancelledBy: CancelledBy;
  /** The day the guest (or host) asked to cancel, "YYYY-MM-DD" */
  requestedOn: string;
  daysBeforeArrival: number;
  /** Guest cancels: the policy % of the host's price. Host or we cancel: 100 */
  refundPercentage: number;
  /** What the policy gives the guest back in total (guest cancels: refundPercentage of the host's price) */
  refundTarget: number;
  /** Refunded to the guest in total (an unfinished earlier attempt and earlier refunds included) */
  refundAmount: number;
  /** Of refundAmount, refunded before this cancellation (e.g. a goodwill refund in the Stripe dashboard) */
  refundedEarlier: number;
  /** The guest service fee we keep (guest cancels only) */
  serviceFeeKept: number;
  /** Taken from the host's share in total */
  hostTakenBack: number;
  /**
   * Of hostTakenBack, the part whose money had already been paid out to the
   * host: recorded as a host charge and taken from their next payout
   */
  hostFromNextPayout: number;
  /**
   * Of hostTakenBack, refunds after payout on this booking that were already
   * taken (from a payout, or from its own money returned by a failed payout)
   */
  hostTakenEarlier?: number;
  /**
   * Part of this booking's transfer was used to settle amounts the host owed
   * us (card fees, refunds after payout), which is why some of the reduction
   * can't come from it and is taken from the next payout instead
   */
  shareUsedForCharges?: boolean;
  /** What the host still receives for this booking */
  hostRemaining: number;
  /** The card fee charged to the host (host cancellations only) */
  cardFeeCharge: number;
  payoutBefore: PayoutBefore;
  /** When the host's remaining share is paid out, "YYYY-MM-DD" */
  payoutDueOn: string | null;
  /** Whether the guest paid by card on the site (else nothing is refunded here) */
  hasPayment: boolean;
  currency: string;
}

export interface Email {
  subject: string;
  html: string;
}

/** Refund figures for a guest whose earlier refunds count towards the policy's (values escaped) */
interface EarlierRefund {
  pct: string;
  target: string;
  request: string;
  earlier: string;
  /** Refunded now, or null when nothing more is refunded */
  now: string | null;
  total: string;
}

// The guest's cancellation e-mail in each guest language (bookings.guest_lang).
// Values come in escaped; English is the e-mail as it always was.
export const GUEST_CANCELLATION_COPY: Record<GuestLang, {
  subject: (title: string) => string;
  hi: (name: string) => string;
  /** The stay: "Lakehouse, Sunday 20 December 2026 to Sunday 27 December 2026" */
  stay: (title: string, checkIn: string, checkOut: string) => string;
  /** When the cancellation reached us: "Friday 20 November 2026, 30 days before arrival" */
  request: (date: string, days: number) => string;
  cancelledAsAsked: (stay: string) => string;
  nothingPaid: string;
  refundAfterEarlier: (r: EarlierRefund) => string;
  refunded: (amount: string, pct: string, request: string) => string;
  notRefunded: (request: string) => string;
  serviceFeeKept: (fee: string) => string;
  /** policySummaryText: "Standard: 90% refund more than 21 days before arrival; …" */
  policy: (policySummaryText: string) => string;
  hostCancelled: (stay: string) => string;
  weCancelled: (stay: string) => string;
  refundedAll: (amount: string) => string;
  alreadyRefunded: string;
  rebook: string;
  questions: (email: string) => string;
  /** The listing's name when it has none */
  yourCabin: string;
}> = {
  en: {
    subject: (title) => `Your booking is cancelled – ${title}`,
    hi: (name) => `Hi ${name},`,
    stay: (title, checkIn, checkOut) => `${title}, ${checkIn} to ${checkOut}`,
    request: (date, days) => `${date}, ${days} day${days === 1 ? "" : "s"} before arrival`,
    cancelledAsAsked: (stay) => `Your booking of ${stay} is cancelled, as you asked.`,
    nothingPaid: "Nothing was paid through our website for this booking, so there is nothing to refund here.",
    refundAfterEarlier: (r) =>
      `The booking's cancellation policy gives ${r.pct}% of the accommodation price (${r.target}) for a cancellation received ${r.request}. You had already been refunded ${r.earlier}, so ${
        r.now !== null ? `we have now refunded the remaining ${r.now}` : "nothing more is refunded"
      }. In total you get ${r.total} back.${r.now !== null ? " It usually shows on your card within 5–10 business days." : ""}`,
    refunded: (amount, pct, request) =>
      `We have refunded ${amount}: ${pct}% of the accommodation price, which the booking's cancellation policy gives for a cancellation received ${request}. It usually shows on your card within 5–10 business days.`,
    notRefunded: (request) => `Under the booking's cancellation policy, a cancellation received ${request} is not refunded.`,
    serviceFeeKept: (fee) => `The service fee (${fee}) is not refunded when a guest cancels.`,
    policy: (summary) =>
      `The booking's cancellation policy, ${summary}. Refunds are a share of the accommodation price; the service fee is not refundable.`,
    hostCancelled: (stay) => `We're sorry: the host has had to cancel your booking of ${stay}.`,
    weCancelled: (stay) => `We're sorry: we have had to cancel your booking of ${stay}.`,
    refundedAll: (amount) =>
      `You get back everything you paid, service fee included: we have refunded ${amount}. It usually shows on your card within 5–10 business days.`,
    alreadyRefunded: "Everything you paid has already been refunded.",
    rebook: "If you'd like help finding another cabin or other dates, just reply to this e-mail.",
    questions: (email) => `Questions? Reply to this e-mail or write to ${email}.`,
    yourCabin: "your cabin",
  },
  sv: {
    subject: (title) => `Din bokning är avbokad – ${title}`,
    hi: (name) => `Hej ${name},`,
    stay: (title, checkIn, checkOut) => `${title}, ${checkIn} till ${checkOut}`,
    request: (date, days) => `${date}, ${days} ${days === 1 ? "dag" : "dagar"} före ankomst`,
    cancelledAsAsked: (stay) => `Vi har avbokat din bokning av ${stay}, som du bad om.`,
    nothingPaid: "Ingenting betalades via vår webbplats för den här bokningen, så det finns inget att betala tillbaka här.",
    refundAfterEarlier: (r) =>
      `Bokningens avbokningsregler ger ${r.pct} % av priset för vistelsen (${r.target}) för en avbokning som nådde oss ${r.request}. Du hade redan fått tillbaka ${r.earlier}, så ${
        r.now !== null ? `nu har vi betalat tillbaka de återstående ${r.now}` : "inget mer betalas tillbaka"
      }. Totalt får du tillbaka ${r.total}.${r.now !== null ? " Pengarna syns oftast på ditt kort inom 5–10 bankdagar." : ""}`,
    refunded: (amount, pct, request) =>
      `Vi har betalat tillbaka ${amount}: ${pct} % av priset för vistelsen, vilket bokningens avbokningsregler ger för en avbokning som nådde oss ${request}. Pengarna syns oftast på ditt kort inom 5–10 bankdagar.`,
    notRefunded: (request) =>
      `Enligt bokningens avbokningsregler betalas ingenting tillbaka för en avbokning som nådde oss ${request}.`,
    serviceFeeKept: (fee) => `Serviceavgiften (${fee}) betalas inte tillbaka när en gäst avbokar.`,
    policy: (summary) =>
      `Bokningens avbokningsregler – ${summary}. Återbetalningen är en andel av priset för vistelsen; serviceavgiften betalas inte tillbaka.`,
    hostCancelled: (stay) => `Vi är ledsna, men värden har behövt avboka din bokning av ${stay}.`,
    weCancelled: (stay) => `Vi är ledsna, men vi har behövt avboka din bokning av ${stay}.`,
    refundedAll: (amount) =>
      `Du får tillbaka allt du betalade, även serviceavgiften: vi har betalat tillbaka ${amount}. Pengarna syns oftast på ditt kort inom 5–10 bankdagar.`,
    alreadyRefunded: "Allt du betalade har redan betalats tillbaka.",
    rebook: "Vill du ha hjälp att hitta en annan stuga eller andra datum? Svara bara på det här mejlet.",
    questions: (email) => `Frågor? Svara på det här mejlet eller skriv till ${email}.`,
    yourCabin: "din stuga",
  },
  de: {
    subject: (title) => `Deine Buchung ist storniert – ${title}`,
    hi: (name) => `Hallo ${name},`,
    stay: (title, checkIn, checkOut) => `${title} vom ${checkIn} bis ${checkOut}`,
    request: (date, days) => `am ${date} (${days} ${days === 1 ? "Tag" : "Tage"} vor Anreise)`,
    cancelledAsAsked: (stay) => `Wie gewünscht haben wir deine Buchung für ${stay} storniert.`,
    nothingPaid: "Für diese Buchung wurde nichts über unsere Website bezahlt, daher gibt es hier nichts zu erstatten.",
    refundAfterEarlier: (r) =>
      `Nach den Stornierungsbedingungen der Buchung bekommst du für eine Stornierung, die uns ${r.request} erreicht hat, ${r.pct} % des Preises für den Aufenthalt zurück (${r.target}). Du hattest bereits ${r.earlier} zurückbekommen, ${
        r.now !== null ? `deshalb haben wir dir jetzt die restlichen ${r.now} erstattet` : "deshalb wird nichts weiter erstattet"
      }. Insgesamt bekommst du ${r.total} zurück.${r.now !== null ? " Die Erstattung ist meist innerhalb von 5–10 Werktagen auf deiner Karte zu sehen." : ""}`,
    refunded: (amount, pct, request) =>
      `Wir haben dir ${amount} erstattet: ${pct} % des Preises für den Aufenthalt, die dir nach den Stornierungsbedingungen der Buchung für eine Stornierung zustehen, die uns ${request} erreicht hat. Die Erstattung ist meist innerhalb von 5–10 Werktagen auf deiner Karte zu sehen.`,
    notRefunded: (request) =>
      `Nach den Stornierungsbedingungen der Buchung wird eine Stornierung, die uns ${request} erreicht hat, nicht erstattet.`,
    serviceFeeKept: (fee) => `Die Servicegebühr (${fee}) wird nicht erstattet, wenn ein Gast storniert.`,
    policy: (summary) =>
      `Stornierungsbedingungen der Buchung – ${summary}. Erstattet wird ein Anteil am Preis des Aufenthalts; die Servicegebühr wird nicht erstattet.`,
    hostCancelled: (stay) => `Es tut uns leid: Der Gastgeber musste deine Buchung für ${stay} stornieren.`,
    weCancelled: (stay) => `Es tut uns leid: Wir mussten deine Buchung für ${stay} stornieren.`,
    refundedAll: (amount) =>
      `Du bekommst alles zurück, was du bezahlt hast, auch die Servicegebühr: Wir haben dir ${amount} erstattet. Die Erstattung ist meist innerhalb von 5–10 Werktagen auf deiner Karte zu sehen.`,
    alreadyRefunded: "Alles, was du bezahlt hast, wurde bereits erstattet.",
    rebook:
      "Wenn du Hilfe bei der Suche nach einer anderen Unterkunft oder einem anderen Zeitraum möchtest, antworte einfach auf diese E-Mail.",
    questions: (email) => `Fragen? Antworte auf diese E-Mail oder schreib an ${email}.`,
    yourCabin: "deine Unterkunft",
  },
};

/** 990000 öre -> "9 900 SEK", 16680 -> "166,80 SEK" (Swedish digit grouping) */
export function money(ore: number, currency = "SEK"): string {
  const whole = Math.round(Number(ore) || 0);
  const amount = (whole / 100).toLocaleString("sv-SE", {
    minimumFractionDigits: whole % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${amount} ${(currency || "SEK").toUpperCase()}`;
}

const stay = (f: CancellationFacts) =>
  `${escapeHtml(f.propertyTitle)}, ${escapeHtml(longDate(f.checkIn))} to ${escapeHtml(longDate(f.checkOut))}`;

const amount = (f: CancellationFacts, ore: number) => escapeHtml(money(ore, f.currency));

const requestLine = (f: CancellationFacts) =>
  `${escapeHtml(longDate(f.requestedOn))}, ${escapeHtml(f.daysBeforeArrival)} day${f.daysBeforeArrival === 1 ? "" : "s"} before arrival`;

/**
 * The guest's "your booking is cancelled" e-mail in their language (English
 * by default). policySummaryText: the policy's name and cancellation.ts
 * policySummary in the same language; f.propertyTitle: the listing's title as
 * the guest reads it (guest-lang.ts guestTexts).
 */
export function guestCancellationEmail(f: CancellationFacts, policySummaryText: string, lang: GuestLang = "en"): Email {
  const t = GUEST_CANCELLATION_COPY[lang] ?? GUEST_CANCELLATION_COPY.en;
  const guestStay = t.stay(escapeHtml(f.propertyTitle), escapeHtml(longDate(f.checkIn, lang)), escapeHtml(longDate(f.checkOut, lang)));
  const request = t.request(escapeHtml(longDate(f.requestedOn, lang)), f.daysBeforeArrival);
  const pct = escapeHtml(f.refundPercentage);
  const lines: string[] = [`<p>${t.hi(escapeHtml(f.guestName))}</p>`];

  if (f.cancelledBy === "guest") {
    lines.push(`<p>${t.cancelledAsAsked(guestStay)}</p>`);
    const refundedNow = Math.max(0, f.refundAmount - f.refundedEarlier);
    if (!f.hasPayment) {
      lines.push(`<p>${t.nothingPaid}</p>`);
    } else if (f.refundedEarlier > 0) {
      // The policy refund on its own, then what earlier refunds change
      lines.push(
        `<p>${t.refundAfterEarlier({
          pct,
          target: amount(f, f.refundTarget),
          request,
          earlier: amount(f, f.refundedEarlier),
          now: refundedNow > 0 ? amount(f, refundedNow) : null,
          total: amount(f, f.refundAmount),
        })}</p>`,
      );
    } else if (f.refundAmount > 0) {
      lines.push(`<p>${t.refunded(amount(f, f.refundAmount), pct, request)}</p>`);
    } else {
      lines.push(`<p>${t.notRefunded(request)}</p>`);
    }
    if (f.hasPayment && f.serviceFeeKept > 0) {
      lines.push(`<p>${t.serviceFeeKept(amount(f, f.serviceFeeKept))}</p>`);
    }
    lines.push(`<p>${t.policy(escapeHtml(policySummaryText))}</p>`);
  } else {
    lines.push(`<p>${f.cancelledBy === "host" ? t.hostCancelled(guestStay) : t.weCancelled(guestStay)}</p>`);
    lines.push(
      `<p>${!f.hasPayment ? t.nothingPaid : f.refundAmount > 0 ? t.refundedAll(amount(f, f.refundAmount)) : t.alreadyRefunded}</p>`,
    );
    lines.push(`<p>${t.rebook}</p>`);
  }

  lines.push(`<p>${t.questions(SUPPORT)}</p>`, SIGNATURE);
  return { subject: t.subject(f.propertyTitle), html: lines.join("\n") };
}

/** The host's "a booking was cancelled" e-mail (M8): what the guest gets, what leaves their payout, the dates reopen */
/** taxMissing: the host has no complete tax details, so release-host-payouts holds their payouts until they do */
export function hostCancellationEmail(f: CancellationFacts, hostName: string, taxMissing = false): Email {
  const lines: string[] = [`<p>Hi ${escapeHtml(hostName || "there")},</p>`];

  const by = f.cancelledBy === "guest" ? "by the guest" : f.cancelledBy === "host" ? "at your request" : "by us";
  lines.push(`<p>The booking of ${stay(f)} (guest: ${escapeHtml(f.guestName)}) is cancelled ${by}.</p>`);

  if (!f.hasPayment) {
    lines.push("<p>The guest did not pay through our website, so no money moves for this booking.</p>");
  } else {
    const earlier = f.refundedEarlier > 0
      ? ` The guest had already been refunded ${amount(f, f.refundedEarlier)} earlier; in total they get ${amount(f, f.refundAmount)} back.`
      : "";
    if (f.cancelledBy === "guest") {
      lines.push(
        `<p>The cancellation reached us ${requestLine(f)}. Under the cancellation policy the guest gets ${escapeHtml(f.refundPercentage)}% of your price back: ${amount(f, f.refundTarget)}.${earlier}</p>`,
      );
    } else if (f.cancelledBy === "host") {
      lines.push(
        `<p>When a host cancels, the guest gets everything back (${amount(f, f.refundAmount)} in total), as the host terms say.</p>`,
      );
    } else {
      lines.push(`<p>We had to cancel it, so the guest gets everything back (${amount(f, f.refundAmount)} in total).</p>`);
    }

    // What the refund takes from the host: from this booking's payout while
    // it is still to come, from the next payout for whatever was already paid
    const takenEarlier = f.hostTakenEarlier ?? 0;
    const fromThisPayout = Math.max(0, f.hostTakenBack - f.hostFromNextPayout - takenEarlier);
    if (fromThisPayout > 0) {
      lines.push(
        f.payoutBefore === "manual" || f.payoutBefore === "none"
          ? `<p>Your payout for this booking is reduced by ${amount(f, fromThisPayout)}.</p>`
          : f.payoutBefore === "paid_out"
            ? `<p>${amount(f, fromThisPayout)} was taken from your payout for this booking before it was paid.</p>`
            : `<p>${amount(f, fromThisPayout)} is taken back from your payout for this booking.</p>`,
      );
    }
    if (takenEarlier > 0) {
      lines.push(`<p>${amount(f, takenEarlier)} of it was already deducted earlier, after an earlier refund on this booking.</p>`);
    }
    if (f.hostFromNextPayout > 0) {
      lines.push(
        f.payoutBefore === "paid_out"
          ? f.shareUsedForCharges
            ? `<p>Your share of this booking had already been paid out or used for amounts you owed us, so ${amount(f, f.hostFromNextPayout)} is taken from your next payout instead.</p>`
            : `<p>Your payout for this booking had already been paid to your bank, so ${amount(f, f.hostFromNextPayout)} is taken from your next payout instead.</p>`
          : f.shareUsedForCharges
            ? `<p>Part of this booking had already been paid out or used for amounts you owed us, so ${amount(f, f.hostFromNextPayout)} of it is taken from your next payout instead.</p>`
            : `<p>Part of this booking had already been paid out to you, so ${amount(f, f.hostFromNextPayout)} of it is taken from your next payout instead.</p>`,
      );
    }

    if (f.hostRemaining > 0) {
      const when =
        f.payoutBefore === "held" && f.payoutDueOn
          ? taxMissing
            ? `, paid out to your bank once your tax details are in (at the earliest on ${escapeHtml(longDate(f.payoutDueOn))}; add them under Payouts &amp; tax in your host dashboard)`
            : `, paid out to your bank on ${escapeHtml(longDate(f.payoutDueOn))}`
          : f.payoutBefore === "manual"
            ? taxMissing
              ? "; we pay it to you by hand once your tax details are in, since your Stripe account could not receive it"
              : "; we pay it to you by hand, since your Stripe account could not receive it"
            : "";
      lines.push(`<p>You keep ${amount(f, f.hostRemaining)} for this booking${when}.</p>`);
    } else if (f.payoutBefore !== "none") {
      lines.push("<p>You receive nothing for this booking.</p>");
    }

    if (f.cardFeeCharge > 0) {
      lines.push(
        `<p>The card fee for the guest's payment, ${amount(f, f.cardFeeCharge)}, is charged to you and deducted from your next payout.</p>`,
      );
    } else if (f.cancelledBy === "platform") {
      lines.push("<p>We pay the card fee; nothing is charged to you.</p>");
    }
  }

  lines.push(
    "<p>The dates are open again: on Nordic Getaways right away, and in the calendar link your other channels (Airbnb, Booking.com…) read at their next sync.</p>",
    `<p>Questions? Reply to this e-mail or write to ${SUPPORT}.</p>`,
    SIGNATURE,
  );
  return {
    subject: `Booking cancelled – ${f.propertyTitle}, ${f.checkIn.slice(0, 10)} to ${f.checkOut.slice(0, 10)}`,
    html: lines.join("\n"),
  };
}
