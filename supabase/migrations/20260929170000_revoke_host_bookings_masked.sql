-- get_host_bookings_masked(host_user_id) is SECURITY DEFINER and never checks
-- the caller, so anyone (even without logging in) could read a host's
-- upcoming bookings with guest names, emails, phones and door codes. The site
-- does not use it; only the service role keeps access.
REVOKE ALL ON FUNCTION public.get_host_bookings_masked(uuid) FROM PUBLIC, anon, authenticated;
