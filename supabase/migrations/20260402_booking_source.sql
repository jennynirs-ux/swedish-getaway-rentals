-- Phase 2 Step 2: Add booking source tracking
-- Tracks where each booking originated: airbnb, booking_com, direct, or blocked

-- Add column (safe if already exists)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct';

-- Add check constraint (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'chk_booking_source'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT chk_booking_source
      CHECK (source IN ('airbnb', 'booking_com', 'direct', 'blocked', 'manual'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings(source);

-- Backfill: classify existing bookings from Airbnb iCal feeds
UPDATE public.bookings b
SET source = 'airbnb'
WHERE source = 'direct'
  AND EXISTS (
    SELECT 1 FROM public.ical_feeds f
    WHERE f.property_id = b.property_id
      AND f.active = true
      AND (f.name ILIKE '%airbnb%' OR f.url ILIKE '%airbnb%')
  )
  AND b.stripe_payment_intent_id IS NULL;

COMMENT ON COLUMN public.bookings.source IS
'Booking origin channel: airbnb, booking_com, direct (our site), blocked (manual block), or manual (legacy admin-created).';
