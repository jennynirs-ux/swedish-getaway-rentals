-- Create guest messages table
CREATE TABLE public.guest_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  property_id UUID REFERENCES public.properties(id),
  subject TEXT,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on guest_messages
ALTER TABLE public.guest_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for guest_messages
CREATE POLICY "Anyone can insert guest messages" 
ON public.guest_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all guest messages" 
ON public.guest_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));

CREATE POLICY "Admins can update guest messages" 
ON public.guest_messages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND is_admin = true
));

-- Add updated_at trigger for guest_messages
CREATE TRIGGER update_guest_messages_updated_at
  BEFORE UPDATE ON public.guest_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add seasonal pricing support to availability table
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS seasonal_price INTEGER;
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS minimum_nights INTEGER DEFAULT 1;

-- Create a function to get dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'active_rentals', (SELECT COUNT(*) FROM properties WHERE active = true),
    'total_bookings', (SELECT COUNT(*) FROM bookings),
    'upcoming_bookings', (SELECT COUNT(*) FROM bookings WHERE check_in_date >= CURRENT_DATE AND status = 'confirmed'),
    'unread_messages', (SELECT COUNT(*) FROM guest_messages WHERE read = false),
    'monthly_revenue', (
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM bookings 
      WHERE status = 'confirmed' 
      AND created_at >= date_trunc('month', CURRENT_DATE)
    )
  );
$$;

-- Create RLS policy for dashboard stats function (admins only)
CREATE POLICY "Admins can view dashboard stats" 
ON public.profiles 
FOR SELECT 
USING (is_admin = true AND auth.uid() = user_id);