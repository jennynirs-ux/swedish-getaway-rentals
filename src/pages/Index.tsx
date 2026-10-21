import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePageMeta, SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/hooks/usePageMeta";
import { propertyPath } from "@/lib/propertySeo";
import { Button } from "@/components/ui/button";
import PropertyCard, { type PropertyCardData } from "@/components/PropertyCard";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { supabase } from "@/integrations/supabase/client";
import LazyImage from "@/components/LazyImage";
import { Grid3X3 } from "lucide-react";
import { PRICE_FILTER_MAX, type SearchFilters } from "@/components/PropertySearch";
import MainNavigation from "@/components/MainNavigation";
import HeroSearch from "@/components/home/HeroSearch";
import ExploreSweden from "@/components/home/ExploreSweden";
import GuestQuotes from "@/components/home/GuestQuotes";
import WhyBookDirect from "@/components/home/WhyBookDirect";
import HostCta from "@/components/home/HostCta";
import ShopStrip from "@/components/home/ShopStrip";
import CompanyLine from "@/components/CompanyLine";
import { COMPANY } from "@/content/company";
import { AREAS } from "@/content/areas";
import { calculateDistance, isInCityGroup, type Coordinates } from "@/lib/distance";
import { isCountryWideQuery } from "@/lib/geocoding";
import {
  FOUNDING_HOST_DEADLINE,
  FOUNDING_HOST_FEE_PCT,
  foundingHostOfferOpen,
  withServiceFee,
} from "@/lib/constants";
import {
  COUNT_LINE_MIN_CABINS,
  COUNT_LINE_MIN_HOSTS,
  HOME_CABIN_LIMIT,
  rankForHome,
  sortForHome,
} from "@/lib/homeListings";

import forestHeroBg from "@/assets/forest-hero-light.webp";
import forestHeroBgSmall from "@/assets/forest-hero-light-800.webp";
import { addDays, subDays, differenceInCalendarDays, format } from "date-fns";

const MemoizedPropertyCard = memo(PropertyCard);

// Local calendar date. toISOString() would give the day before for any date
// picked in Swedish time (UTC+1/+2), so the wrong nights were checked
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

// "Sweden" or "anywhere" is no place filter
const hasPlaceFilter = (location: string) => !!location.trim() && !isCountryWideQuery(location);

// The search bar starts at 2 guests and no limits, so only a change from that
// is a search (picking just the date flexibility isn't one)
const isSearchActive = (f: SearchFilters | null): f is SearchFilters =>
  !!f &&
  (hasPlaceFilter(f.location) ||
    !!(f.checkIn && f.checkOut) ||
    f.guests > 2 ||
    f.propertyType !== "all" ||
    f.amenities.length > 0 ||
    f.priceRange[0] > 0 ||
    f.priceRange[1] < PRICE_FILTER_MAX);

// An availability result only counts for the dates and the cabins it was checked for:
// a result for the empty list before the cabins load must not be reused once they arrive
const availabilityKey = (checkIn: Date, checkOut: Date, flex: number, propertyIds: string) =>
  `${ymd(checkIn)}|${ymd(checkOut)}|${flex}|${propertyIds}`;

// The owners' first two cabins, named in About
const ownCabinPath = (slug: string) => propertyPath({ id: slug, slug });

