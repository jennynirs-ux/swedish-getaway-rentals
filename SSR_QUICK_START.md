# SSR Migration - Quick Start Guide

## What Changed?

Three key pages now use Next.js App Router with server-side rendering:

| Page | File | Before | After |
|------|------|--------|-------|
| Homepage | `app/page.tsx` | Client-only | SSR + hydration |
| Property Detail | `app/property/[slug]/page.tsx` | Client-only | SSR + dynamic metadata |
| Shop | `app/shop/page.tsx` | Client-only | SSR + hydration |

## How It Works

### Old Flow (Client-only)
```
Browser → Next.js (no data) → React mounts → Fetch data → Render
```

### New Flow (SSR)
```
Browser → Next.js Server (fetch data) → Render to HTML → Send to browser → Hydrate
```

## Key Files to Know

### Server Components (Fetch data here)
- `app/page.tsx` - Fetches homepage properties
- `app/property/[slug]/page.tsx` - Fetches single property
- `app/shop/page.tsx` - Fetches shop products

### Client Components (Interactive features)
- `app/home-client.tsx` - Homepage search & filtering
- `app/property/[slug]/property-client.tsx` - Property details with interactivity
- `app/shop-client.tsx` - Shop filtering & cart

### Server Utilities
- `app/lib/supabase-server.ts` - Server-only Supabase client

## Development

### Run locally
```bash
npm run next:dev
# Visit http://localhost:3000
```

### Test SSR is working
1. Disable JavaScript in DevTools (Chrome: ⌘Shift+P → "Disable JavaScript")
2. Refresh page
3. Content should still appear (proof: it was rendered server-side)

### Check metadata
```bash
# View page source (right-click → View Page Source)
# Look for <meta> tags with og: and twitter:
```

## Building

### Development build
```bash
npm run next:build
npm run next:start
```

### What gets optimized
- Top 50 properties pre-generated as static HTML (faster loads)
- Other properties generated on-demand
- Images optimized to AVIF/WebP formats
- Metadata extracted from database

## Making Changes

### Update Homepage Data
Edit: `app/page.tsx` → `getHomepageProperties()` function

### Update Property Page
Edit: `app/property/[slug]/page.tsx` → `getPropertyBySlug()` function

### Update Shop Data
Edit: `app/shop/page.tsx` → `getShopProducts()` function

### Add Client Interactivity
Edit the corresponding `*-client.tsx` file (marked with `'use client'`)

### Change Metadata
Each page's `generateMetadata()` or `metadata` export controls SEO tags

## Common Tasks

### Add a new property field
1. Update `getPropertyBySlug()` query to include field
2. Update Property interface in `src/types/property.ts` if needed
3. Use in `property-client.tsx`

### Change homepage sort order
Edit `getHomepageProperties()`:
```typescript
.order("created_at", { ascending: false }); // Change sort here
```

### Increase static property generation
Edit `generateStaticParams()`:
```typescript
.limit(50); // Change limit (currently 50 → more = longer builds)
```

### Fix image not loading
Check:
1. Supabase URL is HTTPS
2. Image URL is in `next.config.mjs` remotePatterns
3. Clear Next.js cache: `rm -rf .next`

## Troubleshooting

### "Cannot find module" errors
Run: `npm install` then `npm run next:build`

### Metadata not appearing
Check page exports `metadata` object or uses `generateMetadata()`

### Data not fetching
1. Verify `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
2. Test query in browser console: `fetch('https://bbuutvozqfzbsnllsiai.supabase.co/rest/v1/...')`

### Slow builds
Reduce `generateStaticParams()` limit to 20-30 properties

## Performance Tips

1. Keep server component queries minimal (only fetch needed fields)
2. Use Suspense for slow components (already done)
3. Cache expensive queries with React Query on client
4. Lazy-load components with React.lazy()

## SEO Benefits

✓ Search bots get full HTML immediately (no JS execution needed)
✓ Proper metadata in `<head>` for social sharing
✓ Faster First Contentful Paint (FCP)
✓ Better Core Web Vitals scores

## Next: Migrate More Pages

To migrate another page (e.g., `/pricing-guide`):

1. Create `app/pricing-guide/page.tsx` (server component)
2. Create `app/pricing-guide-client.tsx` (client component)
3. Add `export const metadata = { ... }` to page
4. Fetch server data if needed
5. Pass data to client component
6. Test locally then deploy

## Reference Files

- `SSR_MIGRATION.md` - Full technical details
- `next.config.mjs` - Next.js configuration
- `app/lib/supabase-server.ts` - Server client
- `.env` - Environment variables (never commit!)

---

**Questions?** See full guide in `SSR_MIGRATION.md`
