-- Fix critical RLS policies for data protection

-- 1. Update bookings policies - remove permissive "anyone can create" policy
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

-- Create secure booking creation policy - require guest info validation
CREATE POLICY "Authenticated users and valid guests can create bookings" 
ON public.bookings 
FOR INSERT 
WITH CHECK (
  -- Allow if user is authenticated OR if it's a valid guest booking with required fields
  (auth.uid() IS NOT NULL) OR 
  (
    guest_name IS NOT NULL AND 
    guest_email IS NOT NULL AND 
    length(guest_name) >= 2 AND 
    length(guest_email) >= 5 AND
    guest_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

-- 2. Update orders policies - remove permissive "anyone can create" policy  
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create secure order creation policy - require valid customer info
CREATE POLICY "Valid customers can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  -- Allow if user is authenticated OR if it's a valid guest order with required fields
  (auth.uid() IS NOT NULL) OR 
  (
    customer_name IS NOT NULL AND 
    customer_email IS NOT NULL AND 
    length(customer_name) >= 2 AND 
    length(customer_email) >= 5 AND
    customer_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
    total_amount > 0
  )
);

-- 3. Update guest messages policy - add basic validation
DROP POLICY IF EXISTS "Anyone can insert guest messages" ON public.guest_messages;

-- Create secure guest message policy with validation
CREATE POLICY "Valid users can create guest messages" 
ON public.guest_messages 
FOR INSERT 
WITH CHECK (
  name IS NOT NULL AND 
  email IS NOT NULL AND 
  message IS NOT NULL AND
  length(name) >= 2 AND 
  length(email) >= 5 AND
  length(message) >= 10 AND
  length(message) <= 5000 AND
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- 4. Create rate limiting function for security
CREATE OR REPLACE FUNCTION public.check_user_rate_limit(
  user_identifier text,
  table_name text,
  max_requests integer DEFAULT 5,
  time_window_minutes integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
BEGIN
  -- Count recent requests from this identifier
  CASE table_name
    WHEN 'bookings' THEN
      SELECT COUNT(*) INTO request_count
      FROM bookings 
      WHERE guest_email = user_identifier 
      AND created_at > now() - (time_window_minutes || ' minutes')::interval;
    WHEN 'orders' THEN
      SELECT COUNT(*) INTO request_count
      FROM orders 
      WHERE customer_email = user_identifier 
      AND created_at > now() - (time_window_minutes || ' minutes')::interval;
    WHEN 'guest_messages' THEN
      SELECT COUNT(*) INTO request_count
      FROM guest_messages 
      WHERE email = user_identifier 
      AND created_at > now() - (time_window_minutes || ' minutes')::interval;
    ELSE
      RETURN false;
  END CASE;

  -- Return true if under rate limit
  RETURN request_count < max_requests;
END;
$$;

-- 5. Add rate limiting to guest messages policy
DROP POLICY IF EXISTS "Valid users can create guest messages" ON public.guest_messages;

CREATE POLICY "Rate limited guest messages" 
ON public.guest_messages 
FOR INSERT 
WITH CHECK (
  name IS NOT NULL AND 
  email IS NOT NULL AND 
  message IS NOT NULL AND
  length(name) >= 2 AND 
  length(email) >= 5 AND
  length(message) >= 10 AND
  length(message) <= 5000 AND
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  check_user_rate_limit(email, 'guest_messages', 3, 60)
);

-- 6. Create audit trigger for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_sensitive_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all operations on sensitive tables
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Add audit triggers to sensitive tables
CREATE TRIGGER audit_bookings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

CREATE TRIGGER audit_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();

CREATE TRIGGER audit_guest_messages_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.guest_messages
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operations();