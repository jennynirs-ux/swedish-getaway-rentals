# Client-Side Auth Code Fixes

## Overview

This document shows recommended changes to TypeScript/React code to work better with the new RLS policies. These are not strictly required (RLS will enforce at database level), but are best practices for:

1. Better error handling
2. Clearer intent
3. Consistency with RLS logic
4. Improved user feedback

---

## File 1: src/services/authService.ts

### Current Issues

1. Uses `user_profiles` table (potential mismatch with `profiles`)
2. No role-based checks
3. Generic error handling
4. No verification of RLS-enforced data

### Recommended Changes

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  user_id: string;  // Add user_id reference
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  is_host?: boolean;
  host_approved?: boolean;
  approved_host?: boolean;  // Keep for compatibility
  created_at: string;
  updated_at: string;
}

/**
 * Get the currently authenticated user session
 * @returns Promise containing current user or null if not authenticated
 * @throws Error if session check fails
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    // Check error code properly
    if (error && error.code !== 'PGRST301' && error.message !== 'not authenticated') {
      throw error;
    }

    return user ? {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    } : null;
  } catch (error) {
    throw new Error(
      `Failed to get current user: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get user's profile from RLS-protected profiles table
 * Replaces getUserProfile to use correct table
 * @param userId - User ID
 * @returns Promise containing user profile data
 * @throws Error if profile not found or query fails
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Use 'profiles' table, not 'user_profiles'
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is acceptable
      throw error;
    }

    return data || null;
  } catch (error) {
    throw new Error(
      `Failed to fetch user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update user profile with RLS verification
 * @param userId - User ID (must be current user due to RLS)
 * @param updates - Profile fields to update
 * @returns Promise containing updated profile
 * @throws Error if update fails
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      // Handle RLS denial gracefully
      if (error.code === 'PGRST' || error.message?.includes('denied')) {
        throw new Error('You do not have permission to update this profile');
      }
      throw error;
    }

    if (!data) throw new Error('Failed to update profile');

    return data;
  } catch (error) {
    throw new Error(
      `Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if user has a specific role (admin, host, etc)
 * Uses new user_roles table structure
 * @param userId - User ID
 * @param role - Role to check (admin, host, etc)
 * @returns Promise containing boolean indicating if user has role
 */
export async function checkUserRole(userId: string, role: string): Promise<boolean> {
  try {
    // Query the new user_roles table for role checks
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', role)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Failed to check user role:', error);
    return false;
  }
}

/**
 * Check if user is an admin
 * Recommended for use throughout app
 * @param userId - User ID (optional, defaults to current user)
 * @returns Promise containing boolean
 */
export async function isUserAdmin(userId?: string): Promise<boolean> {
  try {
    const user = userId || (await getCurrentUser())?.id;
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user)
      .eq('role', 'admin')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking admin role:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Failed to verify admin status:', error);
    return false;
  }
}

/**
 * Check if user is an approved host
 * @param userId - User ID
 * @returns Promise containing boolean
 */
export async function isApprovedHost(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_host, host_approved')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.is_host === true && data?.host_approved === true;
  } catch (error) {
    console.error('Failed to check host approval:', error);
    return false;
  }
}

/**
 * Set user host approval status (admin only)
 * @param userId - User ID to approve
 * @param approved - Approval status
 * @returns Promise containing updated profile
 * @throws Error if not authorized or update fails
 */
export async function setHostApprovalStatus(userId: string, approved: boolean): Promise<UserProfile> {
  try {
    // Verify caller is admin (RLS will also enforce)
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      throw new Error('Only administrators can approve hosts');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        host_approved: approved,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to update host status');

    return data;
  } catch (error) {
    throw new Error(
      `Failed to set host approval status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 * @throws Error if sign out fails
 */
export async function signOut(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    throw new Error(
      `Failed to sign out: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Subscribe to authentication state changes
 * @param callback - Function to call when auth state changes
 * @returns Function to unsubscribe from auth changes
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user
      ? {
          id: session.user.id,
          email: session.user.email || '',
          user_metadata: session.user.user_metadata,
          app_metadata: session.user.app_metadata
        }
      : null;
    callback(user);
  });

  return () => {
    subscription?.unsubscribe();
  };
}

