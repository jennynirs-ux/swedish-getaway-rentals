-- First, let's check and fix the infinite recursion in the profiles table RLS policies
-- Drop the problematic policy that's causing recursion
DROP POLICY IF EXISTS "Admins can view dashboard stats" ON public.profiles;

-- The issue is that we're trying to reference the profiles table from within a profiles policy
-- Let's create a proper security definer function to check admin status

CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE profiles.user_id = $1),
    false
  );
$$;

-- Now let's make sure the profiles table has the correct policies without recursion
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a simple admin policy using our function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  public.is_admin_user(auth.uid()) = true 
  OR auth.uid() = user_id
);