-- When the guest confirmed the house rules at checkout (lead guest 25 or
-- older, no parties or events). NULL for bookings made before this and for
-- channel/manual bookings.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rules_confirmed_at timestamptz;
