-- Remove legacy admin functions and update all RLS policies to use has_role()
-- This migration eliminates privilege escalation risks from the deprecated is_admin column

-- Step 1: Update all RLS policies that use legacy admin functions

-- booking_messages: Update "Users can update read status of messages"
DROP POLICY IF EXISTS "Users can update read status of messages" ON public.booking_messages;
CREATE POLICY "Users can update read status of messages"
ON public.booking_messages
FOR UPDATE
TO authenticated
USING (
  (booking_id IN (
    SELECT bookings.id FROM bookings
    WHERE (bookings.user_id = auth.uid() OR bookings.guest_email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text)
  )) 
  OR (booking_id IN (
    SELECT b.id FROM bookings b
    JOIN properties p ON b.property_id = p.id
    JOIN profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- coupon_usages: Update "Users can view their own coupon usages"
DROP POLICY IF EXISTS "Users can view their own coupon usages" ON public.coupon_usages;
CREATE POLICY "Users can view their own coupon usages"
ON public.coupon_usages
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- coupons: Update "Hosts can manage their property coupons"
DROP POLICY IF EXISTS "Hosts can manage their property coupons" ON public.coupons;
CREATE POLICY "Hosts can manage their property coupons"
ON public.coupons
FOR ALL
TO authenticated
USING (
  (property_id IN (
    SELECT p.id FROM properties p
    JOIN profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid()
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- properties: Update "Approved hosts can update their own properties"
DROP POLICY IF EXISTS "Approved hosts can update their own properties" ON public.properties;
CREATE POLICY "Approved hosts can update their own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  (NOT has_role(auth.uid(), 'admin'::app_role))
  AND (host_id IN (
    SELECT profiles.id FROM profiles
    WHERE (profiles.user_id = auth.uid() AND profiles.is_host = true AND profiles.host_approved = true)
  ))
);

-- reviews: Update "Users can update their own reviews"
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
  (reviewer_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- reviews: Update "Users can view published reviews"
DROP POLICY IF EXISTS "Users can view published reviews" ON public.reviews;
CREATE POLICY "Users can view published reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (
  (is_published = true) 
  OR (reviewer_id = auth.uid()) 
  OR (reviewee_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- shop_products: Update "Products are viewable by everyone when visible"
DROP POLICY IF EXISTS "Products are viewable by everyone when visible" ON public.shop_products;
CREATE POLICY "Products are viewable by everyone when visible"
ON public.shop_products
FOR SELECT
TO authenticated
USING (
  (visible = true) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Step 2: Drop the three legacy admin functions
DROP FUNCTION IF EXISTS public.is_admin_secure(uuid);
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
DROP FUNCTION IF EXISTS public.is_user_admin_safe(uuid);

-- Step 3: Drop the is_admin column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- Add comment documenting the change
COMMENT ON TABLE public.profiles IS 'User profiles table. Admin roles are managed through the user_roles table, not stored here.';