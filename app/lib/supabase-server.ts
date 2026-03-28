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
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    '';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) {
    // Return a dummy client that won't crash during CI builds
    return createClient<Database>('https://placeholder.supabase.co', 'placeholder', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
