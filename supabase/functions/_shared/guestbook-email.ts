import { escapeHtml } from "./auth.ts";
import { longDate } from "./format.ts";
import type { GuestLang } from "./guest-lang.ts";

// The guestbook invitation send-guestbook-invitations sends after check-out,
// in the language the guest booked in (bookings.guest_lang). Pure, so vitest
// can check it (src/lib/guestbookEmail.test.ts). The guest's name and the
// listing's title go in as they always have (not escaped). English is the
// e-mail as it always was, to the character.

export const GUESTBOOK_COPY: Record<GuestLang, {
  subject: (title: string) => string;
  /** The stay's dates in the text */
  date: (isoDate: string) => string;
  heading: string;
  dear: (name: string) => string;
  /** title comes in its <strong> */
  hope: (title: string, checkIn: string, checkOut: string) => string;
  shareTitle: string;
  shareText: string;
  button: string;
  inspire: string;
  valid: string;
  welcomeBack: string;
  regards: string;
  team: string;
  tagline: string;
  automated: string;
}> = {
  en: {
    subject: (title) => `🌿 Share Your Experience at ${title}`,
    // The server's default locale, as the e-mail always had it
    date: (isoDate) => new Date(isoDate).toLocaleDateString(),
    heading: "🌿 Thank You for Staying With Us!",
    dear: (name) => `Dear ${name},`,
    hope: (title, checkIn, checkOut) =>
      `We hope you had a wonderful and relaxing stay at ${title}. It was our pleasure to host you from ${checkIn} to ${checkOut}.`,
    shareTitle: "Share Your Experience 🌟",
    shareText:
      "We would love to hear about your stay! Leave a note in our guestbook and share your favorite moments, photos, or memories from your time with us.",
    button: "Write in Our Guestbook 🌿",
    inspire:
      "Your words inspire future guests and help us continue creating memorable experiences. Whether you share a photo, a star rating, or simply a few kind words, we treasure every message.",
    valid: "This invitation is valid for 30 days and is specifically for your recent stay.",
    welcomeBack: "We hope to welcome you back soon!",
    regards: "With warm regards,",
    team: "The Nordic Getaways Team",
    tagline: "Nordic Getaways - Escape to Nature",
    automated: "This is an automated message. Please do not reply to this email.",
  },
  sv: {
    subject: (title) => `🌿 Berätta om din vistelse på ${title}`,
    date: (isoDate) => longDate(isoDate, "sv"),
    heading: "🌿 Tack för att du bodde hos oss!",
    dear: (name) => `Hej ${name},`,
    hope: (title, checkIn, checkOut) =>
      `Vi hoppas att du hade en härlig och avkopplande vistelse på ${title}. Det var roligt att ha dig som gäst från ${checkIn} till ${checkOut}.`,
    shareTitle: "Berätta om din vistelse 🌟",
    shareText:
      "Vi vill gärna höra hur du hade det! Skriv en hälsning i vår gästbok och dela dina finaste stunder, bilder eller minnen från tiden hos oss.",
    button: "Skriv i vår gästbok 🌿",
    inspire:
      "Dina ord inspirerar framtida gäster och hjälper oss att fortsätta skapa minnesvärda upplevelser. Oavsett om du delar en bild, ger några stjärnor eller bara skriver några vänliga ord blir vi glada för varje hälsning.",
    valid: "Inbjudan gäller i 30 dagar och bara för din senaste vistelse.",
    welcomeBack: "Vi hoppas att få välkomna dig tillbaka snart!",
    regards: "Varma hälsningar,",
    team: "Nordic Getaways-teamet",
    tagline: "Nordic Getaways – Ut i naturen",
    automated: "Det här är ett automatiskt meddelande. Svara inte på det här mejlet.",
  },
  de: {
    subject: (title) => `🌿 Erzähl uns von deinem Aufenthalt – ${title}`,
    date: (isoDate) => longDate(isoDate, "de"),
    heading: "🌿 Danke, dass du bei uns warst!",
    dear: (name) => `Hallo ${name},`,
    hope: (title, checkIn, checkOut) =>
      `Wir hoffen, du hattest einen wunderbaren und erholsamen Aufenthalt in ${title}. Es war uns eine Freude, dich vom ${checkIn} bis ${checkOut} bei uns zu haben.`,
    shareTitle: "Erzähl uns von deinem Aufenthalt 🌟",
    shareText:
      "Wir würden gern hören, wie es dir gefallen hat! Hinterlass einen Eintrag in unserem Gästebuch und teile deine schönsten Momente, Fotos oder Erinnerungen an deine Zeit bei uns.",
    button: "In unser Gästebuch schreiben 🌿",
    inspire:
      "Deine Worte inspirieren künftige Gäste und helfen uns, weiterhin unvergessliche Erlebnisse zu schaffen. Ob du ein Foto, eine Sternebewertung oder einfach ein paar nette Worte teilst – wir freuen uns über jede Nachricht.",
    valid: "Diese Einladung ist 30 Tage gültig und nur für deinen letzten Aufenthalt gedacht.",
    welcomeBack: "Wir hoffen, dich bald wieder bei uns begrüßen zu dürfen!",
    regards: "Herzliche Grüße",
    team: "Dein Nordic Getaways-Team",
    tagline: "Nordic Getaways – Raus in die Natur",
    automated: "Dies ist eine automatisch versendete Nachricht. Bitte antworte nicht auf diese E-Mail.",
  },
};

