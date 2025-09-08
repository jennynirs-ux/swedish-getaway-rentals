-- PHASE 1: Fix Critical Data Exposure Issues

-- 1. Fix Guest Messages Table RLS Policies
-- Drop existing overly broad policies
DROP POLICY IF EXISTS "Admins can view all guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "Admins can update guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "Anyone can insert guest messages" ON public.guest_messages;

-- Create more secure policies for guest messages
CREATE POLICY "Admins can view all guest messages"
ON public.guest_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update guest messages"
ON public.guest_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Anyone can insert guest messages"
ON public.guest_messages
FOR INSERT
WITH CHECK (true);

-- 2. Fix Bookings Table RLS Policies
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view their own authenticated bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

-- Create consolidated, secure policies for bookings
CREATE POLICY "Admins and users can view relevant bookings"
ON public.bookings
FOR SELECT
USING (
  -- Admins can see all bookings
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
  OR
  -- Users can only see their own authenticated bookings
  (auth.uid() = user_id AND user_id IS NOT NULL)
);

CREATE POLICY "Admins can update bookings"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Anyone can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (true);

-- 3. Fix Profiles Table Access Control
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create simplified, secure policy for viewing profiles
CREATE POLICY "Users can view own profile, admins can view all"
ON public.profiles
FOR SELECT
USING (
  -- Users can view their own profile
  auth.uid() = user_id
  OR
  -- Admins can view all profiles
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() AND p2.is_admin = true
  )
);

-- 4. Enhance database security with additional constraints
-- Add check constraints for data integrity
ALTER TABLE public.bookings 
ADD CONSTRAINT check_dates_logical 
CHECK (check_out_date > check_in_date);

ALTER TABLE public.bookings 
ADD CONSTRAINT check_positive_guests 
CHECK (number_of_guests > 0 AND number_of_guests <= 50);

ALTER TABLE public.bookings 
ADD CONSTRAINT check_positive_amount 
CHECK (total_amount >= 0);

-- Add indexes for better security query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON public.profiles(user_id) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_guest_messages_email ON public.guest_messages(email);

-- 5. Create security audit log table for monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- 6. Create function for rate limiting (to be used in edge functions)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier text,
  max_requests integer DEFAULT 10,
  window_minutes integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 7. Add password strength validation function
CREATE OR REPLACE FUNCTION public.validate_password_strength(password text)
RETURNS boolean
LANGUAGE plpgsql
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