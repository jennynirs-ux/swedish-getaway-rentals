-- Fix security definer view issue
-- Drop the problematic view and recreate it safely

DROP VIEW IF EXISTS public.secure_bookings;

-- Instead of a view, we'll enhance the existing RLS policy to be even more explicit
-- and add helper functions that don't create security definer views

-- Create a more explicit booking access policy
DROP POLICY IF EXISTS "Secure booking access policy" ON public.bookings;

CREATE POLICY "Explicit secure booking access"
ON public.bookings
FOR SELECT
USING (
  -- Case 1: User is admin - can see all bookings
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
  OR
  -- Case 2: User owns authenticated booking - can see their own booking
  (
    user_id IS NOT NULL 
    AND user_id = auth.uid() 
    AND auth.uid() IS NOT NULL
  )
  -- Case 3: Anonymous bookings (user_id IS NULL) - explicitly denied for non-admin users
  -- This is handled by the absence of a condition that would allow access
);

-- Fix function search paths for existing functions
DROP FUNCTION IF EXISTS public.user_can_access_booking(public.bookings);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier text,
  max_requests integer DEFAULT 10,
  window_minutes integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  -- Fixed: explicit search path
AS $$
DECLARE
  request_count integer;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*)
  INTO request_count
  FROM security_audit_log
  WHERE user_agent = identifier
    AND created_at > now() - (window_minutes || ' minutes')::interval;
  
  -- Return false if rate limit exceeded
  RETURN request_count < max_requests;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = 'public'  -- Fixed: explicit search path
AS $$
BEGIN
  -- Check minimum length
  IF length(password) < 8 THEN
    RETURN false;
  END IF;
  
  -- Check for at least one uppercase letter
  IF password !~ '[A-Z]' THEN
    RETURN false;
  END IF;
  
  -- Check for at least one lowercase letter
  IF password !~ '[a-z]' THEN
    RETURN false;
  END IF;
  
  -- Check for at least one digit
  IF password !~ '[0-9]' THEN
    RETURN false;
  END IF;
  
  -- All checks passed
  RETURN true;
END;
$$;

-- Update audit function with proper search path
CREATE OR REPLACE FUNCTION public.audit_booking_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  -- Fixed: explicit search path
AS $$
BEGIN
  -- Log all booking access attempts
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    created_at
  ) VALUES (
    auth.uid(),
    'booking_access',
    'bookings',
    NEW.id,
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Create a simple function to validate booking access (without view)
CREATE OR REPLACE FUNCTION public.is_booking_accessible(booking_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER for security
SET search_path = 'public'
AS $$
DECLARE
  booking_user_id uuid;
  is_admin bool;
BEGIN
  -- Get booking's user_id
  SELECT user_id INTO booking_user_id 
  FROM public.bookings 
  WHERE id = booking_id;
  
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ) INTO is_admin;
  
  -- Return access decision
  RETURN (
    is_admin OR 
    (booking_user_id IS NOT NULL AND booking_user_id = auth.uid())
  );
END;
$$;