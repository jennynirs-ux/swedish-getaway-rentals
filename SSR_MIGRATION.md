# Next.js App Router SSR Migration - Complete

## Overview

This document describes the completed SSR (Server-Side Rendering) migration from client-side only React pages to Next.js App Router pages with proper server-side data fetching and SEO optimizations.

## Migration Status: COMPLETE

### ✓ Completed Tasks

1. **Server-side Supabase Client** (`app/lib/supabase-server.ts`)
   - Created dedicated server client for data fetching
   - Uses environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   - No cookie dependencies - read-only operations suitable for SSR
   - Proper error handling with fallbacks

2. **Homepage SSR** (`app/page.tsx`)
   - Server-side fetching of featured properties
   - Dynamic metadata with proper og:image, twitter cards
   - Server component passes data to client component
   - Full search and filtering capabilities preserved

3. **Property Detail Pages** (`app/property/[slug]/page.tsx`)
   - Server-side property data fetching by slug
   - Dynamic metadata generation with property-specific data
   - og:image from property hero image for rich sharing
   - `generateStaticParams()` for static generation of top 50 properties
   - Legacy slug resolution (villa-hacken, lakehouse-getaway)
   - Full client-side interactivity preserved

4. **Shop Page** (`app/shop/page.tsx`)
   - Server-side product fetching
   - Proper SEO metadata
   - Client-side filtering and search
   - Cart integration maintained

5. **Updated Root Layout** (`app/layout.tsx`)
   - Enhanced metadata with all SEO tags
   - Proper og:image, twitter cards
   - Canonical URL and robots directives
   - Font loading optimized

6. **Next.js Config** (`next.config.mjs`)
   - Configured image domains for Supabase
   - Image format optimization (AVIF, WebP)
   - Proper caching strategies
   - Redirect configuration template

## Architecture

### Server Components
- `app/page.tsx` - Homepage
- `app/property/[slug]/page.tsx` - Property detail
- `app/shop/page.tsx` - Shop listing

### Client Components
- `app/home-client.tsx` - Homepage client wrapper
- `app/property/[slug]/property-client.tsx` - Property detail client wrapper
- `app/shop-client.tsx` - Shop client wrapper

### Server Utilities
- `app/lib/supabase-server.ts` - Supabase server client factory

## Data Flow

```
User Request
    ↓
Next.js Server (app/page.tsx, app/property/[slug]/page.tsx, etc.)
    ↓
Server-side Data Fetch (via supabase-server.ts)
    ↓
Generate Metadata (Dynamic per page)
    ↓
Render Server Component → HTML
    ↓
Hydrate with Client Component (home-client.tsx, property-client.tsx, etc.)
    ↓
Browser receives full HTML + metadata
```

## SEO Features

### Dynamic Metadata
Each page generates dynamic metadata based on fetched data:

**Homepage (`app/page.tsx`)**
- Title: "Nordic Getaways - Premium Nordic Vacation Rentals"
- og:image: Default site image
- Multiple keywords for vacation rentals

**Property Pages (`app/property/[slug]/page.tsx`)**
- Title: "{Property Title} - Nordic Getaways"
- Description: Property description + details (bedrooms, bathrooms, guests)
- og:image: Property's hero_image_url
- Keywords: Property title, location, city
- Structured data compatible

**Shop (`app/shop/page.tsx`)**
- Title: "The Nordic Collection - Nordic Getaways"
- Description: Curated Nordic products
- og:image: Site image

### Static Generation
- Property pages use `generateStaticParams()` to pre-generate top 50 properties
- Reduces server load for popular properties
- Faster page loads for cached pages

### Open Graph & Twitter Cards
All pages include:
- og:type
- og:url
- og:title
- og:description
- og:image (with proper dimensions 1200x630)
- twitter:card (summary_large_image)
- twitter:title
- twitter:description
- twitter:image

## Environment Variables

