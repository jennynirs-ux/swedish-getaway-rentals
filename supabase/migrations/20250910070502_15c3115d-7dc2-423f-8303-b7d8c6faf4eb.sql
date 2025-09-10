-- Create a security definer function to safely check admin status
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_user_admin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = user_id_param),
    false
  );
$$;

-- Drop and recreate the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view own profile, admins can view all" ON public.profiles;

-- Create new policy using the security definer function
CREATE POLICY "Users can view own profile, admins can view all" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  public.is_user_admin_safe(auth.uid())
);

-- Also update other policies that might have similar issues
DROP POLICY IF EXISTS "Admins can view all guest messages" ON public.guest_messages;
CREATE POLICY "Admins can view all guest messages" 
ON public.guest_messages 
FOR SELECT 
USING (public.is_user_admin_safe(auth.uid()));

DROP POLICY IF EXISTS "Admins can update guest messages" ON public.guest_messages;
CREATE POLICY "Admins can update guest messages" 
ON public.guest_messages 
FOR UPDATE 
USING (public.is_user_admin_safe(auth.uid()));

DROP POLICY IF EXISTS "Only admins can modify availability" ON public.availability;
CREATE POLICY "Only admins can modify availability" 
ON public.availability 
FOR ALL 
USING (public.is_user_admin_safe(auth.uid()));

DROP POLICY IF EXISTS "Admins can do everything with properties" ON public.properties;
CREATE POLICY "Admins can do everything with properties" 
ON public.properties 
FOR ALL 
USING (public.is_user_admin_safe(auth.uid()));

DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings" 
ON public.bookings 
FOR UPDATE 
USING (public.is_user_admin_safe(auth.uid()));

DROP POLICY IF EXISTS "Explicit secure booking access" ON public.bookings;
CREATE POLICY "Explicit secure booking access" 
ON public.bookings 
FOR SELECT 
USING (
  public.is_user_admin_safe(auth.uid()) OR 
  ((user_id IS NOT NULL) AND (user_id = auth.uid()) AND (auth.uid() IS NOT NULL))
);

DROP POLICY IF EXISTS "Admins can view all host applications" ON public.host_applications;
CREATE POLICY "Admins can view all host applications" 
ON public.host_applications 
FOR ALL 
USING (public.is_user_admin_safe(auth.uid()));

DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Only admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (public.is_user_admin_safe(auth.uid()));

DROP POLICY IF EXISTS "Approved hosts can view their own properties" ON public.properties;
CREATE POLICY "Approved hosts can view their own properties" 
ON public.properties 
FOR SELECT 
USING (
  (active = true) OR 
  public.is_user_admin_safe(auth.uid()) OR 
  (host_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE (profiles.user_id = auth.uid()) 
    AND (profiles.is_host = true) 
    AND (profiles.host_approved = true)
  ))
);

DROP POLICY IF EXISTS "Approved hosts can create properties" ON public.properties;
CREATE POLICY "Approved hosts can create properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (
  (NOT public.is_user_admin_safe(auth.uid())) AND 
  (host_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE (profiles.user_id = auth.uid()) 
    AND (profiles.is_host = true) 
    AND (profiles.host_approved = true)
  ))
);

DROP POLICY IF EXISTS "Approved hosts can update their own properties" ON public.properties;
CREATE POLICY "Approved hosts can update their own properties" 
ON public.properties 
FOR UPDATE 
USING (
  (NOT public.is_user_admin_safe(auth.uid())) AND 
  (host_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE (profiles.user_id = auth.uid()) 
    AND (profiles.is_host = true) 
    AND (profiles.host_approved = true)
  ))
);