export interface GuestbookInvitation {
  lang: GuestLang;
  guestName: string;
  /** The listing's title as the guest reads it (guest-lang.ts guestTexts) */
  propertyTitle: string;
  /** "YYYY-MM-DD" */
  checkIn: string;
  checkOut: string;
  /** The guestbook page in the guest's language, with the invitation's token */
  url: string;
}

export function guestbookInvitationEmail(e: GuestbookInvitation): { subject: string; html: string } {
  const t = GUESTBOOK_COPY[e.lang] ?? GUESTBOOK_COPY.en;
  const htmlTag = e.lang === "sv" || e.lang === "de" ? `<html lang="${e.lang}">` : "<html>";
  // The template's whitespace is the e-mail's as it always was
  const html = `
          <!DOCTYPE html>
          ${htmlTag}
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #2c3e50; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #7c9885 0%, #556b2f 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e1e8e1; border-top: none; }
                .button { display: inline-block; background: #7c9885; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
                .button:hover { background: #6a8573; }
                .footer { text-align: center; padding: 20px; color: #7f8c8d; font-size: 14px; }
                .highlight { background: #f0f4f0; padding: 20px; border-left: 4px solid #7c9885; margin: 20px 0; border-radius: 4px; }
                h1 { margin: 0; font-size: 28px; font-weight: 600; }
                p { margin: 16px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>${t.heading}</h1>
                </div>
                <div class="content">
                  <p>${t.dear(escapeHtml(e.guestName))}</p>
                  
                  <p>${t.hope(`<strong>${escapeHtml(e.propertyTitle)}</strong>`, t.date(e.checkIn), t.date(e.checkOut))}</p>
                  
                  <div class="highlight">
                    <p><strong>${t.shareTitle}</strong></p>
                    <p>${t.shareText}</p>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${escapeHtml(e.url)}" class="button">${t.button}</a>
                  </p>
                  
                  <p>${t.inspire}</p>
                  
                  <p>${t.valid}</p>
                  
                  <p>${t.welcomeBack}</p>
                  
                  <p>${t.regards}<br>
                  <strong>${t.team}</strong></p>
                </div>
                <div class="footer">
                  <p>${t.tagline}</p>
                  <p style="font-size: 12px; color: #95a5a6;">${t.automated}</p>
                </div>
              </div>
            </body>
          </html>
        `;
  return { subject: t.subject(e.propertyTitle), html };
}
