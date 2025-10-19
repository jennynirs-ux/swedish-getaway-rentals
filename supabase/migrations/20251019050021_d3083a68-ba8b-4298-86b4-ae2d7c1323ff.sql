-- Create processed sessions table for idempotency
CREATE TABLE IF NOT EXISTS public.processed_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  session_type TEXT NOT NULL, -- 'booking', 'product', 'cart'
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_record_id UUID
);

-- Enable RLS
ALTER TABLE public.processed_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view processed sessions
CREATE POLICY "Only admins can view processed sessions"
ON public.processed_sessions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_processed_sessions_session_id 
ON public.processed_sessions(session_id);

-- Add created_at index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_processed_sessions_created_at 
ON public.processed_sessions(processed_at);

COMMENT ON TABLE public.processed_sessions IS 'Tracks processed Stripe sessions to prevent replay attacks and duplicate processing';