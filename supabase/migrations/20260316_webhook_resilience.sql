-- Webhook resilience: unique constraint on processed_sessions + failure tracking table
-- This prevents race conditions where concurrent webhook retries could create duplicate records.

-- 1. Add unique constraint on session_id to enforce idempotency at the DB level
ALTER TABLE IF EXISTS processed_sessions
  ADD CONSTRAINT processed_sessions_session_id_unique UNIQUE (session_id);

-- 2. Create webhook_failures table for tracking and manual recovery
CREATE TABLE IF NOT EXISTS webhook_failures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  payload jsonb,
  error_message text NOT NULL,
  retry_count integer DEFAULT 0,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS: Only admins can view/manage webhook failures
ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook failures"
  ON webhook_failures FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update webhook failures"
  ON webhook_failures FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role can insert (edge functions use service role)
CREATE POLICY "Service role can insert webhook failures"
  ON webhook_failures FOR INSERT
  WITH CHECK (true);

-- Index for admin dashboard queries
CREATE INDEX idx_webhook_failures_unresolved
  ON webhook_failures (created_at DESC)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE webhook_failures IS 'Tracks failed webhook processing for admin review and manual recovery';
