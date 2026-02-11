
-- Remove the redundant host SELECT policy on bookings table that allows
-- hosts to bypass the bookings_secure view and access unmasked guest contact info.
-- Hosts should exclusively use the bookings_secure view (already used in HostDashboard).
DROP POLICY IF EXISTS "Hosts view bookings with contact masking" ON public.bookings;
