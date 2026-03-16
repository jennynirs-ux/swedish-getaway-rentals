# SSR Implementation - Code Structure Overview

## Directory Structure

```
app/
├── layout.tsx                          # Root layout with enhanced metadata
├── page.tsx                            # Homepage (SSR) ✓
├── home-client.tsx                     # Homepage client component (NEW)
│
├── property/
│   └── [slug]/
│       ├── page.tsx                   # Property detail (SSR) ✓
│       ├── property-client.tsx         # Property client component (NEW)
│       ├── PropertyPageClient.tsx      # Old client-only (kept for reference)
│       ├── guestbook/page.tsx         # Sub-route
│       └── guide/page.tsx             # Sub-route
│
├── shop/
│   ├── page.tsx                       # Shop listing (SSR) ✓
│   └── [id]/page.tsx                  # Product detail
│
├── lib/
│   └── supabase-server.ts             # Server Supabase client (NEW)
│
└── [other routes]/                     # Still using client-only approach

src/
├── integrations/
│   └── supabase/
│       ├── client.ts                   # Client Supabase (unchanged)
│       └── types.ts                    # Database types (unchanged)
│
├── pages/
│   ├── Index.tsx                       # (Old homepage, now wrapped)
│   ├── PropertyPage.tsx                # (Old prop detail, now wrapped)
│   ├── Shop.tsx                        # (Old shop, now wrapped)
│   └── [other pages]/                  # (Other client-only pages)
│
├── components/
│   └── [all components]                # (Unchanged, reused in clients)
│
└── [other src files]                   # (Unchanged)

next.config.mjs                         # Next.js config (MODIFIED)
vite.config.ts                          # Vite config (UNCHANGED - for dev)
```

## Data Flow Diagram

### Server-Side Flow (SSR)

```
┌─────────────────────────────────────────────────────┐
│ Browser Request: GET / (or /property/[slug], /shop) │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Next.js Server                                      │
│ - Runs app/page.tsx (or other SSR page)             │
│ - Server component is ASYNC                         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ createServerClient() from app/lib/supabase-server   │
│ Uses: VITE_SUPABASE_URL                             │
│ Uses: VITE_SUPABASE_PUBLISHABLE_KEY                 │
│ No auth, no cookies, read-only                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Supabase Query                                      │
│ Example: .from('properties').select(...).eq(...)    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Data Returns as JSON                                │
│ Example: [ { id: '123', title: 'Villa...', ...} ]  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ generateMetadata() runs (if defined)                │
│ Creates <meta>, <og:*>, <twitter:*> tags            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Render to HTML                                      │
│ - Data injected as props to client component        │
│ - generateStaticParams checked for pre-generation   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ Browser receives HTML + JavaScript                  │
│ - Page already visible (no loading spinner)         │
│ - Metadata in <head> (for crawlers)                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ React Hydrates Client Component                     │
│ - HomeClient / PropertyClient / ShopClient          │
│ - Marked with 'use client'                          │
│ - Takes over interactivity                          │
└─────────────────────────────────────────────────────┘
```

## Key Code Examples

### 1. Server Component (app/page.tsx)

```typescript
// This runs on the SERVER
export const metadata = { ... }  // Generates <meta> tags

async function getHomepageProperties() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('properties')
    .select(...)
    .eq('active', true)
  return data || []
}

export default async function HomePage() {
  const properties = await getHomepageProperties()
  // Props passed to client component
  return <HomeClient initialProperties={properties} />
}
```

### 2. Client Component (app/home-client.tsx)

```typescript
'use client'  // Marks this as CLIENT-only

export default function HomeClient({ initialProperties }) {
  const [filters, setFilters] = useState(null)  // Client state
  const [properties] = useState(initialProperties)  // From server

  // All interactive logic here
  const handleSearch = () => { ... }
  const handleFilter = () => { ... }

  return (
    <div>
      {/* Render UI with client-side interactivity */}
    </div>
  )
}
```

### 3. Server Client (app/lib/supabase-server.ts)

```typescript
// This function runs ONLY on the server
export function createServerClient() {
  return createClient<Database>(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )
}

// Usage in server component:
const supabase = createServerClient()
const { data } = await supabase.from('...').select(...)
```

