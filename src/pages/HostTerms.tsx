import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import LegalPage from "@/components/LegalPage";
import { COMPANY, COMPANY_ADDRESS } from "@/content/company";
import { HOST_TERMS_PATH, HOST_TERMS_UPDATED, HOST_TERMS_VERSION } from "@/content/hostTerms";
import { ADULT_AGE } from "@/lib/stayRules";
import { CANCELLATION_POLICIES, POLICY_KEYS } from "../../supabase/functions/_shared/cancellation";
import { FOUNDING_HOST_DEADLINE, FOUNDING_HOST_FEE_PCT, PLATFORM_SERVICE_FEE_RATE } from "@/lib/constants";

// Owner decisions of 21 Oct 2026 (see supabase/migrations/20261021220000_host_payout_after_checkin.sql):
// the host's share stays in the host's own Stripe account and our payout job
// pays it out the day after check-in, or 85 days after the guest paid if that
// comes first (payoutDueOn); a refund after the payout is taken from the
// host's next payout; the service fee is kept when a guest cancels; a host who
// cancels gets nothing for the booking and pays the card fee; every host rents
// out privately. Keep this page, the guest terms (/terms) and the cancel and
// payout functions saying the same. Version 2026-10-22: hosts choose their
// cancellation policy (four fixed ones) and house rules, instead of one for all.

// Lowest rate set_host_commission_rate accepts (it covers the card fee)
const MIN_FEE_PCT = 4;
// The policies hosts choose from, as the refunds follow them (_shared/cancellation.ts)
const POLICIES = POLICY_KEYS.map((key) => CANCELLATION_POLICIES[key]);
// Host price in the cancellation example (SEK)
const EXAMPLE_STAY = 10000;
const sek = (amount: number) => `${amount.toLocaleString("en-GB")} SEK`;

