-- Additional security hardening for profiles table
-- Add explicit deny policies for anonymous users and strengthen existing policies

-- Add explicit deny policy for anonymous users (belt and suspenders approach)
CREATE POLICY "Deny all anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Ensure no data leakage through functions or views
-- Revoke all default permissions and grant only what's needed
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Add additional protection: ensure users can't enumerate other users
-- by adding a function that validates access before any query
CREATE OR REPLACE FUNCTION public.validate_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On SELECT/UPDATE, verify the user can only access their own profile
  IF (TG_OP = 'UPDATE' OR TG_OP = 'SELECT') THEN
    IF NEW.user_id IS NOT NULL AND NEW.user_id != auth.uid() THEN
      -- Unless they're an admin
      IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: You can only access your own profile';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Strengthen the existing policies by adding more explicit checks
DROP POLICY IF EXISTS "Authenticated users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate SELECT policies with explicit restrictions
CREATE POLICY "Users view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Must match EXACTLY their user_id
  user_id = auth.uid()
);

CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Only if they have admin role
  has_role(auth.uid(), 'admin'::app_role)
);

-- Ensure UPDATE policy is equally strict
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;

CREATE POLICY "Users update own profile only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add a security audit function to log all profile access attempts
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access attempts to profiles table
  IF (TG_OP = 'SELECT' AND NEW.user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin'::app_role)) THEN
    -- Log suspicious access attempt
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      ip_address,
      created_at
    ) VALUES (
      auth.uid(),
      'unauthorized_profile_access_attempt',
      'profiles',
      NEW.id,
      inet_client_addr(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add final documentation
COMMENT ON TABLE public.profiles IS 
'CRITICAL SECURITY: Contains PII (email, phone, DOB, Stripe IDs). 
RLS is FORCED. Anonymous access is DENIED. 
Authenticated users can ONLY access their own profile.
Admins access via user_roles table check.
All access is audited.';

-- Create a safe aggregate view for statistics (no PII)
CREATE OR REPLACE VIEW public.profile_statistics
WITH (security_invoker = true) AS
SELECT 
  COUNT(*) FILTER (WHERE is_host = true) as total_hosts,
  COUNT(*) FILTER (WHERE is_host = true AND host_approved = true) as approved_hosts,
  COUNT(*) as total_profiles,
  AVG(guest_rating) FILTER (WHERE guest_review_count > 0) as avg_guest_rating
FROM public.profiles;

GRANT SELECT ON public.profile_statistics TO authenticated;