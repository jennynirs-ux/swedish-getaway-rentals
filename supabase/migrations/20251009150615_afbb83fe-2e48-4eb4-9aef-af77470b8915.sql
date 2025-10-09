-- Fix critical security vulnerability in profiles table RLS policies
-- The "Deny all anonymous access" policy is ineffective because RLS policies use OR logic by default
-- We need to remove this flawed policy and ensure proper access control

-- Step 1: Drop the ineffective "Deny all anonymous access" policy
DROP POLICY IF EXISTS "Deny all anonymous access to profiles" ON public.profiles;

-- Step 2: Ensure the existing "Users view own profile only" policy is restrictive
-- First drop it if it exists
DROP POLICY IF EXISTS "Users view own profile only" ON public.profiles;

-- Recreate it with explicit TO authenticated clause
CREATE POLICY "Users view own profile only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Step 3: Ensure admin policy is secure and uses has_role function
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;

CREATE POLICY "Admins view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 4: Ensure UPDATE policy is restrictive
DROP POLICY IF EXISTS "Users update own profile only" ON public.profiles;

CREATE POLICY "Users update own profile only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 5: Ensure INSERT policy only allows users to create their own profile
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;

CREATE POLICY "Users insert own profile only" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Step 6: Maintain DELETE prevention
DROP POLICY IF EXISTS "Prevent profile deletion" ON public.profiles;

CREATE POLICY "Prevent profile deletion" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (false);

-- Step 7: Add audit trigger for Stripe account modifications to detect privilege escalation attempts
CREATE OR REPLACE FUNCTION public.audit_stripe_account_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when Stripe Connect account ID is modified
  IF (OLD.stripe_connect_account_id IS DISTINCT FROM NEW.stripe_connect_account_id) THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      ip_address,
      created_at
    ) VALUES (
      auth.uid(),
      'stripe_account_modified',
      'profiles',
      NEW.id,
      inet_client_addr(),
      now()
    );
  END IF;
  
  -- Log when host status changes
  IF (OLD.is_host IS DISTINCT FROM NEW.is_host OR OLD.host_approved IS DISTINCT FROM NEW.host_approved) THEN
    INSERT INTO public.security_audit_log (
      user_id,
      action,
      table_name,
      record_id,
      ip_address,
      created_at
    ) VALUES (
      auth.uid(),
      'host_status_modified',
      'profiles',
      NEW.id,
      inet_client_addr(),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auditing (drop first if exists to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_audit_stripe_changes ON public.profiles;

CREATE TRIGGER trigger_audit_stripe_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_stripe_account_changes();

-- Step 8: Fix missing DELETE policy for booking_messages to prevent evidence tampering
CREATE POLICY "No one can delete messages" 
ON public.booking_messages 
FOR DELETE 
TO authenticated
USING (false);