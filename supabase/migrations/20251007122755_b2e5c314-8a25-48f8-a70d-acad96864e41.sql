-- Fix SECURITY DEFINER views warning
-- Recreate views without SECURITY DEFINER property

-- Drop and recreate public_profiles view without SECURITY DEFINER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  location,
  is_host,
  host_approved,
  guest_rating,
  guest_review_count
FROM public.profiles
WHERE is_host = true AND host_approved = true;

-- Drop and recreate booking_statistics view without SECURITY DEFINER
DROP VIEW IF EXISTS public.booking_statistics;

CREATE VIEW public.booking_statistics
WITH (security_invoker = true) AS
SELECT 
  property_id,
  DATE_TRUNC('month', check_in_date) as booking_month,
  COUNT(*) as booking_count,
  status
FROM public.bookings
WHERE status = 'confirmed'
GROUP BY property_id, DATE_TRUNC('month', check_in_date), status;

-- Re-grant permissions
GRANT SELECT ON public.public_profiles TO authenticated, anon;
GRANT SELECT ON public.booking_statistics TO authenticated;