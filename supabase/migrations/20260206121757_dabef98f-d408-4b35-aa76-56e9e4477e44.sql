-- Fix: Create a secure view for bookings with automatic masking for hosts
-- Using correct syntax for security_invoker

CREATE OR REPLACE VIEW public.bookings_secure 
WITH (security_invoker = true) AS
SELECT 
  b.id,
  b.property_id,
  b.user_id,
  b.guest_name,
  -- Mask email for hosts (not admins or booking owners)
  CASE 
    WHEN b.user_id = auth.uid() THEN b.guest_email
    WHEN public.has_role(auth.uid(), 'admin') THEN b.guest_email
    WHEN b.check_in_date <= CURRENT_DATE AND b.check_out_date >= CURRENT_DATE THEN b.guest_email
    WHEN b.check_in_date > CURRENT_DATE AND b.check_in_date <= CURRENT_DATE + INTERVAL '3 days' THEN b.guest_email
    ELSE SUBSTRING(b.guest_email, 1, 2) || '***@' || SPLIT_PART(b.guest_email, '@', 2)
  END as guest_email,
  -- Mask phone for hosts
  CASE 
    WHEN b.user_id = auth.uid() THEN b.guest_phone
    WHEN public.has_role(auth.uid(), 'admin') THEN b.guest_phone
    WHEN b.check_in_date <= CURRENT_DATE AND b.check_out_date >= CURRENT_DATE THEN b.guest_phone
    WHEN b.check_in_date > CURRENT_DATE AND b.check_in_date <= CURRENT_DATE + INTERVAL '3 days' THEN b.guest_phone
    WHEN b.guest_phone IS NULL THEN NULL
    ELSE '***' || RIGHT(b.guest_phone, 4)
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
  -- Always mask access code for hosts
  CASE 
    WHEN b.user_id = auth.uid() THEN b.access_code
    WHEN public.has_role(auth.uid(), 'admin') THEN b.access_code
    ELSE NULL
  END as access_code,
  b.access_code_expires_at,
  b.pre_checkin_reminder_sent_at
FROM public.bookings b;

-- Grant access to the secure view
GRANT SELECT ON public.bookings_secure TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.bookings_secure IS 'Secure view for bookings with automatic contact masking. Hosts see masked contact info except during/near the stay period.';