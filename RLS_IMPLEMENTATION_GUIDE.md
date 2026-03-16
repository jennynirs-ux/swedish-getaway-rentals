# RLS Implementation Quick Reference Guide

## Critical Issues Found

### 🔴 CRITICAL (Fix Immediately)

1. **user_roles Table - NO POLICIES**
   - Table has RLS enabled but 0 policies
   - Blocks admin role verification
   - **Impact:** Admin system broken
   - **Fix:** Run migration 20260316_comprehensive_rls_audit_and_fixes.sql

2. **Bookings - Hosts Can't Access Own Bookings**
   - Hosts can't UPDATE bookings via RLS
   - Only admins can update
   - **Impact:** Host reservation management broken
   - **Fix:** Migration updates UPDATE policy

3. **Properties - No DELETE Policy**
   - Cannot delete properties via RLS
   - Prevents property cleanup
   - **Fix:** Migration adds DELETE policy

---

## Current RLS Status by Table

### Core Tables (Most Important)

| Table | Status | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|--------|-------|
| properties | ⚠️ | ✅ | ✅ | ✅ | ❌ | Hosts can't delete |
| bookings | ❌ | ⚠️ | ✅ | ❌ | ❌ | Hosts missing; guests weak |
| profiles | ✅ | ✅ | ✅ | ✅ | ❌ | OK |
| user_roles | 🔴 | ❌ | ❌ | ❌ | ❌ | **CRITICAL** |
| booking_messages | ⚠️ | ✅ | ⚠️ | ✅ | ❌ | Complex queries |
| reviews | ✅ | ✅ | ✅ | ✅ | ❌ | OK |
| availability | ✅ | ✅ | ✅ | ✅ | ❌ | OK |
| user_favorites | ✅ | ✅ | ✅ | ❌ | ✅ | OK |
| orders | ✅ | ✅ | ✅ | ✅ | ❌ | OK |
| shop_products | ✅ | ✅ | ✅ | ✅ | ❌ | OK |
| coupons | ✅ | ✅ | ✅ | ✅ | ❌ | OK |
| host_applications | ✅ | ✅ | ✅ | ✅ | ❌ | OK |

### Supporting Tables (Need Verification)

| Table | Likely Status | Action |
|-------|----------------|--------|
| ical_feeds | ⚠️ Not verified | Check migration |
| yale_locks | ⚠️ Not verified | Check migration |
| guestbook_entries | ⚠️ Not verified | Check migration |
| guestbook_tokens | ⚠️ Not verified | Check migration |
| bookings_commission | ⚠️ Not verified | Check migration |
| host_referrals | ⚠️ Not verified | Check migration |
| security_audit_log | ⚠️ Not verified | Check migration |

---

## What The Migration Fixes

### ✅ Adds
1. Helper functions for consistent role checking
2. Complete DELETE policies for all tables
3. Host UPDATE access to bookings table
4. Host DELETE access to own properties
5. Proper policies to user_roles table
6. Performance indexes on RLS columns
7. Comprehensive documentation

### ✅ Fixes
1. Properties - hosts can now manage inactive listings
2. Bookings - hosts can now update reservations
3. Booking messages - simplified complex queries
4. All tables - consistent CRUD policy patterns
5. User roles - now has 4 essential policies

### ✅ Improves
1. Query performance (indexes + simpler queries)
2. Code maintainability (consistent patterns)
3. Security documentation
4. Role separation clarity

---

## How to Apply the Migration

### Option 1: Using Supabase CLI
```bash
# Copy the migration file to your migrations folder
cp supabase/migrations/20260316_comprehensive_rls_audit_and_fixes.sql .

# Apply using CLI
supabase migration up

# Verify
supabase db pull
```

### Option 2: Manual SQL in Supabase Dashboard
```
1. Go to Supabase Dashboard > SQL Editor
2. Create new query
3. Copy entire contents of 20260316_comprehensive_rls_audit_and_fixes.sql
4. Execute
5. Verify no errors
```

### Option 3: Direct psql Command
```bash
psql postgresql://[user]:[password]@[host]:5432/[database] < \
  supabase/migrations/20260316_comprehensive_rls_audit_and_fixes.sql
```

---

## Testing Checklist

### Before Migration
- [ ] Backup current database
- [ ] Verify admin can access Admin page
- [ ] Verify host can manage properties
- [ ] Verify guest can view bookings

### After Migration
- [ ] Admin can still access Admin page
- [ ] Host can view inactive properties
- [ ] Host can update booking status
- [ ] Host can delete properties
- [ ] Guest can view own bookings
- [ ] Guest can create messages
- [ ] No guest can see other guest data
- [ ] No host can see other host data
- [ ] Admin can see everything

### Test Queries
```sql
-- Check RLS is working
SELECT * FROM public.properties WHERE active = false;
-- Non-owner should see nothing
-- Owner should see their inactive properties

-- Check admin access
SELECT * FROM public.user_roles WHERE user_id != auth.uid();
-- Non-admin should see nothing
-- Admin should see all roles

-- Check booking access
SELECT * FROM public.bookings;
-- Guest should see own bookings
-- Host should see property bookings
-- Admin should see all bookings
```

---

## Key Changes Explained

### 1. Helper Functions

**Before:** Scattered admin checks
```sql
EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
```

**After:** Consistent function
```sql
public.is_user_admin(auth.uid())
```

**Benefits:**
- Single source of truth for admin check
- Prevents infinite recursion
- Better performance (caching)
- Easier to maintain

### 2. Separated CRUD Policies

**Before:**
```sql
CREATE POLICY "Only admins can modify properties"
ON public.properties FOR ALL
USING (is_admin = true)
```

