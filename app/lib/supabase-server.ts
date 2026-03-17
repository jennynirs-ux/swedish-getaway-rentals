/**
 * Server-side Supabase client for Next.js App Router
 *
 * This client is used ONLY on the server for SSR data fetching.
 * It does NOT use cookies and is designed for read-only operations.
 *
 * Usage:
 *   const supabase = createServerClient();
 *   const { data } = await supabase.from('properties').select('*');
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export function createServerClient() {
  // Support both VITE_* (transition) and NEXT_PUBLIC_* (target) prefixes
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or VITE_* equivalents).'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
