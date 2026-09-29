-- Cancellations with refunds (admin "Avboka & återbetala" and refunds made
-- directly in Stripe, via the webhook). Amounts in öre like total_amount.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refunded_amount integer NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