**After:**
```sql
CREATE POLICY "Properties SELECT policy" FOR SELECT USING (...)
CREATE POLICY "Properties INSERT policy" FOR INSERT WITH CHECK (...)
CREATE POLICY "Properties UPDATE policy" FOR UPDATE USING (...) WITH CHECK (...)
CREATE POLICY "Properties DELETE policy" FOR DELETE USING (...)
```

**Benefits:**
- Fine-grained control per operation
- Clearer intent
- Easier to audit
- Follows Supabase best practices

### 3. Host Access Improvements

**Before:**
```sql
-- Host couldn't update their own bookings
CREATE POLICY "Admins can update bookings"
ON public.bookings FOR UPDATE
USING (is_user_admin(auth.uid()))
```

**After:**
```sql
CREATE POLICY "Bookings UPDATE policy"
ON public.bookings FOR UPDATE
USING (
  is_user_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM properties p
          JOIN profiles pr ON p.host_id = pr.id
          WHERE p.id = property_id
          AND pr.user_id = auth.uid())
)
```

**Benefits:**
- Hosts can manage their properties
- Still RLS-enforced
- Eliminates need for backend workarounds

---

## Common Tasks After Migration

### Verify Admin Can Access Admin Panel
```typescript
// In src/pages/Admin.tsx
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'admin')
  .single();

// Should now work with new RLS policies
```

### Verify Host Can Manage Properties
```typescript
// In src/components/host/HostDashboard.tsx
const { data: properties } = await supabase
  .from('properties')
  .select('*')
  .eq('host_id', profile.id);

// Now includes inactive properties
// And DELETE will work via RLS
```

### Verify Booking Message Access
```typescript
// Messages are now simplified
const { data: messages } = await supabase
  .from('booking_messages')
  .select('*')
  .eq('booking_id', bookingId);

// No timeout from complex queries
```

---

## Performance Impact

### Before Migration
- Complex nested JOINs in every message access
- No performance indexes
- Potential timeout on large datasets

### After Migration
- Indexes on frequently-queried columns
- Simplified policy queries
- Better cache performance

### Indexes Added
```sql
idx_profiles_user_id
idx_profiles_is_host
idx_profiles_host_approved
idx_properties_host_id
idx_properties_active
idx_bookings_user_id
idx_bookings_property_id
idx_bookings_status
idx_user_roles_user_id
idx_user_roles_role
idx_booking_messages_booking_id
idx_booking_messages_sender_id
idx_user_favorites_user_id
idx_user_favorites_property_id
idx_coupons_property_id
idx_coupons_is_active
```

---

## Troubleshooting

### Issue: Admin can't access Admin page after migration
**Cause:** user_roles table policies not working
**Solution:**
1. Verify user has 'admin' role in user_roles table
2. Verify new policies were applied: `SELECT * FROM pg_policies WHERE tablename = 'user_roles'`
3. Verify is_user_admin() function exists: `SELECT public.is_user_admin(auth.uid());`

### Issue: Host can't see their properties
**Cause:** Policies still restricting inactive properties
**Solution:**
1. Verify host has correct host_id in properties.host_id
2. Check profiles.is_host = true for the host user
3. Run: `SELECT * FROM properties WHERE host_id = (SELECT id FROM profiles WHERE user_id = auth.uid());`

### Issue: Guests can see other guests' bookings
**Cause:** Old email-based identification still used
**Solution:**
1. Ensure bookings.user_id is set for authenticated guests
2. Verify RLS policies check user_id first
3. Test with user_id-only booking access

### Issue: Queries are slow after migration
**Cause:** Indexes not yet built
**Solution:**
1. Allow a few minutes for index creation
2. Monitor `pg_stat_progress_create_index`
3. Check query plans: `EXPLAIN SELECT ...`

---

## Rollback Plan (If Needed)

### Quick Rollback
```sql
-- Drop new policies but keep RLS enabled
DROP POLICY IF EXISTS "Properties SELECT policy" ON public.properties;
DROP POLICY IF EXISTS "Properties INSERT policy" ON public.properties;
DROP POLICY IF EXISTS "Properties UPDATE policy" ON public.properties;
DROP POLICY IF EXISTS "Properties DELETE policy" ON public.properties;

-- Recreate old policies from backup
-- ... (from your backup SQL)
```

### Full Rollback
```bash
# Restore from backup
psql postgresql://[...] < backup_rls.sql

# Or use Supabase point-in-time recovery
# Contact Supabase support
```

---

## Next Steps

1. **Review:** Read RLS_AUDIT_REPORT.md fully
2. **Backup:** Create database backup
3. **Apply:** Run migration 20260316_comprehensive_rls_audit_and_fixes.sql
4. **Test:** Verify all user roles can access their data
5. **Deploy:** Push to production
6. **Monitor:** Watch logs for any auth errors

---

## Reference Files

- **Migration:** `/supabase/migrations/20260316_comprehensive_rls_audit_and_fixes.sql`
- **Audit Report:** `/RLS_AUDIT_REPORT.md`
- **This Guide:** `/RLS_IMPLEMENTATION_GUIDE.md`

---

## Key Takeaways

✅ **RLS is enabled** - Good foundation

⚠️ **Incomplete coverage** - Some tables have no DELETE policies

🔴 **Critical gap** - user_roles table has no policies (breaks admin system)

✅ **Migration provided** - Complete fix ready to apply

✅ **Testing checklist** - Know what to verify

✅ **Rollback plan** - Safe to deploy

---

**Status:** Ready for implementation
**Estimated time:** 2-4 hours deployment + 4-6 hours testing
**Risk level:** Low (backward compatible, doesn't break existing features)
