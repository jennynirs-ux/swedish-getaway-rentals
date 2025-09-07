-- Fix RLS policies for properties table to allow admin operations
-- First, drop existing conflicting policies
DROP POLICY IF EXISTS "Hosts can create properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Only admins can modify properties" ON public.properties;

-- Create new simplified policies that prioritize admin access
CREATE POLICY "Admins can do everything with properties" 
ON public.properties 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Approved hosts can create properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  ) AND
  host_id IN (
    SELECT profiles.id FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_host = true 
    AND profiles.host_approved = true
  )
);

CREATE POLICY "Approved hosts can update their own properties" 
ON public.properties 
FOR UPDATE 
USING (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  ) AND
  host_id IN (
    SELECT profiles.id FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_host = true 
    AND profiles.host_approved = true
  )
);

CREATE POLICY "Approved hosts can view their own properties" 
ON public.properties 
FOR SELECT 
USING (
  active = true OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  ) OR
  host_id IN (
    SELECT profiles.id FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_host = true 
    AND profiles.host_approved = true
  )
);

-- Set a default host_id for existing properties that have null host_id
-- This will help with admin operations
UPDATE public.properties 
SET host_id = (
  SELECT id FROM public.profiles 
  WHERE is_admin = true 
  LIMIT 1
) 
WHERE host_id IS NULL;