// NEW: Helper to get user's profile ID (needed for host operations)
export async function getUserProfileId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Failed to get profile ID:', error);
    return null;
  }
}
```

---

## File 2: src/hooks/useAdminAuth.ts

### Current Implementation

The hook is good but could be simplified given new RLS policies.

### Enhanced Version

```typescript
import { useState, useEffect } from 'react';
import { isUserAdmin, getCurrentUser } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to verify admin role with proper error handling.
 *
 * This hook verifies admin access through:
 * 1. Client-side check for UX (faster)
 * 2. Server-side RLS enforcement (security)
 *
 * IMPORTANT: This provides client-side validation only. Supabase RLS policies
 * MUST be configured on the backend to enforce admin access restrictions at the
 * database level. This hook should be used in conjunction with proper RLS policies.
 *
 * @returns {Object} Object containing:
 *   - isAdmin: boolean indicating if user has admin role
 *   - isLoading: boolean indicating if role check is in progress
 *   - error: error message if role check failed
 *   - refetch: function to re-verify admin status
 */
export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verifyAdminRole = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const user = await getCurrentUser();

      if (!user) {
        setIsAdmin(false);
        setError('Not authenticated');
        return;
      }

      // Check admin role using service function
      const adminStatus = await isUserAdmin(user.id);

      if (!adminStatus) {
        console.warn('Access denied: User does not have admin role');
        setIsAdmin(false);
        setError('User does not have admin privileges');
        return;
      }

      // Optional: Verify with RLS by attempting a read from admin-only table
      const { data, error: adminError } = await supabase
        .from('platform_settings')
        .select('setting_key')
        .limit(1);

      if (adminError) {
        console.error('RLS denied admin access:', adminError);
        setIsAdmin(false);
        setError('Database denied admin access (RLS enforced)');
        return;
      }

      setIsAdmin(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify admin role';
      console.error('Admin verification error:', errorMsg);
      setError(errorMsg);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyAdminRole();
  }, []);

  // Return refetch function for manual re-verification
  return {
    isAdmin,
    isLoading,
    error,
    refetch: verifyAdminRole
  };
};
```

---

## File 3: src/pages/Admin.tsx

### Current Implementation Issues

1. Manual role check with error handling
2. No consistency with authService
3. Duplicated code

### Recommended Refactor

```typescript
import { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser, isUserAdmin } from "@/services/authService";
import UnifiedAdmin from "@/components/admin/UnifiedAdmin";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";

const Admin = memo(() => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Enable admin notifications for new bookings
  useBookingRealtime({
    enableAdminNotifications: true
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);

      // Get current user
      const user = await getCurrentUser();

      if (!user) {
        navigate('/auth?redirect=/admin');
        return;
      }

      // Check admin status using service
      const adminStatus = await isUserAdmin(user.id);

      if (!adminStatus) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Verify RLS by attempting admin-only operation
      const { error: rqlError } = await supabase
        .from('user_roles')
        .select('role')
        .limit(1);

      if (rqlError) {
        console.error('RLS admin check failed:', rqlError);
        toast({
          title: "Access Error",
          description: "Database denied admin access",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast({
        title: "Error",
        description: "Failed to verify admin privileges",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Nordic Getaways Admin</h1>
              <p className="text-muted-foreground">Manage your rentals, shop, and orders</p>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto">
            <Card className="border-destructive/50">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <ShieldAlert className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle className="text-2xl text-destructive">Access Denied</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-muted-foreground">
                  You don't have admin privileges to access this page.
                </p>
                <Button onClick={() => navigate('/')} className="w-full">
                  Go to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nordic Getaways Admin</h1>
            <p className="text-muted-foreground">Manage your rentals, shop, and orders</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <UnifiedAdmin />
    </div>
  );
});

Admin.displayName = 'Admin';

export default Admin;
```

---

## File 4: src/components/host/HostDashboard.tsx

### Key Improvements

1. Use new helper function `getUserProfileId()`
2. Better error handling for RLS denials
3. Consistent auth service usage

### Key Changes Section

```typescript
const fetchHostStats = async () => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      navigate("/auth?redirect=/host-dashboard");
      return;
    }

    setUser(userData.user);

    // Use new helper to get profile ID
    const profileId = await getUserProfileId(userData.user.id);
    if (!profileId) {
      toast.error("Unable to load your profile");
      return;
    }

    // Now fetch properties - RLS will enforce access
    const { data: propertiesData, error: propsError } = await supabase
      .from("properties")
      .select("*")
      .eq("host_id", profileId);

    if (propsError) {
      console.error("Error fetching properties:", propsError);
      // RLS denial will show as permissions error
      toast.error("Unable to load your properties");
      return;
    }

    // ... rest of function
  } catch (error) {
    console.error("Error fetching host stats:", error);
  } finally {
    setLoading(false);
  }
};

const createNewProperty = async () => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // Use new helper
    const profileId = await getUserProfileId(user.user.id);
    if (!profileId) {
      toast.error("Unable to create property: Profile not found");
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .insert({
        title: "New Property",
        host_id: profileId,
        price_per_night: 1000,
        active: false,
        bedrooms: 1,
        bathrooms: 1,
        max_guests: 2,
        location: "",
        description: "",
        hero_image_url: "",
        property_type: "Property",
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('denied')) {
        toast.error("RLS denied property creation - contact admin");
      } else {
        throw error;
      }
      return;
    }

    toast.success("New property created");
    setEditingPropertyId(data.id);
    refetchProperties();
    fetchHostStats();
  } catch (error) {
    console.error("Error creating property:", error);
    toast.error("Failed to create property");
  }
};

