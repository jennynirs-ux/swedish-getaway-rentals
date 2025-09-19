-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.auto_update_availability_on_booking()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    loop_date DATE;
BEGIN
    -- Only process confirmed bookings
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- Mark dates as unavailable from check-in to check-out (exclusive)
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
$$;