-- Drop existing permissive policies on profiles table
DROP POLICY IF EXISTS "Users view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile only" ON public.profiles;

-- Create restrictive policies that explicitly require authentication
-- and deny all anonymous access

-- SELECT: Only authenticated users can view their own profile
CREATE POLICY "Authenticated users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- SELECT: Admins can view all profiles
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- UPDATE: Only authenticated users can update their own profile
CREATE POLICY "Authenticated users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- INSERT: Only authenticated users can create their own profile
CREATE POLICY "Authenticated users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Explicit deny for anonymous users (redundant but explicit)
CREATE POLICY "Deny all anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);