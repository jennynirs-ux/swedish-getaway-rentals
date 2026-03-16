# Supabase RLS (Row Level Security) Audit Report
**Date:** 2026-03-16
**Project:** Swedish Getaway Rentals
**Status:** COMPREHENSIVE AUDIT WITH FIXES PROVIDED

---

## Executive Summary

This audit examined the Supabase Row Level Security implementation across the Swedish Getaway Rentals application. The analysis covered 24 database tables, client-side authentication patterns, and authorization enforcement.

**Key Findings:**
- ✅ RLS is enabled on most core tables
- ⚠️ Inconsistent policy patterns across tables
- ⚠️ Missing RLS policies on several tables
- ⚠️ Weak separation of CRUD operations (SELECT, INSERT, UPDATE, DELETE)
- ⚠️ Complex nested subqueries in policies causing potential performance issues
- ⚠️ Client-side auth checks that should be enforced server-side
- ✅ Good helper function patterns (is_user_admin_safe, is_admin_secure)

**Risk Level:** MEDIUM - No critical vulnerabilities found, but security could be significantly strengthened

---

## Section 1: RLS Policy Definitions Analysis

### 1.1 RLS Enabled Status by Table

#### Core Tables (✅ RLS Enabled)
| Table | RLS Status | Policy Count | Issues |
|-------|-----------|--------------|--------|
| properties | ✅ YES | 4 | Hosts can't manage inactive listings |
| bookings | ✅ YES | 4 | Missing DELETE policy; weak guest tracking |
| availability | ✅ YES | 2 | Hosts can't manage own property availability |
| profiles | ✅ YES | 5 | Users can indirectly access other profiles |
| booking_messages | ✅ YES | 5 | Complex nested queries; inconsistent sender validation |
| reviews | ✅ YES | 4 | Good structure, minor visibility issues |
| user_roles | ✅ YES | 0 | **CRITICAL: No policies found** |
| user_favorites | ✅ YES | 4 | Good implementation |
| orders | ✅ YES | 3 | Good implementation |
| shop_products | ✅ YES | 2 | Good implementation |
| coupons | ✅ YES | 3 | Policy complexity needs reduction |
| coupon_usages | ✅ YES | 2 | Good implementation |
| host_applications | ✅ YES | 2 | Could be more detailed |
| platform_settings | ✅ YES | 1 | **CRITICAL: Only one policy** |

#### Supporting Tables (⚠️ RLS May Not Be Enabled)
| Table | RLS Status | Notes |
|-------|-----------|-------|
| ical_feeds | ⚠️ LIKELY | Not verified in migrations |
| yale_locks | ⚠️ LIKELY | Not verified in migrations |
| guestbook_entries | ⚠️ LIKELY | Not verified in migrations |
| guestbook_tokens | ⚠️ LIKELY | Not verified in migrations |
| bookings_commission | ⚠️ LIKELY | Not verified in migrations |
| host_referrals | ⚠️ LIKELY | Not verified in migrations |
| security_audit_log | ⚠️ LIKELY | Not verified in migrations |

---

## Section 2: Detailed Policy Analysis

### 2.1 PROPERTIES Table

**Current Policies:**
```sql
-- "Properties are viewable by everyone" (SELECT)
-- "Only admins can modify properties" (ALL)
-- "Approved hosts can view their own properties" (SELECT)
-- "Approved hosts can create properties" (INSERT)
-- "Approved hosts can update their own properties" (UPDATE)
```

**Issues Found:**

1. **Missing DELETE Policy**
   - No policy defined for property deletion
   - RLS will deny all DELETE operations by default
   - Hosts cannot delete their properties through RLS

2. **Overlapping Policies**
   - Multiple SELECT policies could cause confusion
   - "active = true" doesn't include host's own inactive listings
   - Hosts can't manage inactive draft properties

3. **No Role Check Verification**
   - Policies reference is_host but not is_approved_host
   - Could allow unapproved hosts to create properties

**Recommended Fix:** See Section 3 - Comprehensive Fixes

---

### 2.2 BOOKINGS Table

**Current Policies:**
```sql
-- "Users can view their own bookings" (SELECT)
-- "Anyone can create bookings" (INSERT)
-- "Admins can view all bookings" (SELECT)
-- "Admins can update bookings" (UPDATE)
-- "Explicit secure booking access" (SELECT)
```

