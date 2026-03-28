-- V2 Phase 1: Add booking source tracking
-- Tracks where each booking originated: airbnb, booking_com, direct, or blocked

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'direct';

-- Constrain to known sources
ALTER TABLE public.bookings
  ADD CONSTRAINT chk_booking_source
  CHECK (source IN ('airbnb', 'booking_com', 'direct', 'blocked'));

CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings(source);

-- Backfill: attempt to classify existing bookings from Airbnb feeds
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

-- Bookings with Stripe payment are definitely direct
-- (already default 'direct', no update needed)

COMMENT ON COLUMN public.bookings.source IS
'Booking origin channel: airbnb, booking_com, direct (our site), or blocked (manual block)';
