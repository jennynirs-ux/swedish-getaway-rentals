-- Phase 1: Critical Security Fixes (Corrected)

-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create secure user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create secure role checking function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 4. Create function to check if user is admin (for backward compatibility)
CREATE OR REPLACE FUNCTION public.is_admin_secure_new(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_id_param, 'admin');
$$;

-- 5. RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Only admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Migrate existing admin users to user_roles table
INSERT INTO public.user_roles (user_id, role, assigned_by)
SELECT user_id, 'admin'::app_role, user_id
FROM public.profiles 
WHERE is_admin = true;

-- 7. Update profiles RLS policies to be more secure
DROP POLICY IF EXISTS "Users can view own profile, admins can view all" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Update other critical RLS policies to use new admin function

-- Update bookings policies
DROP POLICY IF EXISTS "Explicit secure booking access" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;

CREATE POLICY "Secure booking access"
ON public.bookings
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  (user_id IS NOT NULL AND user_id = auth.uid() AND auth.uid() IS NOT NULL)
);

CREATE POLICY "Admins can update bookings"
ON public.bookings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Update properties policies
DROP POLICY IF EXISTS "Admins can do everything with properties" ON public.properties;

CREATE POLICY "Admins can manage all properties"
ON public.properties
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update other admin policies
DROP POLICY IF EXISTS "Admins can view all guest messages" ON public.guest_messages;
DROP POLICY IF EXISTS "Admins can update guest messages" ON public.guest_messages;

CREATE POLICY "Admins can view all guest messages"
ON public.guest_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update guest messages"
ON public.guest_messages
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Update shop_products policies
DROP POLICY IF EXISTS "Admins can manage shop products" ON public.shop_products;

CREATE POLICY "Admins can manage shop products"
ON public.shop_products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update security_audit_log policies
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.security_audit_log;

CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update coupons policies (removed incorrect update statement)
DROP POLICY IF EXISTS "Admins can manage all coupons" ON public.coupons;
CREATE POLICY "Admins can manage all coupons"
ON public.coupons
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update availability policies
DROP POLICY IF EXISTS "Only admins can modify availability" ON public.availability;
CREATE POLICY "Only admins can modify availability"
ON public.availability
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update orders policies  
DROP POLICY IF EXISTS "Users can view their own orders, admins can view all" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Update user_favorites policies
DROP POLICY IF EXISTS "Admins can view all favorites" ON public.user_favorites;
CREATE POLICY "Admins can view all favorites"
ON public.user_favorites
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update reviews policies
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
CREATE POLICY "Admins can manage all reviews"
ON public.reviews
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update booking_messages policies
DROP POLICY IF EXISTS "Admins can view all messages" ON public.booking_messages;
CREATE POLICY "Admins can view all messages"
ON public.booking_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update platform_settings policies
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update properties_pricing_rules policies
DROP POLICY IF EXISTS "Admins can manage pricing rules" ON public.properties_pricing_rules;
CREATE POLICY "Admins can manage pricing rules"
ON public.properties_pricing_rules
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update ical_feeds policies
DROP POLICY IF EXISTS "Admins manage ical_feeds" ON public.ical_feeds;
CREATE POLICY "Admins manage ical_feeds"
ON public.ical_feeds
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update host_applications policies
DROP POLICY IF EXISTS "Admins can view all host applications" ON public.host_applications;
CREATE POLICY "Admins can view all host applications"
ON public.host_applications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update bookings_commission policies
DROP POLICY IF EXISTS "Admins can view all commission records" ON public.bookings_commission;
CREATE POLICY "Admins can view all commission records"
ON public.bookings_commission
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));