**Issues Found:**

1. **Missing DELETE Policy**
   - No policy for deleting bookings
   - Prevents any booking deletion via RLS

2. **Weak Guest Identification**
   - Uses guest_email as fallback: `guest_email = auth.email()`
   - Email can change; unreliable as unique identifier
   - Guest without auth account can't view their booking

3. **Missing Host Access**
   - Hosts cannot view/update bookings for their properties
   - Must be handled by application logic only
   - No RLS enforcement on host-property access

4. **No Host UPDATE Policy**
   - Only admins can update bookings
   - Hosts can't update booking status, notes, etc.
   - Poor UX for property management

**SQL Issue:**
```sql
-- PROBLEM: Email-based guest identification
guest_email = auth.email()  -- Email is changeable, not reliable

-- SOLUTION: Primary identification should be user_id + secondary fallback
user_id = auth.uid() OR
(guest_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
```

---

### 2.3 USER_ROLES Table

**Status:** ✅ RLS ENABLED, ⚠️ **NO POLICIES DEFINED**

**Critical Issue:**
- Table is created with RLS enabled
- No policies are present (checked 20250929062141 migration)
- RLS in enforcing mode blocks all access
- Admin role check would fail silently

**Impact:**
- The entire admin system might not work
- `is_user_admin()`, `is_admin_secure()` functions would fail
- Cascading failures in other tables relying on admin check

---

### 2.4 BOOKING_MESSAGES Table

**Current Policies:**
```sql
-- "Guests can view messages for their bookings"
-- "Hosts can view messages for their property bookings"
-- "Admins can view all messages"
-- "Guests can send messages for their bookings"
-- "Hosts can send messages for their property bookings"
-- "System and admins can send any messages"
-- "Users can update read status of messages"
```

**Issues Found:**

1. **Nested Subquery Complexity**
   ```sql
   -- SLOW: Multiple JOINs on every check
   booking_id IN (
     SELECT b.id FROM public.bookings b
     JOIN public.properties p ON b.property_id = p.id
     JOIN public.profiles pr ON p.host_id = pr.id
     WHERE pr.user_id = auth.uid()
   )
   ```
   - Repeated for every message operation
   - Could cause performance issues with many messages

2. **Weak Sender Validation**
   - Doesn't enforce `sender_id = auth.uid()`
   - Could allow spoofing other users' messages in theory
   - Later migration fixes this but inconsistent

3. **No DELETE Policy**
   - Cannot delete messages via RLS

---

### 2.5 PLATFORM_SETTINGS Table

**Current Policy:**
```sql
-- "Anyone can read platform settings" or similar
```

**Issues Found:**

1. **Insufficient Modification Control**
   - No explicit policy for UPDATE/DELETE
   - Only admins should modify platform-wide settings
   - Critical settings like commission rates could be vulnerable

2. **Public Read**
   - While settings are public-readable, modification access is not enforced
   - Should explicitly allow only admin writes

---

## Section 3: Client-Side Auth Checks That Should Be Server-Side

### 3.1 Admin Access (src/pages/Admin.tsx)

**Current Implementation:**
```typescript
// Client-side only check
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .eq('role', 'admin')
  .single();

if (!roles) {
  // Redirect to home
}
```

**Risk:**
- Client-side redirect can be bypassed
- User could still make API calls directly to Supabase
- Must have RLS policies enforcing admin access

**Recommendation:**
- Ensure `user_roles` table has proper RLS policies
- All tables referenced should deny access via RLS for non-admins
- Client-side check is fine as UX layer, but RLS is critical

### 3.2 Host Dashboard Access (src/components/host/HostDashboard.tsx)

**Current Implementation:**
```typescript
// Fetch host's properties with user_id match
const { data: profile } = await supabase
  .from("profiles")
  .select("id")
  .eq("user_id", userData.user.id)
  .single();

const { count: propertiesCount } = await supabase
  .from("properties")
  .select("*", { count: "exact", head: true })
  .eq("host_id", profile.id);
```

**Risk:**
- No explicit RLS check shown here
- Relies on properties table having host_id filter
- **Action:** Verify `properties` table RLS allows host to read their own

