-- Damage protection configuration per property
ALTER TABLE properties ADD COLUMN IF NOT EXISTS damage_protection_enabled BOOLEAN DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS damage_deposit_amount INTEGER DEFAULT 0; -- in SEK
ALTER TABLE properties ADD COLUMN IF NOT EXISTS damage_protection_type TEXT DEFAULT 'deposit' CHECK (damage_protection_type IN ('deposit', 'insurance', 'none'));

-- Damage claims table
CREATE TABLE IF NOT EXISTS damage_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  host_id UUID NOT NULL,
  claim_amount INTEGER NOT NULL, -- in SEK
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'disputed')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Damage deposit holds (Stripe payment intents captured later)
CREATE TABLE IF NOT EXISTS deposit_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- in SEK
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'captured', 'failed')),
  captured_amount INTEGER DEFAULT 0,
  released_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_damage_claims_booking ON damage_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_damage_claims_status ON damage_claims(status);
CREATE INDEX IF NOT EXISTS idx_deposit_holds_booking ON deposit_holds(booking_id);
