import { Link } from "@/i18n/router";
import { usePageMeta } from "@/hooks/usePageMeta";
import LegalPage from "@/components/LegalPage";
import { type Copy, useCopy } from "@/i18n";
import { COMPANY, COMPANY_ADDRESS, TERMS_UPDATED } from "@/content/company";
import { ADULT_AGE } from "@/lib/stayRules";
import { FOUNDING_HOST_FEE_PCT, PLATFORM_SERVICE_FEE_RATE } from "@/lib/constants";
import { CANCELLATION_POLICIES, POLICY_KEYS } from "../../supabase/functions/_shared/cancellation";

// The four policies hosts choose from, as the refunds follow them
// (supabase/functions/_shared/cancellation.ts). Refunds are shares of the stay
// price (bookings.host_amount): the service fee is kept when the guest
// cancels, and refunded when the host or we cancel.
const POLICIES = POLICY_KEYS.map((key) => CANCELLATION_POLICIES[key]);
// Stay price in the cancellation example (SEK)
const EXAMPLE_STAY = 10000;
const sek = (amount: number) => `${amount.toLocaleString("en-GB")} SEK`;

// The page's heading and chrome. The terms themselves are in English only for
// now, and the English version is the binding one (LegalPage marks the body
// as English and shows the notice)
const en = {
  title: "Booking terms",
  description: "Booking terms for Nordic Getaways: payment, house rules, cancellation and refunds, and shop orders.",
  lead: "These terms apply when you book a stay or buy from the shop on nordic-getaways.com.",
  notice: null as string | null,
};
const COPY: Copy<typeof en> = {
  en,
  sv: {
    title: "Bokningsvillkor",
    description:
      "Bokningsvillkor för Nordic Getaways: betalning, husregler, avbokning och återbetalning samt beställningar i butiken.",
    lead: "Villkoren gäller när du bokar en vistelse eller handlar i butiken på nordic-getaways.com.",
    notice: "Villkoren finns än så länge bara på engelska. Den engelska versionen gäller.",
  },
  de: {
    title: "Buchungsbedingungen",
    description:
      "Buchungsbedingungen von Nordic Getaways: Zahlung, Hausregeln, Stornierung und Rückerstattung sowie Bestellungen im Shop.",
    lead: "Diese Bedingungen gelten, wenn du auf nordic-getaways.com einen Aufenthalt buchst oder im Shop einkaufst.",
    notice: "Die Bedingungen gibt es vorerst nur auf Englisch. Es gilt die englische Fassung.",
  },
};