Required for server-side data fetching:
```
VITE_SUPABASE_URL=https://bbuutvozqfzbsnllsiai.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

These are the same variables used by Vite/client. Next.js automatically prefixes them with `process.env` in the server runtime.

## Performance Optimizations

1. **Image Optimization**
   - Remote patterns configured for Supabase URLs
   - AVIF and WebP format support
   - Automatic responsive sizing

2. **Code Splitting**
   - Server components only ship metadata and initial HTML
   - Client components lazy-loaded
   - Heavy components (Gallery, Amenities) use React Suspense

3. **Caching**
   - Static generation for top properties
   - On-demand ISR (Incremental Static Regeneration) supported
   - Query optimization in server client

4. **Bundle Size**
   - Supabase client only initialized on server
   - Client-only dependencies optimized in next.config

## Migration Path: Existing Routes

Currently, the app/ directory handles only these routes:
- GET `/` (Homepage)
- GET `/property/[slug]` (Property detail)
- GET `/shop` (Shop listing)

All other routes still use the Vite-based React Router system:
- Auth pages
- Admin pages
- Profile pages
- etc.

To migrate additional pages:

1. Create server component in app/routes/
2. Extract data fetching to server side
3. Split into server + client components
4. Add proper metadata export
5. Test thoroughly

## Testing

### Local Development
```bash
npm run next:dev
```

### Production Build
```bash
npm run next:build
npm run next:start
```

### Verify SSR
1. Disable JavaScript in browser DevTools
2. Navigate to homepage, property, or shop pages
3. Content should still render (proof of SSR)
4. Metadata should be in `<head>` tags

### Check Metadata
1. Use browser DevTools → Network → Document
2. Check HTML source for meta tags, og tags
3. Use https://www.opengraphcheck.com/ for og:image validation

## Known Limitations & Future Work

1. **Search Indexing**
   - Property generation limited to top 50 for build performance
   - Consider adding `/property/[slug]` to sitemap.xml
   - May need search integration for dynamic properties

2. **Real-time Updates**
   - Property data cached at build/request time
   - No real-time availability updates in metadata
   - Client component can refresh after hydration

3. **Legacy Route Resolution**
   - `villa-hacken` and `lakehouse-getaway` routes still supported
   - Should be redirected to actual property IDs

4. **Image Caching**
   - Supabase URLs may not have long cache headers
   - Consider CDN for frequently accessed images

## Troubleshooting

### Metadata Not Appearing
- Check that page exports `metadata` object
- Verify no errors in server component
- Check Next.js build output for warnings

### Data Not Fetching
- Verify environment variables set in `.env`
- Check Supabase connection with test query
- Ensure database schema matches queries

### Images Not Loading
- Check image domains in next.config.mjs
- Verify Supabase URLs are HTTPS
- Test image URLs directly in browser

### Build Takes Too Long
- Reduce `generateStaticParams()` results
- Use selective pre-generation
- Consider ISR instead of static generation

## File Reference

Key files created/modified:

```
app/
├── lib/
│   └── supabase-server.ts          (NEW) Server Supabase client
├── page.tsx                         (MODIFIED) Homepage SSR
├── home-client.tsx                  (NEW) Homepage client
├── property/
│   └── [slug]/
│       ├── page.tsx                (MODIFIED) Property SSR
│       └── property-client.tsx      (NEW) Property client
├── shop/
│   └── page.tsx                    (MODIFIED) Shop SSR
├── shop-client.tsx                  (NEW) Shop client
├── layout.tsx                       (MODIFIED) Enhanced metadata
└── providers.tsx                    (UNCHANGED) Client providers

next.config.mjs                      (MODIFIED) Image & config optimizations
SSR_MIGRATION.md                     (NEW) This file
```

## Next Steps

1. Test all three pages in development and production
2. Verify metadata with social media preview tools
3. Monitor Core Web Vitals (CLS, LCP, FID)
4. Consider migrating other pages (Auth, Admin, Profile)
5. Set up proper image caching strategy
6. Add sitemap.xml and robots.txt for SEO

## References

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js generateStaticParams](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
