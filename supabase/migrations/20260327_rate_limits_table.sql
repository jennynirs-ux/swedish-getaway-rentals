-- Rate limiting table for edge functions
-- Used by supabase/functions/_shared/rateLimit.ts
-- Accessed only via service_role key (no RLS policies needed for client access)

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No client-facing RLS policies: this table is only accessed via service_role
-- from edge functions. RLS being enabled with no policies means anon/authenticated
-- users cannot read or write this table.

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- Periodic cleanup: remove expired entries older than 1 hour
-- Run via pg_cron or a scheduled edge function
COMMENT ON TABLE public.rate_limits IS
'Server-side rate limiting counters. Accessed only via service_role from edge functions. Clean up entries older than 1h periodically.';
