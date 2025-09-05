-- Add host functionality to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_host boolean NOT NULL DEFAULT false,
ADD COLUMN host_approved boolean NOT NULL DEFAULT false,
ADD COLUMN host_application_date timestamp with time zone,
ADD COLUMN host_description text,
ADD COLUMN host_business_name text;

-- Add host_id to properties table to track property ownership
ALTER TABLE public.properties 
ADD COLUMN host_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN pending_approval boolean NOT NULL DEFAULT false;

-- Create host applications table
CREATE TABLE public.host_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  description text NOT NULL,
  experience text,
  property_count integer DEFAULT 0,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS on host_applications
ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for host_applications
CREATE POLICY "Users can view their own host applications"
ON public.host_applications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own host application"
ON public.host_applications
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all host applications"
ON public.host_applications
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.is_admin = true
));

-- Update properties RLS to allow hosts to manage their own properties
CREATE POLICY "Hosts can view their own properties"
ON public.properties
FOR SELECT
USING (
  host_id IN (
    SELECT id FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_host = true 
    AND profiles.host_approved = true
  )
  OR active = true
);

CREATE POLICY "Hosts can create properties"
ON public.properties
FOR INSERT
WITH CHECK (
  host_id IN (
    SELECT id FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_host = true 
    AND profiles.host_approved = true
  )
);

CREATE POLICY "Hosts can update their own properties"
ON public.properties
FOR UPDATE
USING (
  host_id IN (
    SELECT id FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_host = true 
    AND profiles.host_approved = true
  )
);

-- Create function to handle host approval
CREATE OR REPLACE FUNCTION public.approve_host_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_user_id uuid;
BEGIN
  -- Get the user_id from the application
  SELECT user_id INTO app_user_id
  FROM host_applications
  WHERE id = application_id;
  
  -- Update the application status
  UPDATE host_applications
  SET status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = application_id;
  
  -- Update the user profile to become a host
  UPDATE profiles
  SET is_host = true,
      host_approved = true,
      host_application_date = now()
  WHERE user_id = app_user_id;
END;
$$;