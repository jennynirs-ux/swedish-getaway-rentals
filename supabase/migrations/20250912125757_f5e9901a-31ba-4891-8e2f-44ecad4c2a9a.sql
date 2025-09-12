-- Update properties table to support dynamic content and host management
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS what_makes_special TEXT,
ADD COLUMN IF NOT EXISTS get_in_touch_info JSONB DEFAULT '{"type": "platform", "contact_email": null, "contact_phone": null}'::jsonb,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.00;

-- Update profiles table to support host applications and status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS host_onboarding_completed BOOLEAN DEFAULT false;

-- Create bookings_commission table to track commission splits
CREATE TABLE IF NOT EXISTS public.bookings_commission (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  total_amount INTEGER NOT NULL,
  host_amount INTEGER NOT NULL,
  platform_commission INTEGER NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bookings_commission
ALTER TABLE public.bookings_commission ENABLE ROW LEVEL SECURITY;

-- Create policies for bookings_commission
CREATE POLICY "Hosts can view their own commission records" 
ON public.bookings_commission 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b 
    JOIN public.properties p ON b.property_id = p.id 
    JOIN public.profiles pr ON p.host_id = pr.id 
    WHERE b.id = booking_id AND pr.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all commission records" 
ON public.bookings_commission 
FOR ALL 
USING (is_user_admin_safe(auth.uid()));

-- Create host_applications table (if not exists, update if exists)
CREATE TABLE IF NOT EXISTS public.host_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  description TEXT NOT NULL,
  experience TEXT,
  contact_phone TEXT,
  property_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Create platform_settings table for global commission rates and settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default platform commission rate
INSERT INTO public.platform_settings (setting_key, setting_value) 
VALUES ('default_commission_rate', '10.00'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS on platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for platform_settings
CREATE POLICY "Admins can manage platform settings" 
ON public.platform_settings 
FOR ALL 
USING (is_user_admin_safe(auth.uid()));

-- Update properties table to ensure all necessary fields exist
ALTER TABLE public.properties 
ALTER COLUMN description DROP NOT NULL,
ALTER COLUMN description SET DEFAULT '';

-- Update triggers for new tables
CREATE TRIGGER update_bookings_commission_updated_at
  BEFORE UPDATE ON public.bookings_commission
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate commission split
CREATE OR REPLACE FUNCTION public.calculate_commission_split(
  total_amount_param INTEGER,
  commission_rate_param DECIMAL DEFAULT 10.00
)
RETURNS TABLE(host_amount INTEGER, platform_commission INTEGER)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY SELECT 
    FLOOR(total_amount_param * (100 - commission_rate_param) / 100)::INTEGER as host_amount,
    CEIL(total_amount_param * commission_rate_param / 100)::INTEGER as platform_commission;
END;
$$;