const Terms = () => {
  const t = useCopy(COPY);
  usePageMeta({
    title: t.title,
    description: t.description,
    path: "/terms",
  });

  const fee = Math.round(PLATFORM_SERVICE_FEE_RATE * 100);
  const exampleFee = (EXAMPLE_STAY * fee) / 100;

  return (
    <LegalPage title={t.title} lead={t.lead} updated={TERMS_UPDATED} notice={t.notice}>
      <section>
        <h2>Who we are</h2>
        <p>
          Nordic Getaways is run by {COMPANY.name}, org. no. {COMPANY.orgNumber}, {COMPANY_ADDRESS},{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
        <p className="mt-3">
          Each stay is provided by the cabin's host. Hosts on Nordic Getaways rent out their own place as private
          persons, not as businesses, so EU consumer protection rules do not apply to the agreement between you and
          the host. {COMPANY.name} takes the booking and the payment on the host's behalf and handles cancellations
          and refunds as these terms describe.
        </p>
      </section>

      <section>
        <h2>Booking and payment</h2>
        <ul>
          <li>Your booking is confirmed when the payment has gone through and you receive our confirmation email.</li>
          <li>You pay the full amount when you book, by card through Stripe. Prices are in Swedish kronor (SEK).</li>
          <li>
            The total shown before you pay is the full price: the nightly price, any extra-guest and cleaning fees,
            any extras you add, and a service fee of up to {fee}% ({FOUNDING_HOST_FEE_PCT}% on listings from founding
            hosts in their first year). A weekly or monthly discount is taken off the nightly price.
          </li>
          <li>
            The service fee is our fee for the booking service. Everything else you pay is the price of the stay, which
            goes to the host.
          </li>
          <li>
            What is included in the price, for example bed linen and towels, is listed in the booking form. Other things
            are included only when the listing says so.
          </li>
        </ul>
      </section>

      <section>
        <h2>House rules</h2>
        <ul>
          <li>
            Each place has its host's house rules, shown in the booking form before you pay: the minimum stay (which may
            be longer over Valborg, Midsummer Eve and New Year's Eve), whether pets, smoking, and parties or events are
            allowed, and the minimum age of the person booking. You accept them when you book.
          </li>
          <li>
            The person booking must be at least {ADULT_AGE}, or the higher age the place asks for, and stay at the
            property.
          </li>
          <li>No more guests than booked, and never more than the property sleeps.</li>
          <li>Check-in and check-out times are on each cabin's page and in your booking confirmation.</li>
          <li>The rules on each property's page also apply.</li>
          <li>
            If the rules are seriously broken, for example a party or more guests than booked, the host may end the
            stay without a refund.
          </li>
        </ul>
      </section>

      <section>
        <h2>If you cancel</h2>
        <p className="mb-3">
          Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> or reply to your booking confirmation. Each place
          has one of four cancellation policies, chosen by its host and shown in the booking form. The policy shown when
          you booked applies to your booking, and it is in your confirmation. What you get back depends on how many days
          before arrival your cancellation reaches us (Swedish time), and is a share of the price of the stay. The
          service fee is not refunded when you cancel.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium text-foreground">Policy</th>
                <th className="p-3 font-medium text-foreground">Refund of the price of the stay</th>
              </tr>
            </thead>
            <tbody>
              {POLICIES.map((policy) => (
                <tr key={policy.key} className="border-t border-border align-top">
                  <td className="p-3 font-medium text-foreground">{policy.name}</td>
                  <td className="p-3 text-muted-foreground">
                    {policy.tiers.map((tier) => (
                      <div key={tier.label}>
                        {tier.label}: {tier.refund_percentage > 0 ? `${tier.refund_percentage}%` : "no refund"}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          Example, Standard policy: the stay costs {sek(EXAMPLE_STAY)} and the service fee is {sek(exampleFee)}, so you
          paid {sek(EXAMPLE_STAY + exampleFee)}. If you cancel 30 days before arrival, you get {sek(EXAMPLE_STAY * 0.9)}{" "}
          back.
        </p>
        <p className="mt-3">
          The refund goes back to the card you paid with. A stay is booked for specific dates, so the 14-day right of
          withdrawal for distance purchases does not apply to stays.
        </p>
      </section>

      <section>
        <h2>If the host or we cancel</h2>
        <p>
          If the host or we cancel your booking, or the property cannot be used (for example after damage or a power
          or water failure), we tell you as soon as possible and refund everything you paid, including the service
          fee. The same applies if your dates turn out to be already taken when your payment comes through.
        </p>
      </section>

      <section>
        <h2>During your stay</h2>
        <ul>
          <li>Treat the property and its equipment with care and leave it as you found it.</li>
          <li>
            Tell the host straight away (and us at <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> if you
            can't reach them) if something breaks or stops working.
          </li>
          <li>
            You are responsible for damage caused by you or your group beyond normal wear, and may be asked to pay for
            repairs or extra cleaning.
          </li>
          <li>
            If the cabin has boats or paddle boards, wear a life jacket on the water; children must always be
            supervised near the water.
          </li>
        </ul>
      </section>

      <section>
        <h2>Shop orders</h2>
        <ul>
          <li>
            Products in <Link to="/shop">The Nordic Collection</Link> are printed to order by our partner Printful and
            sent from their production centres.
          </li>
          <li>
            Shipping depends on the country and is shown in the cart before you pay. Orders outside the EU may be
            charged customs duty and taxes on delivery.
          </li>
          <li>
            You may cancel a shop order within 14 days of receiving it. Email us, return the item at your own cost,
            and we refund the price and the standard shipping within 14 days of getting it back.
          </li>
          <li>
            If an item is faulty or damaged, send us a photo and we will replace or refund it. Your rights under the
            Swedish Consumer Sales Act also apply.
          </li>
        </ul>
      </section>

      <section>
        <h2>Complaints and disputes</h2>
        <p>
          During a stay, tell the host first (and us at <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> if
          you can't reach them); otherwise contact us at <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
          If we cannot agree, you can turn to the National Board for Consumer
          Disputes (ARN) at{" "}
          <a href="https://www.arn.se" target="_blank" rel="noopener noreferrer">arn.se</a>. Swedish law applies.
        </p>
        <p className="mt-3">
          How we handle personal data is described in our <Link to="/privacy">privacy policy</Link>.
        </p>
      </section>
    </LegalPage>
  );
};

export default Terms;
