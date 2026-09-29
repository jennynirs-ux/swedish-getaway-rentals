-- Fee model A (2026-09-29): the guest pays the host's price plus a platform
-- service fee (profiles.commission_rate, default 10 %); the host keeps their
-- whole price. Record the split per booking, in öre like total_amount:
--   total_amount = host_amount + service_fee  (what the guest paid)
-- Older bookings have service_fee 0 and host_amount NULL (= total_amount).
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_fee integer NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  ADD COLUMN IF NOT EXISTS host_amount integer CHECK (host_amount >= 0);

COMMENT ON COLUMN public.bookings.service_fee IS 'Platform service fee paid by the guest, in öre';
COMMENT ON COLUMN public.bookings.host_amount IS 'Host''s share (their own price), in öre; NULL on bookings before 2026-09-29 = total_amount';
