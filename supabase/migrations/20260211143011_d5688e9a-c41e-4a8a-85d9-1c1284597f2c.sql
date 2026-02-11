
-- Revoke SELECT on api_credentials column from authenticated and anon roles
-- Only service_role (used by edge functions) retains access
REVOKE SELECT (api_credentials) ON public.yale_locks FROM authenticated;
REVOKE SELECT (api_credentials) ON public.yale_locks FROM anon;

-- Also revoke SELECT on access_code column in lock_access_log from anon
-- (authenticated users still need it for their own bookings via RLS)
REVOKE SELECT (access_code) ON public.lock_access_log FROM anon;
