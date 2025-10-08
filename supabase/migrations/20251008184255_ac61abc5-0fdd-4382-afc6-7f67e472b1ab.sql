-- Fix RLS policy for hosts creating properties
-- The policy was checking is_admin first, which prevents hosts from creating properties

DROP POLICY IF EXISTS "Approved hosts can create properties" ON public.properties;

CREATE POLICY "Approved hosts can create properties"
ON public.properties
FOR INSERT
WITH CHECK (
  host_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_host = true
      AND profiles.host_approved = true
  )
);

-- Also ensure hosts can see their own properties even when not active
DROP POLICY IF EXISTS "Approved hosts can view their own properties" ON public.properties;

CREATE POLICY "Approved hosts can view their own properties"
ON public.properties
FOR SELECT
USING (
  active = true 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR host_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.is_host = true
      AND profiles.host_approved = true
  )
);