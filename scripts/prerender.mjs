// Snapshot public routes to static HTML after `vite build`, so search engines
// and AI assistants (GPTBot, ClaudeBot, PerplexityBot, ...) that don't run
// JavaScript still see real content, titles and structured data.
// Also regenerates sitemap.xml from the live property list.
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
  "/book-now",
  "/contact",
  "/pricing-guide",
  "/become-host",
  "/shop",
  "/privacy",
  "/terms",
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
  const [properties, rules] = await Promise.all([
    fetchRest("properties?select=id,slug,title,location,description,max_guests,bedrooms,price_per_night,currency,review_rating,review_count,updated_at&active=eq.true"),
    fetchRest("properties_pricing_rules?select=property_id,rule_type,price,is_per_night&is_active=eq.true"),
  ]);
  return properties.map((p) => ({ ...p, rules: rules.filter((r) => r.property_id === p.id) }));
}

// Fees on top of the nightly price (rule prices are in öre), so AI answers
// don't understate the total
const feesText = (p) =>
  p.rules
    .map((r) =>
      r.rule_type === "extra_guest"
        ? ` The price is for 1 guest; each extra guest adds ${r.price / 100} ${p.currency} per night. Bed linen and towels for every guest are included.`
        : r.rule_type === "cleaning_fee"
          ? ` Cleaning fee ${r.price / 100} ${p.currency} per stay.`
          : "",
    )
    .join("");

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
  // /gallery and /amenities were empty pages; photos and amenities live on
  // each property page
  const lines = ["/gallery / 301", "/amenities / 301"].concat(properties
    .filter((p) => p.slug)
    .flatMap((p) => [
      `/property/${p.id} /property/${p.slug} 301`,
      `/property/${p.id}/* /property/${p.slug}/:splat 301`,
    ]));
  await writeFile(path.join(DIST, "_redirects"), lines.join("\n") + "\n");
}

// llms.txt: a plain-text summary for AI assistants (https://llmstxt.org)
async function writeLlmsTxt(properties) {
  const stays = properties
    .map((p) => {
      const rating = p.review_rating && p.review_count ? ` Rated ${p.review_rating}/5 by ${p.review_count} guests.` : "";
      const summary = (p.description ?? "").replace(/\s+/g, " ").trim();
      return `- [${p.title}](${SITE_URL}/property/${p.slug || p.id}): ${p.location}. Sleeps ${p.max_guests}, ${p.bedrooms} bedroom(s), from ${Math.round(p.price_per_night * 1.1)} ${p.currency}/night incl. 10% service fee.${feesText(p)}${rating} ${summary}`;
    })
    .join("\n");
  await writeFile(
    path.join(DIST, "llms.txt"),
    `# Nordic Getaways

> Nordic Getaways is run by Superhosts Jenny and Jon Nirs, who rent out two lakeside homes on Stora Härsjön in Lerum, about 30 minutes from Gothenburg, Sweden: Villa Häcken (sleeps 8, hot tub, private jetty and beach) and Lakehouse Getaway (a simple cabin for up to 4 at the water's edge). Boats and paddle boards are included. Book directly with the hosts. Pets, parties and events are not allowed; the person booking must be at least 25. Minimum stay 2 nights (3 over Valborg, Midsummer and New Year's Eve). Cancellation: 90% refund more than 21 days before arrival, 50% 8–21 days before, none within 7 days. Parking: two cars at Villa Häcken, one car at Lakehouse Getaway.

## Stays

${stays}

## Guides

- [Stora Härsjön & Lerum guide](${SITE_URL}/stora-harsjon-lerum): things to do around the lake and near Gothenburg – 16 km lake hike, swimming, paddling, family activities, restaurants in Lerum and how to get here by car, train and bus.
- [First time in Sweden](${SITE_URL}/first-time-in-sweden): practical tips on fika, allemansrätten (the right to roam), etiquette, payments and Swedish food.

## For hosts

- [Become a host](${SITE_URL}/become-host): list your holiday home on Nordic Getaways. Guests pay a 10% service fee; hosts keep their full nightly price.
- [Pricing guide for hosts](${SITE_URL}/pricing-guide): how to set nightly prices.

## Booking

- [Book now](${SITE_URL}/book-now): book directly with secure card payment.
- [Contact](${SITE_URL}/contact)
`,
  );
}

async function main() {
  const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!chromePath) throw new Error("Chrome not found - set CHROME_PATH");

  const properties = await fetchProperties();
  const routes = [
    ...STATIC_ROUTES.map((route) => ({ route })),
    ...properties.map((p) => ({ route: `/property/${p.slug || p.id}`, lastmod: p.updated_at?.slice(0, 10) })),
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
  console.log(`sitemap.xml: ${routes.length} urls`);

  if (failures) {
    console.error(`${failures} route(s) failed to prerender`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
