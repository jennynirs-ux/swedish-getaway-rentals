import { usePageMeta } from "@/hooks/usePageMeta";
import LegalPage from "@/components/LegalPage";
import { COMPANY, COMPANY_ADDRESS } from "@/content/company";

// Keep in line with what the site actually collects and who it shares it
// with (booking, shop, contact form, accounts, guestbook, providers below).
const DATA = [
  {
    when: "You book a stay",
    data: "Name, email, phone (optional), dates, number of guests, messages to the host and your confirmation of the house rules. Card details go straight to Stripe; we never see your full card number.",
    why: "To handle the booking and payment and send your confirmation, arrival information and reminders. Basis: contract, and the Bookkeeping Act for payment records.",
    kept: "Seven years, as the Swedish Bookkeeping Act requires for booking and payment records.",
  },
  {
    when: "You order from the shop",
    data: "Name, email, phone (if given), delivery address and what you ordered.",
    why: "To make, deliver and support your order. Printful prints and ships it. Basis: contract, and the Bookkeeping Act.",
    kept: "Seven years (Bookkeeping Act).",
  },
  {
    when: "You contact us",
    data: "Name, email, phone (optional) and your message.",
    why: "To answer you. Basis: legitimate interest.",
    kept: "As long as needed to answer and follow up.",
  },
  {
    when: "You create an account",
    data: "Email, password (stored encrypted) and any name, phone or profile details you add. Hosts also give business details and a Stripe payout account.",
    why: "To let you sign in and see your bookings; for hosts, to manage listings and payouts. Basis: contract.",
    kept: "Until you ask us to delete the account. Records we must keep for accounting stay for seven years.",
  },
  {
    when: "You write in a guestbook",
    data: "Name, email, message, photo and rating. Name, message, photo and rating are shown publicly once approved; your email never is.",
    why: "To share guests' experiences. Basis: consent, which you can withdraw at any time.",
    kept: "Until you ask us to remove it.",
  },
  {
    when: "You pay or sign in",
    data: "IP address and browser details when a payment is completed and for some account actions.",
    why: "To prevent fraud and misuse. Basis: legitimate interest.",
    kept: "Only as long as needed for that purpose.",
  },
  {
    when: "You open a booking email",
    data: "Whether the email has been opened (a small image in the email).",
    why: "To know that important arrival information has reached you. Basis: legitimate interest. Turning off images in your email app stops it.",
    kept: "With the booking.",
  },
];

const PROVIDERS = [
  ["Supabase", "database, sign-in and file storage, on servers in Stockholm, Sweden"],
  ["Cloudflare", "hosting and delivering the website"],
  ["Stripe", "card payments and refunds, and payouts to hosts"],
  ["Resend", "sending emails"],
  ["Printful", "printing and delivering shop orders"],
  ["OpenStreetMap", "map images and the place search; your browser sends them your IP address and any place you search for"],
];

const PrivacyPolicy = () => {
  usePageMeta({
    title: "Privacy policy",
    description: `How Nordic Getaways (${COMPANY.name}) handles personal data when you book a stay, shop or contact us, and what rights you have.`,
    path: "/privacy",
  });

  return (
    <LegalPage
      title="Privacy policy"
      lead="What personal data Nordic Getaways collects, why, who we share it with and what rights you have."
    >
      <section>
        <h2>Who is responsible</h2>
        <p>
          Nordic Getaways (nordic-getaways.com) is run by {COMPANY.name}, org. no. {COMPANY.orgNumber}, {COMPANY_ADDRESS}.{" "}
          {COMPANY.name} is the controller of the personal data described here. Questions go to{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
      </section>

      <section>
        <h2>What we collect and why</h2>
        <div className="space-y-4">
          {DATA.map((d) => (
            <div key={d.when} className="rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-2">{d.when}</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
                <dt className="font-medium text-foreground">What</dt>
                <dd className="text-muted-foreground">{d.data}</dd>
                <dt className="font-medium text-foreground">Why</dt>
                <dd className="text-muted-foreground">{d.why}</dd>
                <dt className="font-medium text-foreground">How long</dt>
                <dd className="text-muted-foreground">{d.kept}</dd>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Who we share it with</h2>
        <p className="mb-3">
          We never sell personal data. These providers help us run the service and only handle data on our behalf:
        </p>
        <ul>
          {PROVIDERS.map(([name, role]) => (
            <li key={name}>
              <span className="font-medium text-foreground">{name}</span> – {role}
            </li>
          ))}
        </ul>
        <p className="mt-3">
          The host of the property you book receives your name, contact details and booking details. Our calendar
          sync with Airbnb, Booking.com, Vrbo and Landfolk only shares which dates are booked, never names.
        </p>
      </section>

      <section>
        <h2>Transfers outside the EU</h2>
        <p>
          Some providers, such as Cloudflare, Stripe, Resend and Printful, may handle data outside the EU/EEA, mainly
          in the US. They do so under safeguards approved by the EU, such as the EU–US Data Privacy Framework or the
          EU standard contractual clauses.
        </p>
      </section>

      <section>
        <h2>Cookies and storage</h2>
        <p>
          We use no advertising or analytics cookies and no tracking scripts. Your browser stores what the site needs
          to work: your shopping cart, your session if you sign in, and whether you have closed a notice. Cloudflare
          may set a cookie that protects the site against bots. These are needed for the site to work, so they do not
          require consent.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          You can ask for a copy of your data, have it corrected or deleted, restrict or object to how we use it, and
          get the data you gave us in a format you can take elsewhere. Where we rely on consent you can withdraw it at
          any time. Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> and we will answer within a month.
        </p>
        <p className="mt-3">
          If you think we handle your data wrongly, you can complain to the Swedish Authority for Privacy Protection
          (IMY) at <a href="https://www.imy.se" target="_blank" rel="noopener noreferrer">imy.se</a>.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>When this policy changes, we update the date at the top of the page.</p>
      </section>
    </LegalPage>
  );
};

export default PrivacyPolicy;
