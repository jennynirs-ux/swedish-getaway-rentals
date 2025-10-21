-- Secure statistics views with RLS policies and RPC functions

-- Drop existing views
DROP VIEW IF EXISTS public.booking_statistics;
DROP VIEW IF EXISTS public.profile_statistics;

-- Create secure RPC function for booking statistics (admin and property owners only)
CREATE OR REPLACE FUNCTION public.get_booking_statistics(property_id_filter UUID DEFAULT NULL)
RETURNS TABLE (
  property_id UUID,
  month DATE,
  status TEXT,
  booking_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin or property owner
  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    (property_id_filter IS NOT NULL AND EXISTS (
      SELECT 1 FROM properties p
      JOIN profiles pr ON p.host_id = pr.id
      WHERE p.id = property_id_filter AND pr.user_id = auth.uid()
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin or property owner access required';
  END IF;

  RETURN QUERY
  SELECT 
    b.property_id,
    date_trunc('month', b.check_in_date)::DATE as month,
    b.status,
    COUNT(*)::BIGINT as booking_count
  FROM bookings b
  WHERE b.status = 'confirmed'
    AND (property_id_filter IS NULL OR b.property_id = property_id_filter)
    AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR
      b.property_id IN (
        SELECT p.id FROM properties p
        JOIN profiles pr ON p.host_id = pr.id
        WHERE pr.user_id = auth.uid()
      )
    )
  GROUP BY b.property_id, date_trunc('month', b.check_in_date), b.status
  ORDER BY month DESC, b.property_id;
END;
$$;

-- Create secure RPC function for profile statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_profile_statistics()
RETURNS TABLE (
  total_hosts BIGINT,
  approved_hosts BIGINT,
  total_users BIGINT,
  avg_host_rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE is_host = true)::BIGINT as total_hosts,
    COUNT(*) FILTER (WHERE is_host = true AND host_approved = true)::BIGINT as approved_hosts,
    COUNT(*)::BIGINT as total_users,
    AVG(host_rating) as avg_host_rating
  FROM profiles;
END;
$$;

-- Add explicit RLS policy to public_profiles view to document intentional public access
-- First check if public_profiles exists and is a view
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'public_profiles' AND c.relkind = 'v' AND n.nspname = 'public'
  ) THEN
    -- Enable RLS on the view (requires recreating as a table or keeping as view)
    -- Since we can't enable RLS on views, we'll create a secure RPC function instead
    EXECUTE 'DROP VIEW IF EXISTS public.public_profiles';
  END IF;
END $$;

-- Create secure RPC function for public profiles (authenticated users only)
CREATE OR REPLACE FUNCTION public.get_public_profiles()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  host_rating NUMERIC,
  total_reviews INTEGER,
  properties_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: Authentication required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.location,
    p.host_rating,
    p.total_reviews,
    (SELECT COUNT(*)::INTEGER FROM properties WHERE host_id = p.id AND active = true) as properties_count
  FROM profiles p
  WHERE p.is_host = true AND p.host_approved = true;
END;
$$;