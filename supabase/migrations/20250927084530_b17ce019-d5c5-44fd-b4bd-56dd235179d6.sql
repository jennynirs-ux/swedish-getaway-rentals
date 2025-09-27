-- Create secure admin check function to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.is_admin_secure(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = user_id_param),
    false
  );
$$;

-- Create audit function for admin actions
CREATE OR REPLACE FUNCTION public.audit_admin_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log admin access attempts
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    created_at
  ) VALUES (
    auth.uid(),
    'admin_access_attempt',
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Enhanced rate limiting function with progressive backoff
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
  identifier text, 
  action_type text,
  max_requests integer DEFAULT 5, 
  window_minutes integer DEFAULT 60,
  progressive_backoff boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_count integer;
  recent_violations integer;
  backoff_multiplier integer := 1;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*)
  INTO request_count
  FROM security_audit_log
  WHERE user_agent = identifier
    AND action = action_type
    AND created_at > now() - (window_minutes || ' minutes')::interval;
  
  -- Check for recent violations if progressive backoff is enabled
  IF progressive_backoff THEN
    SELECT COUNT(*)
    INTO recent_violations
    FROM security_audit_log
    WHERE user_agent = identifier
      AND action = 'rate_limit_violation'
      AND created_at > now() - '24 hours'::interval;
    
    -- Apply progressive backoff
    backoff_multiplier := 1 + recent_violations;
    max_requests := max_requests / backoff_multiplier;
  END IF;
  
  -- Log violation if limit exceeded
  IF request_count >= max_requests THEN
    INSERT INTO security_audit_log (
      user_id, action, table_name, ip_address, user_agent, created_at
    ) VALUES (
      auth.uid(), 'rate_limit_violation', 'rate_limit_check', 
      inet_client_addr(), identifier, now()
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create function to sanitize logs (remove sensitive data)
CREATE OR REPLACE FUNCTION public.sanitize_sensitive_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Remove or mask sensitive fields in logs
  IF TG_TABLE_NAME = 'bookings' THEN
    NEW.guest_email := CASE 
      WHEN LENGTH(NEW.guest_email) > 0 THEN 
        SUBSTRING(NEW.guest_email FROM 1 FOR 2) || '***@' || 
        SPLIT_PART(NEW.guest_email, '@', 2)
      ELSE NEW.guest_email
    END;
    
    NEW.guest_phone := CASE 
      WHEN LENGTH(NEW.guest_phone) > 4 THEN 
        '***' || RIGHT(NEW.guest_phone, 4)
      ELSE NEW.guest_phone
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update RLS policies to use secure admin function
DROP POLICY IF EXISTS "Admins can view all commission records" ON public.bookings_commission;
CREATE POLICY "Admins can view all commission records" 
ON public.bookings_commission 
FOR ALL 
TO authenticated
USING (public.is_admin_secure(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all guest messages" ON public.guest_messages;
CREATE POLICY "Admins can view all guest messages" 
ON public.guest_messages 
FOR SELECT 
TO authenticated
USING (public.is_admin_secure(auth.uid()));

DROP POLICY IF EXISTS "Admins can update guest messages" ON public.guest_messages;
CREATE POLICY "Admins can update guest messages" 
ON public.guest_messages 
FOR UPDATE 
TO authenticated
USING (public.is_admin_secure(auth.uid()));

-- Update other admin policies
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings" 
ON public.bookings 
FOR UPDATE 
TO authenticated
USING (public.is_admin_secure(auth.uid()));

DROP POLICY IF EXISTS "Explicit secure booking access" ON public.bookings;
CREATE POLICY "Explicit secure booking access" 
ON public.bookings 
FOR SELECT 
TO authenticated
USING (
  public.is_admin_secure(auth.uid()) OR 
  ((user_id IS NOT NULL) AND (user_id = auth.uid()) AND (auth.uid() IS NOT NULL))
);