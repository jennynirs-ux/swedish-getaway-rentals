import { Link } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import LegalPage from "@/components/LegalPage";
import { COMPANY, COMPANY_ADDRESS } from "@/content/company";
import { MIN_LEAD_GUEST_AGE, MIN_NIGHTS, PARTY_NIGHT_MIN_NIGHTS } from "@/lib/stayRules";
import { PLATFORM_SERVICE_FEE_RATE } from "@/lib/constants";

// Keep the refund tiers in line with platform_settings.cancellation_policy
// (supabase/functions/_shared/cancellation.ts), which the refunds use
const REFUNDS = [
  ["More than 21 days before arrival", "90% of the amount paid"],
  ["21–8 days before arrival", "50% of the amount paid"],
  ["7 days or less before arrival", "No refund"],
];

const Terms = () => {
  usePageMeta({
    title: "Booking terms",
    description: "Booking terms for Nordic Getaways: payment, house rules, cancellation and refunds, and shop orders.",
    path: "/terms",
  });

  const fee = Math.round(PLATFORM_SERVICE_FEE_RATE * 100);

  return (
    <LegalPage
      title="Booking terms"
      lead="These terms apply when you book a stay or buy from the shop on nordic-getaways.com."
    >
      <section>
        <h2>Who we are</h2>
        <p>
          Nordic Getaways is run by {COMPANY.name}, org. no. {COMPANY.orgNumber}, {COMPANY_ADDRESS},{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. {COMPANY.name} takes your booking and payment; the
          stay itself is provided by the host of the property.
        </p>
      </section>

      <section>
        <h2>Booking and payment</h2>
        <ul>
          <li>Your booking is confirmed when the payment has gone through and you receive our confirmation email.</li>
          <li>You pay the full amount when you book, by card through Stripe. Prices are in Swedish kronor (SEK).</li>
          <li>
            The total shown before you pay is the full price: the nightly price, any extra-guest and cleaning fees,
            and a {fee}% service fee. A weekly or monthly discount is taken off the nightly price.
          </li>
          <li>Bed linen and towels for every guest are included.</li>
        </ul>
      </section>

      <section>
        <h2>House rules</h2>
        <ul>
          <li>
            The minimum stay is {MIN_NIGHTS} nights, and {PARTY_NIGHT_MIN_NIGHTS} nights over Valborg (30 April),
            Midsummer Eve and New Year's Eve.
          </li>
          <li>The person booking must be at least {MIN_LEAD_GUEST_AGE} and stay at the property.</li>
          <li>No more guests than booked, and never more than the property sleeps.</li>
          <li>No parties or events, and no pets.</li>
          <li>Check-in is from 16:00 and check-out by 11:00.</li>
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
          Email <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> or reply to your booking confirmation. You get
          back:
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3 font-medium text-foreground">When you cancel</th>
                <th className="p-3 font-medium text-foreground">Refund</th>
              </tr>
            </thead>
            <tbody>
              {REFUNDS.map(([when, refund]) => (
                <tr key={when} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{when}</td>
                  <td className="p-3 text-muted-foreground">{refund}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          The refund goes back to the card you paid with. A stay is booked for specific dates, so the 14-day right of
          withdrawal for distance purchases does not apply to stays.
        </p>
      </section>

      <section>
        <h2>If we have to cancel</h2>
        <p>
          If the property cannot be used, for example after damage or a power or water failure, we tell you as soon
          as possible and refund everything you paid.
        </p>
      </section>

      <section>
        <h2>During your stay</h2>
        <ul>
          <li>Treat the property and its equipment with care and leave it as you found it.</li>
          <li>Tell us straight away if something breaks or stops working, so we can fix it.</li>
          <li>
            You are responsible for damage caused by you or your group beyond normal wear, and may be asked to pay for
            repairs or extra cleaning.
          </li>
          <li>Boats and paddle boards come with life jackets. Children must always be supervised near the water.</li>
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
          Contact us first at <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>; during a stay, as soon as
          possible so we can put it right. If we cannot agree, you can turn to the National Board for Consumer
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
