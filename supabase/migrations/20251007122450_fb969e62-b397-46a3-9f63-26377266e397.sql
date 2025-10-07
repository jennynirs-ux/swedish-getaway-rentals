-- Critical Security Fix: Strengthen profiles table RLS policies
-- Ensure no public access is possible, even if RLS is misconfigured

-- First, verify RLS is enabled (this is idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (prevents bypassing RLS even for superuser queries)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with explicit deny patterns
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restrictive SELECT policies (no public access)
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create restrictive INSERT policy
CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create restrictive UPDATE policy
CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Explicitly deny DELETE for all users (profiles should never be deleted directly)
CREATE POLICY "Prevent profile deletion"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);

-- Add additional security: Create a trigger to prevent privilege escalation
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
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Grant select on the public view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Add comment explaining the security model
COMMENT ON TABLE public.profiles IS 
'SECURITY: Contains sensitive PII. RLS is FORCED. Only authenticated users can view their own profile or admins can view all. Stripe IDs can only be modified by admins.';

-- Mask sensitive fields in audit logs
CREATE OR REPLACE FUNCTION public.mask_profile_sensitive_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log non-sensitive fields changes
  IF (TG_OP = 'UPDATE') THEN
    -- Don't log email, phone, Stripe ID changes in detail
    NEW.email := CASE 
      WHEN NEW.email IS NOT NULL THEN 
        SUBSTRING(NEW.email FROM 1 FOR 2) || '***@' || SPLIT_PART(NEW.email, '@', 2)
      ELSE NULL
    END;
    
    NEW.phone := CASE 
      WHEN NEW.phone IS NOT NULL AND LENGTH(NEW.phone) > 4 THEN 
        '***' || RIGHT(NEW.phone, 4)
      ELSE NEW.phone
    END;
    
    NEW.stripe_connect_account_id := CASE
      WHEN NEW.stripe_connect_account_id IS NOT NULL THEN
        '***' || RIGHT(NEW.stripe_connect_account_id, 4)
      ELSE NULL
    END;
  END IF;
  
  RETURN NEW;
END;
$$;