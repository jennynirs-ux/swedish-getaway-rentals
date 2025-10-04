-- Add pricing and policy fields to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS weekly_discount_percentage numeric DEFAULT 0 CHECK (weekly_discount_percentage >= 0 AND weekly_discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS monthly_discount_percentage numeric DEFAULT 0 CHECK (monthly_discount_percentage >= 0 AND monthly_discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS cancellation_policy text DEFAULT 'moderate' CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict'));

-- Add comment for clarity
COMMENT ON COLUMN public.properties.weekly_discount_percentage IS 'Discount percentage for bookings of 7+ nights';
COMMENT ON COLUMN public.properties.monthly_discount_percentage IS 'Discount percentage for bookings of 30+ nights';
COMMENT ON COLUMN public.properties.cancellation_policy IS 'Cancellation policy: flexible, moderate, or strict';