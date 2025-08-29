-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  max_guests INTEGER NOT NULL DEFAULT 4,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms INTEGER NOT NULL DEFAULT 1,
  price_per_night INTEGER NOT NULL, -- Price in cents
  currency TEXT NOT NULL DEFAULT 'SEK',
  amenities TEXT[], -- Array of amenity names
  hero_image_url TEXT,
  gallery_images TEXT[], -- Array of image URLs
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_guests INTEGER NOT NULL,
  total_amount INTEGER NOT NULL, -- Total price in cents
  currency TEXT NOT NULL DEFAULT 'SEK',
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create availability table for blocking dates
CREATE TABLE public.availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  reason TEXT, -- e.g., 'maintenance', 'owner_use', 'booked'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, date)
);

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for properties (public read, admin write)
CREATE POLICY "Properties are viewable by everyone" 
ON public.properties FOR SELECT 
USING (active = true);

CREATE POLICY "Only admins can modify properties" 
ON public.properties FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Policies for bookings
CREATE POLICY "Users can view their own bookings" 
ON public.bookings FOR SELECT 
USING (auth.uid() = user_id OR guest_email = auth.email());

CREATE POLICY "Anyone can create bookings" 
ON public.bookings FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all bookings" 
ON public.bookings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Admins can update bookings" 
ON public.bookings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Policies for availability
CREATE POLICY "Availability is viewable by everyone" 
ON public.availability FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify availability" 
ON public.availability FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  )
);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  property_id_param UUID,
  check_in_param DATE,
  check_out_param DATE,
  booking_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check for overlapping bookings
  RETURN EXISTS (
    SELECT 1 FROM public.bookings
    WHERE property_id = property_id_param
    AND status IN ('confirmed', 'pending')
    AND (booking_id_param IS NULL OR id != booking_id_param)
    AND (
      (check_in_date <= check_in_param AND check_out_date > check_in_param)
      OR (check_in_date < check_out_param AND check_out_date >= check_out_param)
      OR (check_in_date >= check_in_param AND check_out_date <= check_out_param)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update availability when booking is confirmed
CREATE OR REPLACE FUNCTION public.update_availability_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  loop_date DATE;
BEGIN
  -- Only update availability when status changes to confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Mark dates as unavailable
    loop_date := NEW.check_in_date;
    WHILE loop_date < NEW.check_out_date LOOP
      INSERT INTO public.availability (property_id, date, available, reason)
      VALUES (NEW.property_id, loop_date, false, 'booked')
      ON CONFLICT (property_id, date) 
      DO UPDATE SET available = false, reason = 'booked';
      
      loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
  END IF;
  
  -- Free up dates if booking is cancelled
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    loop_date := NEW.check_in_date;
    WHILE loop_date < NEW.check_out_date LOOP
      DELETE FROM public.availability 
      WHERE property_id = NEW.property_id 
      AND date = loop_date 
      AND reason = 'booked';
      
      loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update availability on booking changes
CREATE TRIGGER update_availability_on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_availability_on_booking();

-- Insert initial properties data
INSERT INTO public.properties (title, description, location, max_guests, bedrooms, bathrooms, price_per_night, amenities, hero_image_url) VALUES 
(
  'Villa Hacken',
  'Experience the ultimate Swedish getaway at Villa Hacken, a stunning lakeside retreat that perfectly blends modern luxury with rustic charm.',
  'Hackeberga, Sweden',
  8,
  4,
  2,
  450000, -- 4500 SEK in öre
  ARRAY['Lake Access', 'Sauna', 'Fireplace', 'Full Kitchen', 'WiFi', 'Parking', 'BBQ Area', 'Boat Access'],
  '/src/assets/villa-hero.jpg'
),
(
  'Lakehouse Getaway',
  'Escape to this charming lakehouse getaway, perfect for families and groups seeking tranquility by the water.',
  'Swedish Lakeland',
  6,
  3,
  2,
  350000, -- 3500 SEK in öre
  ARRAY['Lake Access', 'Kayaks', 'Fire Pit', 'Full Kitchen', 'WiFi', 'Deck', 'Forest Trails'],
  '/src/assets/lakehouse-hero.jpg'
);