### 4. Dynamic Metadata (app/property/[slug]/page.tsx)

```typescript
export async function generateMetadata({ params }) {
  const property = await getPropertyBySlug(params.slug)

  return {
    title: `${property.title} - Nordic Getaways`,
    description: property.description,
    openGraph: {
      title: property.title,
      description: property.description,
      images: [{
        url: property.hero_image_url,  // Property-specific image
        width: 1200,
        height: 630
      }]
    }
  }
}
```

### 5. Static Generation (app/property/[slug]/page.tsx)

```typescript
export async function generateStaticParams() {
  const supabase = createServerClient()
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('active', true)
    .limit(50)  // Pre-generate top 50

  return properties.map(p => ({ slug: p.id }))
}
```

## Environment Variables

### Required
```
VITE_SUPABASE_URL=https://bbuutvozqfzbsnllsiai.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### How They're Used
- **Client components**: Via `import.meta.env` (Vite)
- **Server components**: Via `process.env` (Node.js)
- Both access same environment variable names

## Component Lifecycle

### Old Flow (Client-Only)
```
Browser
  └─ Loads JS
    └─ React mounts
      └─ useEffect hooks run
        └─ Fetch data from client
          └─ State updates
            └─ Render UI

Time to content: ~2-3 seconds (depends on network)
SEO: No metadata available to crawlers
```

### New Flow (SSR)
```
Browser
  └─ Receives HTML (data already fetched!)
    └─ Metadata in <head> (crawlers happy!)
      └─ Content immediately visible
        └─ React hydrates
          └─ Interactivity attached

Time to content: < 1 second
SEO: Full metadata in HTML
```

## Component Responsibilities

### Server Components (app/page.tsx, app/property/[slug]/page.tsx, app/shop/page.tsx)
- Fetch data from Supabase
- Generate metadata
- Execute async operations
- Pass props to client components
- Handle errors gracefully

### Client Components (home-client.tsx, property-client.tsx, shop-client.tsx)
- All interactive features
- State management (useState, useReducer)
- Event handlers
- Real-time updates after initial render
- Client-side APIs

## Reusable Patterns

### Pattern 1: Server Data + Client Interactivity
```typescript
// page.tsx (Server)
export default async function Page() {
  const data = await fetchData()
  return <Client initialData={data} />
}

// *-client.tsx (Client)
'use client'
export default function Client({ initialData }) {
  const [data, setData] = useState(initialData)
  return <div>{data}</div>
}
```

### Pattern 2: Dynamic Metadata
```typescript
export async function generateMetadata({ params }) {
  const item = await fetchItem(params.id)
  return {
    title: item.title,
    description: item.description,
    openGraph: { images: [item.image] }
  }
}
```

### Pattern 3: Static Pre-generation
```typescript
export async function generateStaticParams() {
  const items = await fetchAllItems()
  return items.map(item => ({ id: item.id }))
}
```

## Testing Each Layer

### Test Server Component
```bash
# Run Next.js dev server
npm run next:dev
# Check Network tab - data already in HTML
# Check console - no fetch() calls during hydration
```

### Test Client Component
```bash
# Disable JavaScript in DevTools
# Refresh page
# Content should still appear
# Metadata visible in page source
```

### Test Build
```bash
npm run next:build
# Check .next/static/chunks for page pre-generation
# Run: npm run next:start
# Test production behavior
```

---

## File Reference

| File | Type | Purpose |
|------|------|---------|
| `app/page.tsx` | Server | Fetch properties, generate metadata |
| `app/home-client.tsx` | Client | Search, filter, render UI |
| `app/property/[slug]/page.tsx` | Server | Fetch property, dynamic metadata, static params |
| `app/property/[slug]/property-client.tsx` | Client | Property UI, interactivity |
| `app/shop/page.tsx` | Server | Fetch products, metadata |
| `app/shop-client.tsx` | Client | Shop UI, filtering, cart |
| `app/lib/supabase-server.ts` | Utility | Server-only Supabase client |
| `next.config.mjs` | Config | Image optimization, redirects |
| `app/layout.tsx` | Server | Root layout, shared metadata |

---

**Last Updated:** 2026-03-16
