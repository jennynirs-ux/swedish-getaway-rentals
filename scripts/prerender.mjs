// Snapshot public routes to static HTML after `vite build`, so search engines
// and AI assistants (GPTBot, ClaudeBot, PerplexityBot, ...) that don't run
// JavaScript still see real content, titles and structured data.
// Also writes sitemap.xml from the live property list (there is no copy in public/).
//
// Usage: node scripts/prerender.mjs   (needs Chrome; set CHROME_PATH if not found)

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { preview, loadEnv } from "vite";
import puppeteer from "puppeteer-core";

const SITE_URL = "https://nordic-getaways.com";
const DIST = path.resolve("dist");
const PORT = 4179;

const STATIC_ROUTES = [
  "/",
  "/first-time-in-sweden",
  "/stora-harsjon-lerum",
  "/cabins",
  "/contact",
  "/pricing-guide",
  "/become-host",
  "/shop",
  "/privacy",
  "/terms",
  "/host-terms",
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

async function fetchRest(query) {
  const env = loadEnv("production", process.cwd(), "VITE_");
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Fetching ${query.split("?")[0]} failed: ${res.status}`);
  return res.json();
}

async function fetchProperties() {
  const [properties, rules, fees] = await Promise.all([
    fetchRest("properties?select=id,slug,title,location,description,max_guests,bedrooms,price_per_night,currency,review_rating,review_count,updated_at,cancellation_policy,min_nights,holiday_min_nights,pets_allowed,smoking_allowed,events_allowed,min_guest_age&active=eq.true"),
    fetchRest("properties_pricing_rules?select=property_id,rule_type,name,price,is_per_night,guests_included,included,per_guest&is_active=eq.true&order=created_at"),
    // Guest fee per property (5 % on founding hosts' listings)
    fetchRest("rpc/property_service_fee_rates"),
  ]);
  return properties.map((p) => ({
    ...p,
    service_fee_rate: Number(fees.find((f) => f.property_id === p.id)?.service_fee_rate ?? 10),
    rules: rules.filter((r) => r.property_id === p.id),
  }));
}

// Shop products for the product pages and the Merchant Center feed
async function fetchProducts() {
  return fetchRest(
    "shop_products?select=id,title,title_override,description,description_override,custom_description,price,price_override,custom_price,currency,image_url,main_image_override,additional_images_override,all_images:printful_data->all_images,updated_at&visible=eq.true&is_visible_shop=eq.true&order=sort_order.asc.nullslast",
  );
}

// Same fields as the product page shows (ProductDetail getDisplayData) and the
// same description fallback and brand as src/lib/productSeo.ts
const SHOP_BRAND = "The Nordic Collection";
const productView = (p) => {
  const title = p.title_override || p.title;
  const own = (p.description_override || p.custom_description || p.description || "").trim();
  const images = [p.main_image_override || p.image_url, ...(p.additional_images_override || []), ...(p.all_images || [])]
    .filter((img, i, all) => img && all.indexOf(img) === i);
  return {
    title,
    description: own && own !== title.trim() ? own : `${title} from ${SHOP_BRAND}, printed to order.`,
    price: p.price_override || p.custom_price || p.price,
    currency: p.currency || "SEK",
    images,
  };
};

const xml = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Google Merchant Center product feed (RSS 2.0), fetched from
// https://nordic-getaways.com/merchant-feed.xml. One item per product at the
// price the page shows before a variant is picked, so the prices always match.
// Print-on-demand items have no GTIN. Shipping and returns are set in Merchant Center.
async function writeMerchantFeed(products) {
  const items = products
    .map((p) => {
      const v = productView(p);
      if (!v.images.length || !v.price) return "";
      return `    <item>
      <g:id>${xml(p.id)}</g:id>
      <title>${xml(v.title)}</title>
      <description>${xml(v.description)}</description>
      <link>${SITE_URL}/product/${xml(p.id)}</link>
      <g:image_link>${xml(v.images[0])}</g:image_link>
${v.images.slice(1, 11).map((img) => `      <g:additional_image_link>${xml(img)}</g:additional_image_link>`).join("\n")}
      <g:availability>in_stock</g:availability>
      <g:price>${(v.price / 100).toFixed(2)} ${xml(v.currency)}</g:price>
      <g:brand>${SHOP_BRAND}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .filter(Boolean)
    .map((item) => item.replace(/\n\n/g, "\n"));
  await writeFile(
    path.join(DIST, "merchant-feed.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${SHOP_BRAND} – Nordic Getaways</title>
    <link>${SITE_URL}/shop</link>
    <description>Nordic designs printed to order</description>
${items.join("\n")}
  </channel>
</rss>
`,
  );
  return items.length;
}

// Name and summary of each cancellation policy, as in
// supabase/functions/_shared/cancellation.ts (src/lib/prerenderText.test.ts checks they match)
const POLICY_TEXT = {
  flexible: "Flexible (Full refund up to 1 day before arrival.)",
  moderate: "Moderate (Full refund up to 5 days before arrival, then 50% until the day before.)",
  standard: "Standard (90% refund more than 21 days before arrival, 50% from 21 to 8 days, then none.)",
  strict: "Strict (50% refund up to 14 days before arrival, then none.)",
};

// The host's house rules and cancellation policy, as houseRuleLines in
// supabase/functions/_shared/stay-rules.ts words them
const rulesText = (p) => {
  const min = Math.max(1, p.min_nights ?? 1);
  const holiday = p.holiday_min_nights && p.holiday_min_nights > min ? ` (${p.holiday_min_nights} over Valborg, Midsummer and New Year's Eve)` : "";
  const rules = [
    `minimum stay ${min} night${min !== 1 ? "s" : ""}${holiday}`,
    p.pets_allowed ? "pets allowed" : "no pets",
    p.smoking_allowed ? "smoking allowed" : "no smoking",
    p.events_allowed ? "parties and events allowed" : "no parties or events",
    `the person booking is at least ${Math.max(18, p.min_guest_age ?? 18)}`,
  ];
  return ` House rules: ${rules.join(", ")}. Cancellation policy: ${POLICY_TEXT[p.cancellation_policy] ?? POLICY_TEXT.standard}`;
};

// Same wording as extraServiceUnit in supabase/functions/_shared/booking-price.ts
const extraUnit = (r) => (r.per_guest ? (r.is_per_night ? "per guest per night" : "per guest") : r.is_per_night ? "per night" : "per stay");

// Fees on top of the nightly price (rule prices are in öre), so AI answers
// don't understate the total; then what the host includes (e.g. linen, which
// the Terms promise only when the listing says so) and the extras guests can add
const feesText = (p) => {
  const fees = p.rules
    .map((r) =>
      r.rule_type === "extra_guest"
        ? ` The price covers ${Math.max(1, r.guests_included ?? 1)} guest${Math.max(1, r.guests_included ?? 1) !== 1 ? "s" : ""}; each extra guest adds ${r.price / 100} ${p.currency}${r.is_per_night ? " per night" : " per stay"}.`
        : r.rule_type === "cleaning_fee"
          ? ` Cleaning fee ${r.price / 100} ${p.currency} per stay.`
          : "",
    )
    .join("");
  const extras = p.rules.filter((r) => r.rule_type === "extra_service");
  const included = extras.filter((r) => r.included).map((r) => r.name);
  const optional = extras.filter((r) => !r.included).map((r) => `${r.name} (${r.price / 100} ${p.currency} ${extraUnit(r)})`);
  return `${fees}${included.length ? ` Included: ${included.join(", ")}.` : ""}${optional.length ? ` Extras guests can add: ${optional.join(", ")}.` : ""}`;
};

async function writeSitemap(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map(({ route, lastmod }) => `  <url>\n    <loc>${SITE_URL}${route}</loc>\n    <lastmod>${lastmod ?? today}</lastmod>\n  </url>`)
    .join("\n");
  await writeFile(
    path.join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
}

// Old /property/<uuid> links → canonical slug URLs
async function writeRedirects(properties) {
  // /book-now was renamed to /cabins. /gallery and /amenities were empty
  // pages; photos and amenities live on each property page
  const lines = ["/book-now /cabins 301", "/gallery / 301", "/amenities / 301"].concat(properties
    .filter((p) => p.slug)
    .flatMap((p) => [
      `/property/${p.id} /property/${p.slug} 301`,
      `/property/${p.id}/* /property/${p.slug}/:splat 301`,
    ]));
  await writeFile(path.join(DIST, "_redirects"), lines.join("\n") + "\n");
}

// llms.txt: a plain-text summary for AI assistants (https://llmstxt.org)

// House facts for the owners' cabins that aren't columns yet
const CABIN_FACTS = {
  "lakefront-retreat": " Boats and paddle boards included. Parking for 2 cars.",
  "lakehouse-getaway": " Rowing boat and paddle boards included. Parking for 1 car.",
};

// The owners' cabins, whose ratings are Airbnb's. Same slugs as PROPERTY_CONTENT
// in src/content/propertyContent.ts (as in propertyMetaDescription); nothing
// records where other listings' ratings come from, so they get no source
const AIRBNB_RATED_SLUGS = new Set(["lakefront-retreat", "lakehouse-getaway"]);

// Same cut-off as foundingHostOfferOpen() in src/lib/constants.ts; the first
// build of 2027 drops the offer line
const FOUNDING_HOST_OFFER_OPEN = new Date() < new Date("2027-01-01T00:00:00+01:00");

async function writeLlmsTxt(properties) {
  const cabins = properties
    .map((p) => {
      const rating = p.review_rating && p.review_count
        ? ` Rated ${p.review_rating}/5 by ${p.review_count} guests${AIRBNB_RATED_SLUGS.has(p.slug) ? " on Airbnb" : ""}.`
        : "";
      const summary = (p.description ?? "").replace(/\s+/g, " ").trim();
      return `- [${p.title}](${SITE_URL}/property/${p.slug || p.id}): ${p.location}. Sleeps ${p.max_guests}, ${p.bedrooms} bedroom(s), from ${Math.round(p.price_per_night * (1 + (p.service_fee_rate ?? 10) / 100))} ${p.currency}/night incl. ${p.service_fee_rate ?? 10}% service fee.${feesText(p)}${rulesText(p)}${CABIN_FACTS[p.slug] ?? ""}${rating} ${summary}`;
    })
    .join("\n");
  const foundingOffer = FOUNDING_HOST_OFFER_OPEN
    ? " Founding-host offer: hosts who sign up by 31 December 2026 get a 5% guest fee for their first 12 months."
    : "";
  await writeFile(
    path.join(DIST, "llms.txt"),
    `# Nordic Getaways

> Nordic Getaways (nordic-getaways.com) is a Swedish booking site for holiday cabins and holiday homes (stugor). Each cabin is listed and run by its own host; guests book and pay by card on the site and talk to the host directly. Guests pay the host's nightly price plus a service fee – 10% or less (5% on listings from founding hosts in their first 12 months) – and the total is shown before payment. The site is run by Mojjo AB in Lerum, Sweden, founded by Jenny and Jon Nirs, who also host the first two cabins: Villa Häcken and Lakehouse Getaway on lake Stora Härsjön near Gothenburg.

## Rules for every stay booked on the site

- Minimum stay 2 nights; 3 nights over Valborg (30 April), Midsummer Eve and New Year's Eve.
- The person booking must be at least 25 and stay at the property. No parties or events.
- Cancellation: 90% refund more than 21 days before arrival, 50% 8–21 days before, none within 7 days.
- Pets, parking, check-in times and other house rules vary by cabin – see each listing.

## Cabins

${cabins}

## Guides

- [Area guide: Stora Härsjön & Lerum, near Gothenburg](${SITE_URL}/stora-harsjon-lerum): for guests at Villa Häcken and Lakehouse Getaway – 16 km lake hike, swimming, paddling, family activities, restaurants in Lerum and how to get there by car, train and bus.
- [First time in Sweden](${SITE_URL}/first-time-in-sweden): practical tips on fika, allemansrätten (the right to roam), etiquette, payments and Swedish food.

## For hosts

- [Become a host](${SITE_URL}/become-host): list a cabin or holiday home anywhere in Sweden. Hosts set their own nightly price and keep all of it; guests pay a 10% service fee on top. Hosts publish and manage their own listings, get paid through Stripe and can sync calendars with Airbnb, Booking.com and other sites.${foundingOffer}
- [Pricing guide for hosts](${SITE_URL}/pricing-guide): how to set nightly prices.

## Shop

- [The Nordic Collection](${SITE_URL}/shop): Nordic-design clothing, bags and home textiles, printed to order by Printful and shipped to the Nordics, much of Europe, the US and Canada.

## Booking

- [Find a cabin](${SITE_URL}/cabins): pick a cabin, check dates and pay securely by card; the full price including the service fee is shown before payment.
- [Contact](${SITE_URL}/contact): support@mojjo.se for bookings, hosting and the shop.
`,
  );
}

async function main() {
  const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!chromePath) throw new Error("Chrome not found - set CHROME_PATH");

  const [properties, products] = await Promise.all([fetchProperties(), fetchProducts()]);
  const routes = [
    ...STATIC_ROUTES.map((route) => ({ route })),
    ...properties.map((p) => ({ route: `/property/${p.slug || p.id}`, lastmod: p.updated_at?.slice(0, 10) })),
    ...products.map((p) => ({ route: `/product/${p.id}`, lastmod: p.updated_at?.slice(0, 10) })),
  ];

  const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: "warn" });
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  let failures = 0;
  try {
    // "/" last: dist/index.html is also the SPA fallback the other routes load from
    const ordered = [...routes.filter((r) => r.route !== "/"), ...routes.filter((r) => r.route === "/")];
    for (const { route } of ordered) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      try {
        await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "networkidle0", timeout: 45000 });
        // usePageMeta sets this once the page's data (and meta tags) are in place
        await page.waitForSelector("html[data-meta-ready]", { timeout: 20000 });
        // Let lazy sections below the fold mount too
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 800) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 100));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 }).catch(() => {});

        const html = await page.evaluate(() => {
          document.documentElement.removeAttribute("data-meta-ready");
          // Toasts/portals are client-only UI
          document.querySelectorAll("[data-radix-portal], ol[tabindex='-1']").forEach((el) => el.remove());
          return "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
        });

        // "/foo" -> foo.html: Cloudflare Pages serves it at /foo without the
        // trailing-slash redirect it adds for foo/index.html
        const out = route === "/" ? path.join(DIST, "index.html") : path.join(DIST, `${route}.html`);
        await mkdir(path.dirname(out), { recursive: true });
        await writeFile(out, html);
        console.log(`prerendered ${route} (${Math.round(html.length / 1024)} kB)`);
      } catch (error) {
        failures++;
        console.error(`FAILED ${route}: ${error.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
  }

  await writeSitemap(routes);
  await writeRedirects(properties);
  await writeLlmsTxt(properties);
  const feedItems = await writeMerchantFeed(products);
  console.log(`sitemap.xml: ${routes.length} urls, merchant-feed.xml: ${feedItems} products`);

  if (failures) {
    console.error(`${failures} route(s) failed to prerender`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
