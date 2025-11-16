-- Create booking email tracking table
CREATE TABLE IF NOT EXISTS booking_email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tracking_id TEXT NOT NULL UNIQUE,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'booking_confirmation',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  opened_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_email_tracking_booking_id ON booking_email_tracking(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_email_tracking_tracking_id ON booking_email_tracking(tracking_id);

-- Enable RLS
ALTER TABLE booking_email_tracking ENABLE ROW LEVEL SECURITY;

-- Admins can view all tracking data
CREATE POLICY "Admins can view all email tracking"
  ON booking_email_tracking
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert tracking records
CREATE POLICY "System can insert email tracking"
  ON booking_email_tracking
  FOR INSERT
  WITH CHECK (true);

-- System can update tracking records (for open tracking)
CREATE POLICY "System can update email tracking"
  ON booking_email_tracking
  FOR UPDATE
  USING (true);

COMMENT ON TABLE booking_email_tracking IS 'Tracks booking confirmation emails and their open status';