const HomePage = memo(() => {
  /** Hämta properties från supabase */
  const propertiesQueryFn = useCallback(async () => {
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        host_id,
        title,
        description,
        location,
        price_per_night,
        currency,
        max_guests,
        bedrooms,
        bathrooms,
        hero_image_url,
        gallery_images,
        amenities,
        active,
        review_rating,
        review_count,
        property_type,
        special_amenities,
        featured_amenities,
        latitude,
        longitude,
        city,
        county,
        slug,
        created_at
      `)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .order("id");

    if (error) throw error;
    // Guest fee per property (5% on founding hosts' listings); without it every card would add 10%
    const { data: fees } = await supabase.rpc("property_service_fee_rates");
    const feeById = new Map((fees || []).map((f) => [f.property_id, Number(f.service_fee_rate)]));
    return {
      data: (data || []).map((p) => ({ ...p, service_fee_rate: feeById.get(p.id) ?? null })),
      error: null,
    };
  }, []);

  const { data, loading } = useOptimizedQuery("homepage-properties", propertiesQueryFn, {
    cacheTime: 15 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    enableRealtime: false,
  });
  const properties = useMemo(() => data ?? [], [data]);

  usePageMeta({
    title: "Holiday cabins in Sweden – book direct",
    description: SITE_DESCRIPTION,
    path: "/",
    ready: !loading,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        legalName: COMPANY.name,
        email: COMPANY.email,
        address: {
          "@type": "PostalAddress",
          streetAddress: COMPANY.street,
          postalCode: COMPANY.postcode,
          addressLocality: COMPANY.city,
          addressCountry: "SE",
        },
        url: SITE_URL,
        logo: `${SITE_URL}/logo-512.png`,
        description:
          "Nordic Getaways is a Swedish booking site for holiday cabins. Guests book and pay on the site and deal directly with each cabin's host. Run by Mojjo AB.",
        areaServed: { "@type": "Country", name: "Sweden" },
        founder: [
          { "@type": "Person", name: "Jenny Nirs" },
          { "@type": "Person", name: "Jon Nirs" },
        ],
        identifier: {
          "@type": "PropertyValue",
          propertyID: "Swedish organisation number",
          value: COMPANY.orgNumber,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
        // No SearchAction: Google retired the sitelinks search box in 2024
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Holiday cabins in Sweden",
        numberOfItems: properties.length,
        itemListElement: properties.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}${propertyPath(p)}`,
          name: p.title,
        })),
      },
    ],
  });

  const [filters, setFilters] = useState<SearchFilters | null>(null);
  // Bumped by "Clear search" so the search bar remounts empty
  const [resetKey, setResetKey] = useState(0);
  const [availability, setAvailability] = useState<{ key: string; ids: Set<string> } | null>(null);

  const clearSearch = () => {
    setFilters(null);
    setResetKey((k) => k + 1);
  };

  const dateSearch = useMemo(
    () =>
      filters?.checkIn && filters?.checkOut
        ? { checkIn: filters.checkIn, checkOut: filters.checkOut, flex: filters.dateFlexibility || 0 }
        : null,
    [filters?.checkIn, filters?.checkOut, filters?.dateFlexibility]
  );
  const propertyIdsKey = useMemo(() => properties.map((p) => p.id).join(","), [properties]);
  const datesKey = dateSearch
    ? availabilityKey(dateSearch.checkIn, dateSearch.checkOut, dateSearch.flex, propertyIdsKey)
    : null;
  const availableIds = availability && availability.key === datesKey ? availability.ids : null;

  // Check availability against selected dates (+/- flexibility)
  useEffect(() => {
    if (!dateSearch) return;
    let cancelled = false;
    const { checkIn, checkOut, flex } = dateSearch;
    const propertyIds = properties.map((p) => p.id);
    const key = availabilityKey(checkIn, checkOut, flex, propertyIds.join(","));

    const run = async () => {
      if (propertyIds.length === 0) return new Set<string>();

      const nights = differenceInCalendarDays(checkOut, checkIn);
      const startMin = subDays(checkIn, flex);
      const startMax = addDays(checkIn, flex);
      const endMax = addDays(checkOut, flex);

      const { data, error } = await supabase
        .from("availability")
        .select("property_id,date,available")
        .in("property_id", propertyIds)
        .gte("date", ymd(startMin))
        .lt("date", ymd(endMax))
        .eq("available", false);

      if (error) throw error;

      const blockMap = new Map<string, Set<string>>();
      (data || []).forEach((row) => {
        // A date column already comes as yyyy-MM-dd
        const d = String(row.date).slice(0, 10);
        if (!blockMap.has(row.property_id)) blockMap.set(row.property_id, new Set());
        blockMap.get(row.property_id)!.add(d);
      });

      const okIds = new Set<string>();
      propertyIds.forEach((pid) => {
        const blocked = blockMap.get(pid) || new Set<string>();
        for (let s = new Date(startMin); s <= startMax; s = addDays(s, 1)) {
          let ok = true;
          for (let i = 0; i < nights; i++) {
            if (blocked.has(ymd(addDays(s, i)))) { ok = false; break; }
          }
          if (ok) { okIds.add(pid); break; }
        }
      });
      return okIds;
    };

    run()
      .then((ids) => !cancelled && setAvailability({ key, ids }))
      .catch((err) => {
        console.error("Availability check failed:", err);
        if (!cancelled) setAvailability({ key, ids: new Set() });
      });
    return () => {
      cancelled = true;
    };
  }, [dateSearch, properties]);

  const searchActive = isSearchActive(filters);
  const waitingForAvailability = searchActive && !!datesKey && !availableIds;

  /** Every cabin that fits the search, in home page order */
  const matches = useMemo(() => {
    if (!isSearchActive(filters)) return [];

    return sortForHome(
      properties.filter((p) => {
        if (p.max_guests < filters.guests) return false;

        // Compare what the guest pays, as the cards show it; the slider's top end means no limit
        const guestPrice = Math.round(withServiceFee(p.price_per_night, p.service_fee_rate));
        const [minPrice, maxPrice] = filters.priceRange;
        if (guestPrice < minPrice || (maxPrice < PRICE_FILTER_MAX && guestPrice > maxPrice)) return false;

        if (filters.propertyType !== "all" && p.property_type?.toLowerCase() !== filters.propertyType.toLowerCase()) {
          return false;
        }

        // Amenities filter
        if (filters.amenities.length > 0) {
          const names = Array.isArray(p.amenities)
            ? p.amenities.map((a) => String(a || "").toLowerCase()).filter(Boolean)
            : [];
          for (const w of filters.amenities.map((a) => a.toLowerCase())) {
            if (!names.some((n) => n.includes(w))) return false;
          }
        }

        // Date availability filter
        if (datesKey && !availableIds?.has(p.id)) return false;

        // Location/City filter with distance calculation
        if (hasPlaceFilter(filters.location)) {
          // Check city name match or city groups
          if (p.city && isInCityGroup(p.city, filters.location)) return true;

          // A county search ("Västra Götaland") takes every cabin in that county
          if (filters.destinationCounty && p.county === filters.destinationCounty) return true;

          // Check distance-based filtering if coordinates are available
          if (filters.destinationCoords && p.latitude && p.longitude) {
            const propertyCoords: Coordinates = { latitude: p.latitude, longitude: p.longitude };
            // Within 30 km radius
            if (calculateDistance(filters.destinationCoords, propertyCoords) <= 30) return true;
          }

          return false;
        }

        return true;
      })
    );
  }, [properties, filters, datesKey, availableIds]);

  const shelf = useMemo(() => rankForHome(properties), [properties]);
  const hostCount = useMemo(() => new Set(properties.map((p) => p.host_id)).size, [properties]);
  const cabinCount = properties.length;
  const showCountLine = cabinCount >= COUNT_LINE_MIN_CABINS && hostCount >= COUNT_LINE_MIN_HOSTS;

  const renderCard = (p: (typeof properties)[number]) => (
    <MemoizedPropertyCard
      key={p.id}
      property={{
        ...p,
        hero_image_url: p.hero_image_url || "/placeholder.svg",
        description: p.description || "",
        currency: p.currency || "SEK",
        amenities: Array.isArray(p.amenities) ? p.amenities : [],
        featured_amenities: (Array.isArray(p.featured_amenities)
          ? p.featured_amenities
          : []) as PropertyCardData["featured_amenities"],
        special_amenities: Array.isArray(p.special_amenities) ? p.special_amenities : [],
      }}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Navigation */}
      <MainNavigation />

      {/* Hero Section: min-h and pt-20 keep a three-line H1 and the search pill under the nav on a 375×667 phone.
          Minimum heights only, so the header grows when Advanced Filters open on desktop */}
      <header className="relative min-h-[max(560px,80vh)] md:min-h-[max(560px,70vh)] pt-20 md:pt-24 pb-8 md:pb-12 flex items-center justify-center text-center">
        <div className="absolute inset-0">
          <LazyImage
            src={forestHeroBg}
            srcSet={`${forestHeroBgSmall} 800w, ${forestHeroBg} 1600w`}
            sizes="100vw"
            alt="Sunlit Swedish forest"
            className="w-full h-full object-cover"
            priority={true}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/70"></div>
        </div>

        <div className="relative z-10 px-4 max-w-4xl mx-auto w-full">
          <p className="text-sm uppercase tracking-wide text-white/80 mb-3">Nordic Getaways</p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 md:mb-6">
            Holiday cabins in Sweden, booked directly with the host
          </h1>
          <p className="text-lg md:text-2xl text-white/90 mb-8 md:mb-10">
            Every cost is shown before you pay, and the same clear cancellation rules apply to every cabin.
          </p>

          <HeroSearch properties={properties} filters={filters} onFiltersChange={setFilters} resetKey={resetKey} />
        </div>
      </header>

      <main>
        {/* Property Cards */}
        <section id="cabins" aria-labelledby="cabins-heading" className="pb-16 scroll-mt-4">
          <div className="container mx-auto px-4 pt-16">
            <div className="text-center mb-10">
              {searchActive && !waitingForAvailability && matches.length > 0 ? (
                <>
                  {/* Focused after a search from the phone drawer (HeroSearch) */}
                  <h2 id="cabins-heading" tabIndex={-1} className="text-3xl font-bold text-foreground focus:outline-none">
                    {matches.length === 1 ? "1 cabin matches your search" : `${matches.length} cabins match your search`}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Nightly prices include the service fee.{" "}
                    <Button variant="link" className="h-auto p-0" onClick={clearSearch}>
                      Clear search
                    </Button>
                  </p>
                </>
              ) : (
                <>
                  <h2 id="cabins-heading" tabIndex={-1} className="text-3xl font-bold text-foreground focus:outline-none">
                    {/* Focus lands here after a search: say the result, not the section name */}
                    {searchActive && !waitingForAvailability ? "No cabins match your search" : "Cabins to rent in Sweden"}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {showCountLine && `${cabinCount} cabins from ${hostCount} hosts. `}
                    Nightly prices include the service fee.
                  </p>
                </>
              )}
            </div>

            {loading || waitingForAvailability ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg h-64 mb-4"></div>
                    <div className="space-y-2">
                      <div className="bg-muted h-6 rounded w-3/4"></div>
                      <div className="bg-muted h-4 rounded w-1/2"></div>
                      <div className="bg-muted h-16 rounded"></div>
                      <div className="flex justify-between items-end">
                        <div className="bg-muted h-8 rounded w-1/3"></div>
                        <div className="bg-muted h-10 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchActive ? (
              matches.length > 0 ? (
                // A search shows every match, not just the shelf
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">{matches.map(renderCard)}</div>
              ) : (
                <div className="text-center py-16">
                  <div className="max-w-md mx-auto">
                    <Grid3X3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-xl font-semibold text-foreground mb-2">Nothing found</p>
                    <p className="text-muted-foreground mb-6">Try other dates, fewer guests or a different place.</p>
                    <Button variant="outline" onClick={clearSearch}>
                      Clear search
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">{shelf.map(renderCard)}</div>
                {cabinCount > HOME_CABIN_LIMIT && (
                  <div className="text-center mt-10">
                    <Button asChild variant="outline" size="lg">
                      <Link to="/cabins">Browse all {cabinCount} cabins</Link>
                    </Button>
                  </div>
                )}
                {cabinCount < COUNT_LINE_MIN_CABINS && (
                  <p className="text-center text-muted-foreground mt-10 max-w-2xl mx-auto">
                    More cabins are on the way as new hosts join. Have a cabin or holiday home yourself?{" "}
                    <Link to="/become-host" className="text-primary hover:underline">
                      List it on Nordic Getaways <span aria-hidden="true">→</span>
                    </Link>
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <ExploreSweden properties={properties} />

        <WhyBookDirect />

        <GuestQuotes properties={properties} />

        <HostCta />

        {/* Who runs the site */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">About Nordic Getaways</h2>
            {/* When the first other host's cabin goes live: "…and now hosts all over Sweden list their homes here too." */}
            <p className="text-lg text-muted-foreground">
              Nordic Getaways is a Swedish booking site for holiday cabins, run by Jenny and Jon Nirs through their
              company {COMPANY.name}. We started with our own two lakeside cabins,{" "}
              <Link to={ownCabinPath("lakefront-retreat")} className="underline">Villa Häcken</Link> and{" "}
              <Link to={ownCabinPath("lakehouse-getaway")} className="underline">Lakehouse Getaway</Link>, which we
              also host on Airbnb as Superhosts, and we have now opened the site to hosts all over Sweden. Each cabin
              is run by its own host, so questions about your stay go to them through the chat on your booking. For
              payments, problems with a booking or the shop, email{" "}
              <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
            </p>
          </div>
        </section>

        <ShopStrip />
      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-4">Nordic Getaways</h3>
              <p className="text-muted-foreground">Holiday cabins in Sweden, booked directly with the host.</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Explore</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/cabins" className="hover:text-foreground">All cabins</Link></li>
                {AREAS.map((area) => (
                  <li key={area.path}>
                    <Link to={area.path} className="hover:text-foreground">Area guide: {area.name}</Link>
                  </li>
                ))}
                <li><Link to="/first-time-in-sweden" className="hover:text-foreground">First time in Sweden?</Link></li>
                <li><Link to="/shop" className="hover:text-foreground">The Nordic Collection</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">For guests</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/profile" className="hover:text-foreground">My bookings</Link></li>
                <li><Link to="/auth" className="hover:text-foreground">Sign in / Register</Link></li>
                <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
                <li><Link to="/terms" className="hover:text-foreground">Booking terms</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground">Privacy policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">For hosts</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/become-host" className="hover:text-foreground">Become a host</Link></li>
                <li><Link to="/pricing-guide" className="hover:text-foreground">Pricing guide</Link></li>
                {foundingHostOfferOpen() && (
                  <li>
                    <Link to="/become-host" className="hover:text-foreground">
                      Founding-host offer: {FOUNDING_HOST_FEE_PCT}% until {FOUNDING_HOST_DEADLINE}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-border">
            <CompanyLine className="text-muted-foreground" />
          </div>
        </div>
      </footer>
    </div>
  );
});

HomePage.displayName = "HomePage";

export default HomePage;
