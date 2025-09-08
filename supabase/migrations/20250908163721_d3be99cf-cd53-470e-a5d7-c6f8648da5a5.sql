-- Fix critical security vulnerability in bookings RLS policy
-- Anonymous bookings (user_id IS NULL) must be explicitly protected

-- Drop the current policy with the security flaw
DROP POLICY IF EXISTS "Admins and users can view relevant bookings" ON public.bookings;

-- Create a more secure policy that explicitly handles all cases
CREATE POLICY "Secure booking access policy"
ON public.bookings
FOR SELECT
USING (
  -- Admins can see all bookings (including anonymous ones)
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
  OR
  -- Users can ONLY see their own authenticated bookings
  -- This explicitly excludes anonymous bookings (user_id IS NULL) for non-admin users
  (auth.uid() = user_id AND user_id IS NOT NULL AND auth.uid() IS NOT NULL)
);

-- Add additional security: Create a function to safely check booking ownership
CREATE OR REPLACE FUNCTION public.user_can_access_booking(booking_row public.bookings)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user owns the booking (must be authenticated booking)
  IF booking_row.user_id IS NOT NULL 
     AND booking_row.user_id = auth.uid() 
     AND auth.uid() IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- Deny access to anonymous bookings for non-admin users
  RETURN false;
END;
$$;

-- Create audit trigger to log booking access attempts
CREATE OR REPLACE FUNCTION public.audit_booking_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all booking access attempts
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    created_at
  ) VALUES (
    auth.uid(),
    'booking_access',
    'bookings',
    NEW.id,
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Add trigger for booking access auditing (only on SELECT would be ideal, but we'll use UPDATE as proxy)
CREATE TRIGGER audit_booking_access_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_booking_access();

-- Add additional constraint to ensure data integrity
ALTER TABLE public.bookings 
ADD CONSTRAINT check_guest_email_format 
CHECK (guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create a view for safer booking queries (optional, for future use)
CREATE OR REPLACE VIEW public.secure_bookings AS
SELECT 
  id,
  property_id,
  guest_name,
  guest_email,
  guest_phone,
  check_in_date,
  check_out_date,
  number_of_guests,
  total_amount,
  status,
  special_requests,
  currency,
  created_at,
  user_id
FROM public.bookings
WHERE user_can_access_booking(bookings.*);

-- Grant appropriate permissions on the view
GRANT SELECT ON public.secure_bookings TO authenticated;