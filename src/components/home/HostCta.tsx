import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FOUNDING_HOST_DEADLINE,
  FOUNDING_HOST_FEE_PCT,
  PLATFORM_SERVICE_FEE_RATE,
  foundingHostOfferOpen,
} from "@/lib/constants";

const FEE_PCT = Math.round(PLATFORM_SERVICE_FEE_RATE * 100);

/** For people with a cabin of their own: the one host pitch on the home page */
const HostCta = () => (
  <section className="py-12 bg-primary/5 border-t border-border">
    <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Have a cabin or holiday home in Sweden?</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          List it on Nordic Getaways, wherever in Sweden it is. You set the price and keep all of it; guests pay a{" "}
          {FEE_PCT}% service fee on top. You publish and run your own listing, get paid through Stripe and sync your
          calendar with Airbnb and other sites to avoid double bookings.
        </p>
        {foundingHostOfferOpen() && (
          <p className="mt-4 inline-block rounded-2xl bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            Founding-host offer: join by {FOUNDING_HOST_DEADLINE} and your guests pay only {FOUNDING_HOST_FEE_PCT}% for
            your first 12 months.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3 shrink-0">
        <Button asChild>
          <Link to="/become-host">Become a host</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/pricing-guide">Pricing guide</Link>
        </Button>
      </div>
    </div>
  </section>
);

export default HostCta;