const HostTerms = () => {
  usePageMeta({
    title: "Host terms",
    description:
      "Terms for hosts on Nordic Getaways: your listing, the guest service fee, when you are paid out, cancellations and refunds.",
    path: HOST_TERMS_PATH,
  });

  // Links like /host-terms#payouts (from /become-host): the browser's own jump
  // is lost because the lazy route renders a blank fallback first, so scroll
  // to the section once it exists
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    try {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    } catch {
      // Malformed %-escape in the hash: stay at the top
    }
  }, [hash]);

  const fee = Math.round(PLATFORM_SERVICE_FEE_RATE * 100);
  const exampleFee = (EXAMPLE_STAY * fee) / 100;
  const support = <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>;

  return (
    <LegalPage
      title="Host terms"
      lead="These terms apply between you as a host and Mojjo AB when you list a cabin or holiday home on nordic-getaways.com."
      updated={`${HOST_TERMS_UPDATED} (version ${HOST_TERMS_VERSION})`}
    >
      <section id="who-we-are">
        <h2>Who we are and what we do</h2>
        <p>
          Nordic Getaways is run by {COMPANY.name}, org. no. {COMPANY.orgNumber}, {COMPANY_ADDRESS}, {support}.
        </p>
        <p className="mt-3">
          You rent out your own place as a private person, and we tell guests that hosts on Nordic Getaways rent
          out privately. When a guest books, the agreement for the stay is between you and the guest. We act as an
          intermediary in your name: we show your listing, take the booking, collect the payment on your behalf and
          handle cancellations and refunds, following these terms and our{" "}
          <Link to="/terms">booking terms for guests</Link>.
        </p>
        <p className="mt-3">
          You accept these terms when you apply to become a host (hosts who joined earlier accept them in their host
          dashboard), and always before you publish a listing.
        </p>
      </section>

      <section id="listing">
        <h2>Your listing</h2>
        <ul>
          <li>
            You must have the right to rent out the place, for example as its owner or with the permission of the
            owner, landlord or housing cooperative.
          </li>
          <li>
            Describe the place accurately and keep the listing up to date: photos, rooms and beds, how many guests it
            sleeps, amenities, location, check-in and check-out times, what is included and what guests can add, your
            house rules and your cancellation policy. What your listing says is what you promise the guest.
          </li>
          <li>
            You set your house rules in your host dashboard: the minimum stay (and a longer one over Valborg, Midsummer
            Eve and New Year's Eve if you like), whether pets, smoking, and parties or events are allowed, and the
            minimum age of the person booking (at least {ADULT_AGE}). Guests see and accept them before they pay, and
            the rules shown when a guest booked apply to that stay. Our booking terms for guests also apply to every
            stay.
          </li>
          <li>
            You are responsible for the place being safe to stay in, for example working smoke alarms, a fire
            extinguisher, and safe equipment such as boats, a sauna or a hot tub.
          </li>
          <li>You need insurance that covers renting out. We do not insure your place, your guests or their things.</li>
          <li>
            You are responsible for any permits your rental needs, and for declaring the income and paying the tax.
          </li>
        </ul>
      </section>

      <section id="fees">
        <h2>Fees</h2>
        <ul>
          <li>
            Listing is free and you keep 100% of your price: the nightly price and any extra-guest and cleaning fees,
            after the weekly or monthly discounts you choose to offer.
          </li>
          <li>
            The guest pays a service fee on top of your price and sees it before paying. The fee is {fee}%. Founding
            hosts, who become hosts by {FOUNDING_HOST_DEADLINE}, get {FOUNDING_HOST_FEE_PCT}% for their first 12 months
            as a host; after that the standard fee applies. We may set a different rate between {MIN_FEE_PCT}% and{" "}
            {fee}% for your listings.
          </li>
          <li>
            The service fee is our fee for the booking service. We pay the card fee for the guest's payment out of it,
            except when you cancel (see below).
          </li>
          <li>
            If we change the standard fee, we tell you at least 30 days before. Bookings already made keep their fee.
          </li>
        </ul>
      </section>

      <section id="payouts">
        <h2>Payments and payouts</h2>
        <ul>
          <li>
            To publish, you connect a Stripe account in your host dashboard. Stripe checks your identity and bank
            details. By connecting it you also accept Stripe's{" "}
            <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer">
              Connected Account Agreement
            </a>
            , and you let us share the information about you and your bookings that Stripe needs.
          </li>
          <li>
            Normally, when a guest pays, your share goes straight to your own Stripe account and only the service fee
            comes to us (for the exception, see the last point below). In your Stripe account the payment shows as
            the guest's whole payment with our service fee deducted as a fee; the guest paid that fee on top of your
            price, so what is left is your price in full.
          </li>
          <li>
            We pay your share of a booking out from your Stripe account to your bank the day after check-in, or 85
            days after the guest paid if that comes first. So for a booking made more than 85 days before check-in,
            your share is paid out before the stay. It usually reaches your bank within a few working days.
          </li>
          <li>
            If a guest is refunded before your share of that booking has been paid out, the refund comes out of that
            booking's payout, and you are paid what is left (see "When a guest cancels").
          </li>
          <li>
            If a refund, or anything else you owe us, comes after your share has been paid out, we take it from your
            next payout (see "Money taken back after a payout").
          </li>
          <li>All prices and payouts are in Swedish kronor (SEK).</li>
          <li>
            If your Stripe account cannot receive the money when a guest pays (for example while Stripe needs more
            details from you), the payment comes to our account instead and we pay your share to you separately.
          </li>
        </ul>
      </section>

      <section id="guest-cancels">
        <h2>When a guest cancels</h2>
        <p className="mb-3">
          You choose your listing's cancellation policy from these four, and can change it at any time. The policy
          shown when a guest booked applies to that booking, even if you change it later. Days are counted to the
          arrival date from the day the guest's cancellation reaches us (Swedish time). The guest gets back this share
          of the price of the stay:
        </p>
        <ul>
          {POLICIES.map((policy) => (
            <li key={policy.key}>
              <strong>{policy.name}:</strong>{" "}
              {policy.tiers
                .map((tier) => `${tier.label.charAt(0).toLowerCase()}${tier.label.slice(1)}, ${tier.refund_percentage > 0 ? `${tier.refund_percentage}%` : "nothing"}`)
                .join("; ")}
              .
            </li>
          ))}
        </ul>
        <p className="mt-3">
          The refund is taken from your share of that booking: before the payout, from that booking's payout; after
          it, as described in "Money taken back after a payout". The service fee is not refunded to the guest, and it
          never reduces your share. Example: your price for the stay is {sek(EXAMPLE_STAY)} and the guest also pays a{" "}
          {sek(exampleFee)} service fee. On the Standard policy, if the guest cancels 30 days before arrival, the
          guest gets {sek(EXAMPLE_STAY * 0.9)} back and you keep {sek(EXAMPLE_STAY * 0.1)}.
        </p>
        <p className="mt-3">
          Guests cancel through us; we handle the refund and the dates open again in your calendar. If a guest is
          owed money back for another reason, for example because the place was not as described or something
          important did not work, we may refund part of the price after hearing from you, and that is also taken
          from your share of the booking.
        </p>
      </section>

      <section id="host-cancels">
        <h2>If you cancel a booking</h2>
        <p>
          Only cancel if you really have to, and tell us straight away at {support}. If you cancel, or the guest
          cannot stay because of something on your side (for example the place cannot be used, or the dates were
          already booked elsewhere):
        </p>
        <ul className="mt-3">
          <li>the guest gets everything back, including the service fee;</li>
          <li>you get nothing for that booking: your whole share is taken back;</li>
          <li>
            you pay the card fee that Stripe charged for the guest's payment. We take it from your next payout.
          </li>
        </ul>
        <p className="mt-3">
          If we cancel a booking for a reason on our side, or the dates turn out to be already taken when the guest's
          payment comes through, the guest also gets everything back and your share is taken back, but we pay the
          card fee. If you cancel bookings repeatedly, we may unpublish your listing.
        </p>
      </section>

      <section id="recovery">
        <h2>Money taken back after a payout</h2>
        <p>
          If money has to be taken back after your share has been paid out (for example when a booking paid out
          before the stay is cancelled), such as a refund, a card fee you owe, or a payment the guest's bank reverses
          because of something on your side, we take it from your next payout, and from the ones after it if one
          payout is not enough. If your later payouts do not cover it, you pay the rest to {COMPANY.name} within 30
          days of our request.
        </p>
      </section>

      <section id="calendar">
        <h2>Your calendar</h2>
        <ul>
          <li>
            Bookings on Nordic Getaways are confirmed straight away, so your calendar must be right. Block the dates
            you don't want to rent out.
          </li>
          <li>
            If you also rent out elsewhere, for example on Airbnb or Booking.com, connect the calendars both ways with
            the calendar links in your host dashboard. Other sites can take hours to read a calendar, so check new
            bookings promptly.
          </li>
          <li>
            You are responsible for avoiding double bookings. If one happens and you cancel the stay booked here, the
            rules in "If you cancel a booking" apply.
          </li>
        </ul>
      </section>

      <section id="stays">
        <h2>Guests and stays</h2>
        <ul>
          <li>
            Give guests what your listing promises, send arrival instructions in good time and be reachable during
            the stay.
          </li>
          <li>Take payment for bookings made on Nordic Getaways only through Nordic Getaways.</li>
          <li>
            Guests are responsible for damage they cause beyond normal wear. A claim for damage is between you and the
            guest; we can pass it on, but we do not pay for damage.
          </li>
        </ul>
      </section>

      <section id="ranking">
        <h2>How listings are shown</h2>
        <p>
          No host can pay for a better place. Today the home page and its search results show complete listings (a
          main photo and at least five gallery photos) first, then the newest. The home page shows six listings, at
          most two per host when other hosts' listings can fill the places. The cabins page shows the newest first.
        </p>
      </section>

      <section id="unpublishing">
        <h2>Unpublishing listings</h2>
        <ul>
          <li>
            We may hide or remove a listing, or close a host account, if the listing is inaccurate or misleading, if
            these terms, our booking terms or the law are broken, after serious or repeated complaints from guests,
            after repeated cancellations, or if your Stripe account is closed or restricted.
          </li>
          <li>
            We tell you why by email. Unless the problem is serious or urgent, we first give you a chance to put it
            right. You can reply to ask us to look at the decision again.
          </li>
          <li>
            Bookings already made either go ahead or are cancelled. If they are cancelled for a reason on your side,
            the rules in "If you cancel a booking" apply.
          </li>
          <li>
            You can hide your listing or stop hosting whenever you want. Bookings already made must still go ahead, or
            they count as cancelled by you.
          </li>
        </ul>
      </section>

      <section id="tax-reporting">
        <h2>Taxes and reporting to Skatteverket</h2>
        <ul>
          <li>
            EU rules (DAC7) require platforms like ours to report hosts and their rental income to Skatteverket, which
            may share it with tax authorities in other EU countries. We report where the law requires it.
          </li>
          <li>
            You must give us the information needed for this when we ask: for example your name, address and
            personal identity number or date of birth, and the address of each place you rent out. If you have not given it after two reminders, the law
            requires us to hold back your payouts or close your account until you do.
          </li>
          <li>The tax report in your host dashboard is a help, not tax advice. You are responsible for your own tax return.</li>
        </ul>
      </section>

      <section id="personal-data">
        <h2>Personal data</h2>
        <p>
          We handle your personal data as described in our <Link to="/privacy">privacy policy</Link>. You get guests'
          names, contact details and booking details so that you can look after their stay: use them only for that,
          keep them safe, and don't use them for marketing without the guest's consent.
        </p>
      </section>

      <section id="liability">
        <h2>Responsibility</h2>
        <p>
          We are responsible for running the site and for handling bookings and payments with care. We are not
          responsible for the stay itself, for your place, or for what guests do there.
        </p>
      </section>

      <section id="changes">
        <h2>Changes to these terms</h2>
        <p>
          We may change these terms. We tell you by email at least 30 days before a change takes effect, and may ask
          you to accept the new terms before you publish again. Bookings already made follow the terms that applied
          when they were booked. If you don't accept a change, you can stop hosting before it takes effect.
        </p>
      </section>

      <section id="disputes">
        <h2>Disagreements</h2>
        <p>
          Contact us first at {support}. As a private person, you can also turn to the National Board for Consumer
          Disputes (ARN) at{" "}
          <a href="https://www.arn.se" target="_blank" rel="noopener noreferrer">arn.se</a>. Disputes that cannot be
          settled are decided by a Swedish court. Swedish law applies.
        </p>
      </section>
    </LegalPage>
  );
};

export default HostTerms;
