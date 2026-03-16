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
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
