-- Create trigger to automatically update availability when bookings are confirmed
CREATE OR REPLACE FUNCTION public.update_availability_on_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loop_date DATE;
  prep_days INTEGER;
BEGIN
  -- Only process when status changes to confirmed
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status != 'confirmed') THEN
    -- Get preparation days for this property
    SELECT preparation_days INTO prep_days
    FROM public.properties
    WHERE id = NEW.property_id;
    
    -- Set preparation days to 0 if null
    prep_days := COALESCE(prep_days, 0);
    
    -- Block preparation days before check-in
    IF prep_days > 0 THEN
      loop_date := NEW.check_in_date - prep_days;
      WHILE loop_date < NEW.check_in_date LOOP
        INSERT INTO public.availability (property_id, date, available, reason)
        VALUES (NEW.property_id, loop_date, false, 'preparation')
        ON CONFLICT (property_id, date) 
        DO UPDATE SET 
          available = false, 
          reason = 'preparation',
          created_at = COALESCE(availability.created_at, now());
        
        loop_date := loop_date + INTERVAL '1 day';
      END LOOP;
    END IF;
    
    -- Mark booking dates as unavailable (check-in to check-out)
    loop_date := NEW.check_in_date;
    WHILE loop_date < NEW.check_out_date LOOP
      INSERT INTO public.availability (property_id, date, available, reason)
      VALUES (NEW.property_id, loop_date, false, 'booked')
      ON CONFLICT (property_id, date) 
      DO UPDATE SET 
        available = false, 
        reason = 'booked',
        created_at = COALESCE(availability.created_at, now());
      
      loop_date := loop_date + INTERVAL '1 day';
    END LOOP;
    
    -- Block preparation days after check-out
    IF prep_days > 0 THEN
      loop_date := NEW.check_out_date;
      WHILE loop_date < NEW.check_out_date + prep_days LOOP
        INSERT INTO public.availability (property_id, date, available, reason)
        VALUES (NEW.property_id, loop_date, false, 'preparation')
        ON CONFLICT (property_id, date) 
        DO UPDATE SET 
          available = false, 
          reason = 'preparation',
          created_at = COALESCE(availability.created_at, now());
        
        loop_date := loop_date + INTERVAL '1 day';
      END LOOP;
    END IF;
  END IF;
  
  -- Free up dates if booking is cancelled
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    SELECT preparation_days INTO prep_days
    FROM public.properties
    WHERE id = NEW.property_id;
    
    prep_days := COALESCE(prep_days, 0);
    
    -- Remove all blocked dates (booking and preparation)
    DELETE FROM public.availability 
    WHERE property_id = NEW.property_id 
    AND date >= (NEW.check_in_date - prep_days)
    AND date < (NEW.check_out_date + prep_days)
    AND reason IN ('booked', 'preparation');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS update_availability_on_booking ON public.bookings;
DROP TRIGGER IF EXISTS auto_update_availability_on_booking ON public.bookings;
DROP TRIGGER IF EXISTS block_preparation_days_trigger ON public.bookings;

-- Create new trigger for availability updates
CREATE TRIGGER update_availability_on_booking_trigger
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_availability_on_booking_confirmed();