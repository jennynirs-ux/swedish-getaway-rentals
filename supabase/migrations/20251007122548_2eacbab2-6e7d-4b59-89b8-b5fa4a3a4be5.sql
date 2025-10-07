-- Critical Security Fix: Force RLS and add additional protections for profiles table
-- Ensure no public access is possible, even if RLS is misconfigured

-- Force RLS for table owner too (prevents bypassing RLS even for superuser queries)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Explicitly deny DELETE for all users (profiles should never be deleted directly)
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;
CREATE POLICY "Prevent profile deletion"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- Add security trigger to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent users from modifying their own Stripe account ID via direct update
  -- Only admins can do this through backend functions
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.stripe_connect_account_id IS DISTINCT FROM NEW.stripe_connect_account_id) THEN
      -- Check if user is admin
      IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can modify Stripe account IDs';
      END IF;
    END IF;
    
    -- Prevent users from granting themselves host privileges
    IF (OLD.is_host IS DISTINCT FROM NEW.is_host OR OLD.host_approved IS DISTINCT FROM NEW.host_approved) THEN
      IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can modify host status';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the privilege escalation prevention trigger
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_escalation();

-- Create a secure view for public profile information (non-sensitive only)
DROP VIEW IF EXISTS public.public_profiles CASCADE;
CREATE VIEW public.public_profiles AS
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

-- Grant select on the public view to both authenticated and anonymous users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Add comment explaining the security model
COMMENT ON TABLE public.profiles IS 
'SECURITY: Contains sensitive PII (email, phone, Stripe IDs). RLS is FORCED. Only authenticated users can view their own profile or admins can view all. Sensitive fields can only be modified by admins. Use public_profiles view for non-sensitive public data.';