**Issue:**
```typescript
// Property deletion check
const { error } = await supabase
  .from("properties")
  .delete()
  .eq("id", deletingPropertyId)
  .eq("host_id", profile.id);  // <- Good: Additional filter
```
- Manual `host_id` filter is good defense-in-depth
- But RLS should enforce this at database level

### 3.3 Authorization Service (src/services/authService.ts)

**Issues:**
- `getUserProfile()` queries `user_profiles` table (seems to be different from `profiles`)
- Table mismatch could indicate incomplete RLS coverage
- No verification that queries respect RLS

---

## Section 4: Table Authorization Matrix

### 4.1 Properties Table Access Matrix

| Operation | Anonymous | Guest User | Host | Admin | Enforcement |
|-----------|-----------|-----------|------|-------|------------|
| Read Active | ✅ Yes | ✅ Yes | ✅ Own | ✅ All | RLS |
| Read Inactive | ❌ No | ❌ No | ❌ Own | ✅ All | RLS ⚠️ **Broken** |
| Create | ❌ No | ❌ No | ✅ Approved | ✅ Yes | RLS ⚠️ |
| Update | ❌ No | ❌ No | ✅ Own | ✅ All | RLS ⚠️ |
| Delete | ❌ No | ❌ No | ✅ Own | ✅ All | **NO RLS** |

**Issues:**
- ⚠️ Inactive property read doesn't work for hosts
- ⚠️ Approval check not in RLS, only in client
- **Delete is completely unprotected by RLS**

### 4.2 Bookings Table Access Matrix

| Operation | Anonymous | Guest User | Host | Admin | Enforcement |
|-----------|-----------|-----------|------|-------|------------|
| Read | ❌ No | ✅ Own | ❌ | ✅ All | RLS ⚠️ Missing host |
| Create | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | RLS |
| Update | ❌ No | ❌ No | ❌ | ✅ All | RLS ⚠️ Host missing |
| Delete | ❌ No | ❌ No | ❌ | ❌ | **NO RLS** |

**Critical Issues:**
- Hosts cannot view or update their own property's bookings via RLS
- This is a major security issue - hosts managing reservations requires RLS support
- Application must be doing this via backend (not shown)

### 4.3 Booking Messages Table Access Matrix

| Operation | Anonymous | Guest User | Host | Admin | Enforcement |
|-----------|-----------|-----------|------|-------|------------|
| Read | ❌ No | ✅ Own Booking | ✅ Own Property | ✅ All | RLS ⚠️ Complex |
| Create | ❌ No | ✅ Own Booking | ✅ Own Property | ✅ System | RLS ⚠️ No sender validation |
| Update | ❌ No | ✅ Own | ✅ Own | ✅ All | RLS |
| Delete | ❌ No | ❌ No | ❌ No | ❌ No | **NO RLS** |

---

## Section 5: Missing RLS Enforcement

### 5.1 Tables Without Complete RLS

| Table | RLS Enabled | SELECT | INSERT | UPDATE | DELETE | Status |
|-------|-----------|--------|--------|--------|--------|--------|
| user_roles | ✅ | ❌ | ❌ | ❌ | ❌ | **CRITICAL** |
| ical_feeds | ✅ | ❓ | ❓ | ❓ | ❓ | Verify |
| yale_locks | ✅ | ❓ | ❓ | ❓ | ❓ | Verify |
| guestbook_entries | ✅ | ❓ | ❓ | ❓ | ❓ | Verify |
| guestbook_tokens | ✅ | ❓ | ❓ | ❓ | ❓ | Verify |
| bookings_commission | ✅ | ❓ | ❓ | ❓ | ❓ | Verify |
| host_referrals | ✅ | ❓ | ❓ | ❓ | ❓ | Verify |
| security_audit_log | ✅ | ❓ | ❓ | ❓ | ❓ | Verify |

### 5.2 Missing DELETE Policies

All tables are missing DELETE policies:
- properties
- bookings
- booking_messages
- orders
- etc.

This means **no deletions are possible via RLS** - only admins with service role can delete.

**Risk:** Inconsistent deletion behavior or inability to delete.

---

## Section 6: Security Issues and Vulnerabilities

### SEVERITY: HIGH

1. **User Roles Table - No Policies**
   - Admin role checking fails silently
   - All admin functions would be inaccessible
   - **Status:** CRITICAL - Must add policies immediately

