-- =====================================================================
-- Quick Win #1: EU Rental Registration Number
-- Mandatory since July 2025 per EU Short-Term Rental Regulation
-- =====================================================================
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS requires_host_approval BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN properties.registration_number IS
  'EU short-term rental registration number. Required since July 1, 2025.';

COMMENT ON COLUMN properties.requires_host_approval IS
  'When true, bookings are created with status pending_approval instead of confirmed.';

-- =====================================================================
-- Quick Win #2: Host Review Responses
-- =====================================================================
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS host_response TEXT,
  ADD COLUMN IF NOT EXISTS host_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS host_response_by UUID REFERENCES profiles(id);

COMMENT ON COLUMN reviews.host_response IS
  'Public reply from the property host to a guest review.';

-- Index for property page queries (only show approved reviews with responses)
CREATE INDEX IF NOT EXISTS idx_reviews_host_response
  ON reviews (host_response)
  WHERE host_response IS NOT NULL;
