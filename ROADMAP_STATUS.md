# Nordic Getaways — Roadmap Status

Last updated: 2026-04-19

## Strategic Context

Nordic Getaways is pivoting from a single-brand booking site into a
**multi-host rental management hub** — combining a marketplace, PMS, and
financial tools into one platform uniquely positioned for the Nordic market.

The competitive moat is **Swedish tax integration + financial tools** that
no global PMS (Guesty, Hostaway, Lodgify, Hospitable) will build for a
small Nordic market.

---

## Phase 2 — Financial Differentiator ✅ COMPLETE

| Step | Feature | Commit |
|------|---------|--------|
| 1 | Expense tracking (CRUD, CSV export) | `8dab3ce` |
| 2 | Revenue by Channel (Airbnb / Booking / Direct) | `80e3f7b` |
| 3 | Profitability view (Revenue − Expenses) | `80e3f7b` |
| 4 | Swedish tax report (Skatteverket schablonavdrag) | `fe04825` |
| — | Fix: correct Skatteverket formula + CORS + fee rate | `1d7790f` |
| — | Refactor: shared components + testable tax lib | `43524b0` |

### SQL migrations needed
```sql
-- From 20260402_expenses_table.sql
-- From 20260402_booking_source.sql
```

### Edge function deployment
```bash
supabase functions deploy generate-tax-report
```

---

## Phase 3 — Multi-Host Hub ✅ COMPLETE

| Step | Feature | Commit |
|------|---------|--------|
| 1 | Host Analytics (Occupancy, ADR, Lead Time) | `839e597` |
| 2 | Property Creation Wizard (4-step guided) | `bc170f4` |
| 3 | Host Onboarding Checklist (6 steps, progress bar) | `ec471da` |
| 4 | Smart Pricing Suggestions (market + own history) | `1d2ee22` |

---

## Phase 4 — Channel Manager Light ⚠️ PARTIAL

| Step | Feature | Status |
|------|---------|--------|
| 1 | Two-way Airbnb API sync | **Deferred** — needs Airbnb Partner API approval |
| 2 | Booking.com API integration | **Deferred** — needs Connectivity Provider contract |
| 3 | Unified inbox with channel filters | ✅ `21645f2` |
| 4 | Message templates with triggers | ✅ `a584d2b` |

### Why 1 & 2 are deferred
These require **business agreements** outside the codebase:

- **Airbnb Host API** — Must be an approved Airbnb Partner. Application process
  takes 2-6 months and requires demonstrating product-market fit, a minimum
  number of managed properties, and API certification. Until then, iCal
  sync (already implemented) is the only option.

- **Booking.com Connectivity Partner Programme** — Requires contract with
  Booking.com, onboarding, and XML API certification. Also 2-6 month process.

Both should be initiated as business tasks in parallel with software work.

### SQL migration for templates
```sql
-- From 20260419_host_message_templates.sql
```

---

## Phase 5 — Marketplace Growth ⚠️ PARTIAL

| Step | Feature | Status |
|------|---------|--------|
| 1 | SEO-optimized property pages (Next.js migration) | **Deferred** — Lovable uses Vite; risk of breaking deployment |
| 2 | Guest reviews + submission | ✅ `8958a55` |
| 3 | Search by region/experience type | ✅ `1035619` |
| 4 | Mobile app for hosts | **Deferred** — separate React Native project |

### Why 1 is deferred
The project has had **multiple failed Next.js migrations** historically —
Lovable's build system is tightly coupled to Vite. Moving to Next.js for
SSR/SEO is a significant undertaking that needs dedicated attention and
should happen in its own major release, not as a sub-step. The existing
Vite app already renders meta tags client-side via `useSeoMeta`; SEO can be
improved incrementally without a framework change (prerender, static export,
or selective SSG).

### Why 4 is deferred
A React Native mobile app is a whole separate project with its own build
chain, app store accounts (Apple Developer $99/year + Google Play $25), and
mobile-specific UX design. Best approached as a follow-up project once the
web platform is stable and has active hosts asking for it.

---

## Components Ready for Integration

These Phase 5 components exist but aren't wired into pages yet (low-risk
integration, can happen incrementally):

### Reviews (needs PropertyPage integration)
```tsx
import PropertyReviewsList from '@/components/reviews/PropertyReviewsList';
// In PropertyPage.tsx, somewhere below description:
<PropertyReviewsList propertyId={property.id} />
```

And for the post-stay flow (e.g., in BookingSuccess.tsx or a post-checkout email link):
```tsx
import LeaveReviewDialog from '@/components/reviews/LeaveReviewDialog';
<LeaveReviewDialog
  open={reviewOpen}
  onOpenChange={setReviewOpen}
  bookingId={booking.id}
  propertyId={booking.property_id}
  propertyTitle={property.title}
  hostProfileId={property.host_id}
/>
```

### Search filters (needs Index page integration)
```tsx
import RegionFilter, { matchesRegion } from '@/components/search/RegionFilter';
import ExperienceTypeFilter, { matchesExperienceType } from '@/components/search/ExperienceTypeFilter';

// State:
const [region, setRegion] = useState(null);
const [experience, setExperience] = useState(null);

// Filter properties:
const filtered = properties.filter((p) =>
  (!region || matchesRegion(p, region)) &&
  (!experience || matchesExperienceType(p, experience))
);
```

---

## Known Follow-Up Work (Smaller Tasks)

1. **Automated template dispatch** — The message templates table exists and
   UI works, but automatic sending needs a scheduled edge function + pg_cron
   entry. Template system is a useful config tool even without this.

2. **Receipt upload for expenses** — The `expenses.receipt_url` column exists
   but no upload flow. Straightforward Supabase Storage integration.

3. **Multi-currency support** — Currency is hardcoded to SEK in many places
   (expenses, tax report). For Norwegian/Finnish host expansion, plumb through
   the `currency` field that already exists on properties.

4. **Test framework** — Vitest was removed in an earlier revert. The pure
   `swedishTax.ts` module has JSDoc-documented test cases ready to execute
   when vitest is reintroduced.

5. **Code-review items parked from earlier reviews** — Year dropdown is
   hardcoded to 2024-2026 (should derive from current year), PDF exporter
   uses ASCII for Swedish text (embed a Unicode font for proper diacritics),
   SQL aggregate RPCs for large portfolios.

---

## Commits Summary (Phase 2–5)

```
1035619 feat: region + experience type filters (Phase 5 Step 3)
8958a55 feat: guest-facing reviews display + submission (Phase 5 Step 2)
a584d2b feat: message templates + triggers (Phase 4 Step 4)
21645f2 feat: unified inbox with channel filters (Phase 4 Step 3)
1d2ee22 feat: smart pricing suggestions (Phase 3 Step 4)
ec471da feat: host onboarding checklist (Phase 3 Step 3)
bc170f4 feat: guided property creation wizard (Phase 3 Step 2)
839e597 feat: add Analytics tab to host & admin dashboards (Phase 3 Step 1)
43524b0 refactor: extract shared financial components + testable tax lib
1d7790f fix: correct Skatteverket formula, centralize fee rate, secure CORS
fe04825 feat: add Swedish tax report with Skatteverket schablonavdrag
80e3f7b feat: add revenue by channel + profitability views
8dab3ce feat: add expense tracking to host & admin dashboards
```