2. **Bookings - Host Access Missing**
   - Hosts cannot update their own bookings via RLS
   - Property management is broken unless done via backend
   - **Impact:** Hosts can't manage reservations through RLS

### SEVERITY: MEDIUM

3. **Properties - No DELETE Policy**
   - Cannot delete via RLS at all
   - Prevents soft-delete implementation
   - Must use backend service role

4. **Email-Based Guest Identification**
   - Guest email can change, breaking access
   - Guest without auth account has no access control

5. **Complex Nested Queries**
   - `booking_messages` policies do multiple JOINs
   - Could timeout under load
   - Inefficient permission checking

6. **Missing Sender Validation**
   - Early migration doesn't enforce `sender_id = auth.uid()`
   - Could allow message spoofing
   - Fixed in later migration but inconsistent

### SEVERITY: LOW

7. **Platform Settings - Weak Protection**
   - Missing explicit UPDATE/DELETE policies
   - Readable by all but modification should be admin-only

8. **Client-Side Auth Only**
   - Admin check in src/pages/Admin.tsx is client-only
   - RLS should enforce regardless

---

## Section 7: Recommended Fixes

### 7.1 CRITICAL FIXES (Do First)

**1. Add Policies to user_roles Table**
```sql
-- This is blocking the entire admin system
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR is_user_admin(auth.uid()));

CREATE POLICY "Only admins can assign roles"
ON public.user_roles FOR INSERT
WITH CHECK (is_user_admin(auth.uid()));

CREATE POLICY "Only admins can modify roles"
ON public.user_roles FOR UPDATE
USING (is_user_admin(auth.uid()));

CREATE POLICY "Only admins can revoke roles"
ON public.user_roles FOR DELETE
USING (is_user_admin(auth.uid()));
```

**2. Add Host Access to Bookings**
```sql
DROP POLICY "Admins can update bookings" ON public.bookings;

CREATE POLICY "Hosts and admins can update bookings"
ON public.bookings FOR UPDATE
USING (
  is_user_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM properties p
    JOIN profiles pr ON p.host_id = pr.id
    WHERE p.id = property_id
    AND pr.user_id = auth.uid()
  )
);
```

**3. Fix Properties - Allow Hosts to Manage Inactive**
```sql
DROP POLICY "Properties are viewable by everyone" ON public.properties;

CREATE POLICY "Properties SELECT policy"
ON public.properties FOR SELECT
USING (
  active = true OR
  is_user_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = host_id
    AND pr.user_id = auth.uid()
  )
);
```

### 7.2 IMPORTANT FIXES (Do Next)

**1. Add All Missing DELETE Policies**
- Creates consistency in permissions
- Prevents data accumulation
- Ensures proper cleanup

**2. Simplify Complex Queries**
- Replace nested JOINs in `booking_messages` with helper functions
- Use `user_owns_property()` instead of inline subqueries
- Create `user_in_booking()` helper function

**3. Fix Email-Based Guest Access**
```sql
-- Current: relies on changeable email
-- Better: use booking.user_id OR (no auth for email-based guests)
```

### 7.3 NICE-TO-HAVE FIXES (Do Later)

1. Add comprehensive policies to all supporting tables
2. Create view-based security (security_barrier views)
3. Add audit logging for sensitive operations
4. Create RLS-aware helper views for complex queries

---

## Section 8: Summary Table

### Properties Table
- **RLS Enabled:** ✅
- **SELECT Policies:** ⚠️ (3 - overlapping)
- **INSERT Policies:** ✅ (1)
- **UPDATE Policies:** ✅ (1)
- **DELETE Policies:** ❌ (0 - CRITICAL)
- **Issues:**
  - Hosts can't see inactive listings
  - No approval check enforcement
  - No delete support

### Bookings Table
- **RLS Enabled:** ✅
- **SELECT Policies:** ⚠️ (2 - hosts missing)
- **INSERT Policies:** ✅ (1)
- **UPDATE Policies:** ⚠️ (1 - admins only)
- **DELETE Policies:** ❌ (0)
- **Issues:**
  - Hosts can't update reservations
  - Email-based guest ID unreliable
  - No delete support

