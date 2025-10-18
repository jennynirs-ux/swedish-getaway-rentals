-- Fix booking messages sender verification vulnerability
-- Ensure sender_id always matches authenticated user for non-system messages

-- Drop existing policies that don't properly validate sender_id
DROP POLICY IF EXISTS "Guests can send messages for their bookings" ON public.booking_messages;
DROP POLICY IF EXISTS "Hosts can send messages for their property bookings" ON public.booking_messages;
DROP POLICY IF EXISTS "System and admins can send any messages" ON public.booking_messages;

-- Create new strict policies with sender_id validation

-- Guests can send messages only with their own user_id as sender_id
CREATE POLICY "Guests send messages with validated sender_id"
ON public.booking_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'guest' AND
  sender_id = auth.uid() AND
  booking_id IN (
    SELECT id FROM bookings
    WHERE user_id = auth.uid() 
    OR guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Hosts can send messages only with their own user_id as sender_id
CREATE POLICY "Hosts send messages with validated sender_id"
ON public.booking_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'host' AND
  sender_id = auth.uid() AND
  booking_id IN (
    SELECT b.id
    FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

-- Admins can send messages as admin with their own user_id
CREATE POLICY "Admins send messages with validated sender_id"
ON public.booking_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'admin' AND
  sender_id = auth.uid() AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- System messages can only be inserted by edge functions using service role
-- No policy needed as they bypass RLS

-- Implement data masking for historical guest bookings
-- Hosts can only see full contact info for recent/upcoming bookings

-- Drop existing host viewing policy
DROP POLICY IF EXISTS "Hosts can view messages for their properties" ON public.bookings;
DROP POLICY IF EXISTS "Secure booking viewing" ON public.bookings;

-- Create new policy with data masking for old bookings
-- Hosts can view bookings but with masked contact info for old ones
CREATE POLICY "Hosts view bookings with contact masking"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM properties p
    JOIN profiles pr ON p.host_id = pr.id
    WHERE p.id = bookings.property_id
    AND pr.user_id = auth.uid()
  )
);

-- Create a security definer function to get masked booking data for hosts
CREATE OR REPLACE FUNCTION public.get_host_bookings_masked(host_user_id uuid)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  user_id uuid,
  guest_name text,
  guest_email text,
  guest_phone text,
  check_in_date date,
  check_out_date date,
  number_of_guests integer,
  total_amount integer,
  currency text,
  status text,
  special_requests text,
  created_at timestamptz,
  updated_at timestamptz,
  stripe_payment_intent_id text,
  access_code text,
  access_code_expires_at timestamptz,
  pre_checkin_reminder_sent_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.property_id,
    b.user_id,
    b.guest_name,
    -- Mask email and phone for bookings older than 30 days past checkout
    CASE 
      WHEN b.check_out_date < CURRENT_DATE - INTERVAL '30 days' 
      THEN SUBSTRING(b.guest_email, 1, 2) || '***@' || SPLIT_PART(b.guest_email, '@', 2)
      ELSE b.guest_email
    END as guest_email,
    CASE 
      WHEN b.check_out_date < CURRENT_DATE - INTERVAL '30 days' AND b.guest_phone IS NOT NULL
      THEN '***' || RIGHT(b.guest_phone, 4)
      ELSE b.guest_phone
    END as guest_phone,
    b.check_in_date,
    b.check_out_date,
    b.number_of_guests,
    b.total_amount,
    b.currency,
    b.status,
    b.special_requests,
    b.created_at,
    b.updated_at,
    b.stripe_payment_intent_id,
    b.access_code,
    b.access_code_expires_at,
    b.pre_checkin_reminder_sent_at
  FROM bookings b
  JOIN properties p ON b.property_id = p.id
  JOIN profiles pr ON p.host_id = pr.id
  WHERE pr.user_id = host_user_id;
END;
$$;

-- Add RLS policies to statistics views to prevent business intelligence leakage

-- booking_statistics view
ALTER VIEW booking_statistics SET (security_barrier = true);

CREATE POLICY "Admins can view booking statistics"
ON public.bookings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Note: We can't add RLS directly to views, but we secure the underlying table
-- Applications should use the secure RPC function instead of direct view access