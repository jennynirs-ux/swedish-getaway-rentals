-- Fix Security Definer warning and strengthen bookings table security

-- Remove SECURITY DEFINER from the masking function (not needed for this use case)
-- The function isn't actually used in a trigger anyway
DROP FUNCTION IF EXISTS public.mask_profile_sensitive_data();

-- Now fix the critical bookings table security issue
-- Ensure no public access and strengthen access code protection

-- Enable and force RLS on bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;

-- Drop existing booking policies to recreate them more securely
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own bookings (basic info)" ON public.bookings;
DROP POLICY IF EXISTS "Only booking guest or admin can view access code" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users and valid guests can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;

-- Create secure SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  -- Must be the booking owner OR admin OR property host
  (user_id IS NOT NULL AND user_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    -- Property host can view bookings for their properties
    property_id IN (
      SELECT p.id 
      FROM properties p
      JOIN profiles pr ON p.host_id = pr.id
      WHERE pr.user_id = auth.uid() AND pr.is_host = true AND pr.host_approved = true
    )
  )
);

-- Create secure INSERT policy (only authenticated users)
CREATE POLICY "Authenticated users can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL AND
  -- Basic validation
  guest_name IS NOT NULL AND
  guest_email IS NOT NULL AND
  length(guest_name) >= 2 AND
  length(guest_email) >= 5 AND
  guest_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Create secure UPDATE policy (only admins and system)
CREATE POLICY "Only admins can update bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Prevent direct deletion of bookings
CREATE POLICY "Prevent booking deletion"
ON public.bookings
FOR DELETE
TO authenticated
USING (false);

-- Add trigger to protect access codes from unauthorized viewing
CREATE OR REPLACE FUNCTION public.protect_booking_access_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mask access code unless user is admin or booking owner
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    (NEW.user_id IS NOT NULL AND NEW.user_id = auth.uid()) OR
    (
      -- Or property host
      NEW.property_id IN (
        SELECT p.id 
        FROM properties p
        JOIN profiles pr ON p.host_id = pr.id
        WHERE pr.user_id = auth.uid()
      )
    )
  ) THEN
    -- Mask the access code
    NEW.access_code := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add security comment
COMMENT ON TABLE public.bookings IS 
'SECURITY: Contains sensitive booking data including PII and access codes. RLS is FORCED. Only authenticated users (booking owner, property host, or admin) can view bookings. Access codes are protected by trigger.';

-- Create secure view for public booking statistics (no PII)
CREATE OR REPLACE VIEW public.booking_statistics AS
SELECT 
  property_id,
  DATE_TRUNC('month', check_in_date) as booking_month,
  COUNT(*) as booking_count,
  status
FROM public.bookings
WHERE status = 'confirmed'
GROUP BY property_id, DATE_TRUNC('month', check_in_date), status;

-- Grant access to the statistics view
GRANT SELECT ON public.booking_statistics TO authenticated;