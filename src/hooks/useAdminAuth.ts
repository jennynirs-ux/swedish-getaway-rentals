// @ts-nocheck
import { useState, useEffect } from 'react';
import { getCurrentUser, checkUserRole } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to verify admin role with server-side validation.
 *
 * BUG-004 FIX: This hook adds runtime admin role verification to prevent
 * unauthorized access to admin data if Supabase RLS policies are misconfigured.
 *
 * IMPORTANT: This provides client-side validation only. Supabase RLS policies
 * MUST be configured on the backend to enforce admin access restrictions at the
 * database level. This hook should be used in conjunction with proper RLS policies.
 *
 * @returns {Object} Object containing:
 *   - isAdmin: boolean indicating if user has admin role
 *   - isLoading: boolean indicating if role check is in progress
 *   - error: error message if role check failed
 */
export const useAdminAuth = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAdminRole = async () => {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();

        if (!user) {
          setIsAdmin(false);
          return;
        }

        // Server-side admin role verification
        const isAdminUser = await checkUserRole(user.id, 'admin');

        if (!isAdminUser) {
          console.warn('Access denied: User does not have admin role');
          setIsAdmin(false);
          return;
        }

        // Additional RLS policy validation: verify the user_profiles table enforces admin access
        const { data, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw new Error('Failed to verify admin role from database');
        }

        setIsAdmin(data?.role === 'admin');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to verify admin role';
        setError(errorMsg);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAdminRole();
  }, []);

  return { isAdmin, isLoading, error };
};