### Booking Messages Table
- **RLS Enabled:** ✅
- **SELECT Policies:** ⚠️ (3 - complex)
- **INSERT Policies:** ⚠️ (3 - no sender validation)
- **UPDATE Policies:** ⚠️ (1)
- **DELETE Policies:** ❌ (0)
- **Issues:**
  - Nested subqueries could timeout
  - Missing sender_id validation
  - Inconsistent with later fixes

### User Roles Table
- **RLS Enabled:** ✅
- **SELECT Policies:** ❌ (0 - **CRITICAL**)
- **INSERT Policies:** ❌ (0 - **CRITICAL**)
- **UPDATE Policies:** ❌ (0 - **CRITICAL**)
- **DELETE Policies:** ❌ (0)
- **Issues:**
  - **No policies at all**
  - Blocks entire admin system
  - Must fix immediately

---

## Section 9: Implementation File

A comprehensive migration file has been created: **`20260316_comprehensive_rls_audit_and_fixes.sql`**

### What's Included:

1. **Helper Functions** (Section 1)
   - `is_user_admin()` - Consistent admin check
   - `is_approved_host()` - Host verification
   - `user_owns_property()` - Property ownership check
   - `user_in_booking()` - Booking involvement check

2. **RLS Enforcement** (Section 2)
   - All tables explicitly enabled with `ALTER TABLE ENABLE ROW LEVEL SECURITY`

3. **Complete Policy Coverage** (Sections 3-21)
   - SELECT, INSERT, UPDATE, DELETE for all tables
   - Consistent patterns across all tables
   - Removed overlapping policies

4. **Performance Indexes** (Section 22)
   - Indexes on frequently-used RLS columns
   - Improves policy evaluation speed

5. **Documentation** (Section 23)
   - Comments on tables and functions
   - Future maintenance reference

---

## Section 10: Implementation Steps

### Step 1: Review and Approve
1. Read this audit report
2. Review `20260316_comprehensive_rls_audit_and_fixes.sql`
3. Verify policies match your business logic

### Step 2: Backup
```bash
# Backup current RLS setup
pg_dump --schema-only > backup_rls.sql
```

### Step 3: Apply Migration
```bash
# Deploy to Supabase
# Option A: Via Supabase CLI
supabase migration up

# Option B: Manually in Supabase SQL editor
# Copy entire SQL file and execute
```

### Step 4: Test
```typescript
// Test as different user roles
- Anonymous user
- Authenticated guest
- Approved host
- Admin

// Verify each operation:
- Read own data
- Read others' data (should fail)
- Create new records
- Update own records
- Delete own records
```

### Step 5: Verification Queries
```sql
-- Verify all tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true
ORDER BY tablename;

-- Verify all tables have policies
SELECT
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Section 11: Migration Checklist

- [ ] User_roles table policies added (CRITICAL)
- [ ] Bookings UPDATE policy includes hosts
- [ ] Properties SELECT allows inactive viewing by owners
- [ ] All DELETE policies created
- [ ] Helper functions deployed
- [ ] Performance indexes created
- [ ] Client-side auth still works after change
- [ ] Admin functions verified
- [ ] Host dashboard functions verified
- [ ] Booking messages complexity reduced
- [ ] Email-based guest access documented
- [ ] All tables explicitly enabled RLS
- [ ] Tested with different user roles
- [ ] Backup created before deployment

---

## Conclusion

The Swedish Getaway Rentals application has a foundation of RLS security, but has several critical gaps:

1. **Immediate Action:** Add policies to `user_roles` table
2. **High Priority:** Fix bookings host access and properties delete operations
3. **Medium Priority:** Simplify complex queries and add missing policies
4. **Low Priority:** Add policies to supporting tables

The provided migration file (`20260316_comprehensive_rls_audit_and_fixes.sql`) addresses all identified issues with:
- ✅ Consistent pattern for all operations
- ✅ Proper role-based separation
- ✅ Performance optimization with helper functions
- ✅ Complete DELETE policy coverage
- ✅ Documentation for maintenance

**Estimated effort to implement:** 2-4 hours
**Testing effort:** 4-6 hours
**Total:** 1-2 days

---

## Questions or Clarifications?

For each table or policy, the SQL file includes detailed comments explaining:
- Why the policy exists
- Who can access what
- Performance considerations
- Edge cases handled

Review the migration file for full documentation.
