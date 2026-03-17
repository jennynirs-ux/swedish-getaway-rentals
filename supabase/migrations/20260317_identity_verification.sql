-- Guest Identity Verification (Stripe Identity)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_verification_id TEXT;

COMMENT ON COLUMN profiles.identity_verified IS 'Whether the user has passed Stripe Identity verification';
COMMENT ON COLUMN profiles.identity_verification_id IS 'Stripe Identity VerificationSession ID';
