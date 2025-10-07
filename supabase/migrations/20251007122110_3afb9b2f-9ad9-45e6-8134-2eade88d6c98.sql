-- Critical Security Fix: Remove is_admin from profiles table
-- First update storage policies that depend on it, then drop the column

-- Update storage policies to use user_roles instead of profiles.is_admin

-- Property Images bucket policies
DROP POLICY IF EXISTS "Admins can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update property images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete property images" ON storage.objects;

CREATE POLICY "Admins can upload property images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update property images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'property-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete property images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'property-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Property Videos bucket policies
DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;

CREATE POLICY "Admins can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'property-videos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update videos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'property-videos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete videos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'property-videos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Now drop is_admin column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- Add encryption notice for Yale API credentials
COMMENT ON COLUMN public.yale_locks.api_credentials IS 'SECURITY: Must be encrypted before storage using application-level encryption';

-- Strengthen bookings RLS for access_code field
DROP POLICY IF EXISTS "Secure booking access" ON public.bookings;

-- Create policy for viewing own bookings
CREATE POLICY "Users can view their own bookings"
ON public.bookings
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (guest_email IS NOT NULL AND guest_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  )
);

-- Improve guest_messages rate limiting
DROP POLICY IF EXISTS "Rate limited guest messages" ON public.guest_messages;

CREATE POLICY "Rate limited guest messages"
ON public.guest_messages
FOR INSERT
WITH CHECK (
  -- Validate required fields
  name IS NOT NULL AND
  email IS NOT NULL AND
  message IS NOT NULL AND
  
  -- Length validation
  length(name) >= 2 AND
  length(email) >= 5 AND
  length(message) >= 10 AND
  length(message) <= 5000 AND
  
  -- Email format validation
  email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  
  -- Enhanced rate limiting (3 messages per hour)
  check_user_rate_limit(email, 'guest_messages', 3, 60)
);