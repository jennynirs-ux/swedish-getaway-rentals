-- Fix function search path security warnings
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;