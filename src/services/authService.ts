// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  approved_host?: boolean;
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

    // BUG-045: Check error.code instead of error.message for more reliable error handling
    if (error && error.message !== 'not authenticated' && error.code !== 'PGRST301') {
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
 * Get user session details
 * @returns Promise containing session data or null
 * @throws Error if session check fails
 */
export async function getSession(): Promise<Session | null> {
  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) throw error;
    return session;
  } catch (error) {
    throw new Error(
      `Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get user profile by user ID
 * @param userId - User ID
 * @returns Promise containing user profile data
 * @throws Error if profile not found or query fails
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
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
 * Update user profile
 * @param userId - User ID
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

    if (error) throw error;
    if (!data) throw new Error('Failed to update profile');

    return data;
  } catch (error) {
    throw new Error(
      `Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a user has a specific role
 * @param userId - User ID
 * @param role - Role to check
 * @returns Promise containing boolean indicating if user has role
 * @throws Error if query fails
 */
export async function checkUserRole(userId: string, role: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_host, host_approved')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.is_host === true;
  } catch (error) {
    throw new Error(
      `Failed to check user role: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a user is an approved host
 * @param userId - User ID
 * @returns Promise containing boolean indicating host approval status
 * @throws Error if query fails
 */
export async function isApprovedHost(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('host_approved')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.host_approved === true;
  } catch (error) {
    throw new Error(
      `Failed to check host status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Set user host approval status
 * @param userId - User ID
 * @param approved - Approval status
 * @returns Promise containing updated profile
 * @throws Error if update fails
 */
export async function setHostApprovalStatus(userId: string, approved: boolean): Promise<UserProfile> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        approved_host: approved,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
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
