-- Fix security issue: Remove guest_email condition from bookings RLS policy
-- This prevents authenticated users from accessing guest bookings just by sharing the same email

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;

-- Create a more secure policy that only allows users to view bookings they created while authenticated
CREATE POLICY "Users can view their own authenticated bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Guest bookings (where user_id is null) should not be viewable by authenticated users
-- If guests need to view their bookings, implement a separate lookup system with booking reference numbers