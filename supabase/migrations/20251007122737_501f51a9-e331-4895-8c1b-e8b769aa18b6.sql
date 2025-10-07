-- Fix bookings table security - simplified to avoid deadlock
-- Remove unused masking function first

DROP FUNCTION IF EXISTS public.mask_profile_sensitive_data();

-- Strengthen bookings RLS without complex triggers
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;

-- Drop and recreate policies one at a time
DO $$ 
BEGIN
  -- Drop old policies if they exist
  DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
  DROP POLICY IF EXISTS "Users can view their own bookings (basic info)" ON public.bookings;
  DROP POLICY IF EXISTS "Only booking guest or admin can view access code" ON public.bookings;
  DROP POLICY IF EXISTS "Authenticated users and valid guests can create bookings" ON public.bookings;
  DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
END $$;

-- SELECT: Only authenticated booking owners, hosts, or admins
CREATE POLICY "Secure booking viewing"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  (user_id IS NOT NULL AND user_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM properties p
    JOIN profiles pr ON p.host_id = pr.id
    WHERE p.id = bookings.property_id 
    AND pr.user_id = auth.uid()
  )
);

-- INSERT: Only authenticated users with valid data
CREATE POLICY "Secure booking creation"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  guest_name IS NOT NULL AND
  guest_email IS NOT NULL AND
  length(guest_name) >= 2 AND
  guest_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- UPDATE: Only admins
CREATE POLICY "Admin only booking updates"
ON public.bookings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- DELETE: Denied for everyone
CREATE POLICY "No booking deletion"
ON public.bookings
FOR DELETE
TO authenticated
USING (false);

-- Add security documentation
COMMENT ON TABLE public.bookings IS 
'SECURITY: Contains PII and access codes. RLS FORCED. Only authenticated users (owner/host/admin) can view.';