const deleteProperty = async () => {
  if (!deletingPropertyId || !user) return;
  try {
    // Get profile ID
    const profileId = await getUserProfileId(user.id);
    if (!profileId) {
      toast.error("Unable to verify ownership");
      return;
    }

    // Check for active bookings
    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id, status, check_out_date")
      .eq("property_id", deletingPropertyId)
      .in("status", ["pending", "confirmed"])
      .gte("check_out_date", new Date().toISOString());

    if (activeBookings && activeBookings.length > 0) {
      toast.error(
        "Cannot delete property with active bookings. Cancel or complete bookings first."
      );
      return;
    }

    // RLS will enforce that host_id matches
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", deletingPropertyId)
      .eq("host_id", profileId);  // Still good for double-checking

    if (error) {
      if (error.message?.includes('denied')) {
        toast.error("RLS denied deletion - you may not own this property");
      } else {
        throw error;
      }
      return;
    }

    toast.success("Property deleted successfully");
    setDeletingPropertyId(null);
    refetchProperties();
    fetchHostStats();
  } catch (error) {
    console.error("Error deleting property:", error);
    toast.error("Failed to delete property");
  }
};
```

---

## Error Handling Pattern

### Standard Error Handling

```typescript
// Pattern to use throughout app
try {
  const { data, error } = await supabase
    .from('table_name')
    .operation()
    .filter();

  if (error) {
    // Check if it's an RLS denial
    if (error.message?.includes('denied') || error.code === 'PGRST') {
      toast.error('Access denied - you do not have permission for this action');
      return;
    }

    // Other errors
    throw error;
  }

  // Success
  return data;
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Operation failed:', message);
  toast.error(message);
}
```

---

## Summary of Changes

### authService.ts
- ✅ Use `profiles` table consistently
- ✅ Add `isUserAdmin()` helper
- ✅ Add `isApprovedHost()` helper
- ✅ Add `getUserProfileId()` helper
- ✅ Improve error handling

### useAdminAuth.ts
- ✅ Use new `isUserAdmin()` service function
- ✅ Add refetch capability
- ✅ Better error messages

### Admin.tsx
- ✅ Use `isUserAdmin()` from service
- ✅ Consistent error handling
- ✅ Verify RLS works with platform_settings

### HostDashboard.tsx
- ✅ Use `getUserProfileId()` helper
- ✅ Handle RLS denial messages
- ✅ Better error context

---

## Testing the Changes

### Test 1: Admin Access
```typescript
const user = await getCurrentUser();
const isAdmin = await isUserAdmin(user?.id);
console.log('Is admin:', isAdmin);  // true if admin, false otherwise
```

### Test 2: Property Ownership
```typescript
const profileId = await getUserProfileId(userId);
const { data } = await supabase
  .from('properties')
  .select('*')
  .eq('host_id', profileId);
// RLS will also enforce this
```

### Test 3: RLS Denial
```typescript
// Try to read someone else's data
const { error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', 'other-user-id');  // Should fail with RLS error

if (error?.message?.includes('denied')) {
  console.log('RLS working correctly');
}
```

---

## Migration Checklist

- [ ] Update authService.ts with new functions
- [ ] Update useAdminAuth.ts to use service
- [ ] Update Admin.tsx to use service
- [ ] Update HostDashboard.tsx to use helpers
- [ ] Test admin access still works
- [ ] Test host can manage properties
- [ ] Test guest can only see own bookings
- [ ] Test error handling with RLS denials
- [ ] Verify no console errors

---

## Notes

1. **RLS Enforcement:** These client changes are optional improvements. RLS will enforce permissions regardless.

2. **Error Handling:** The `error.message?.includes('denied')` check helps identify RLS-related errors for better user feedback.

3. **Backward Compatibility:** These changes are backward compatible and don't require database changes to work.

4. **Performance:** Using helper functions instead of inline queries improves code reusability and reduces duplication.

5. **Security:** These changes don't bypass RLS; they work *with* RLS for defense-in-depth.
