-- Add preparation_days column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS preparation_days INTEGER DEFAULT 0;

COMMENT ON COLUMN public.properties.preparation_days IS 'Number of days required between bookings for cleaning and preparation';

-- Create a function to automatically block preparation days around bookings
CREATE OR REPLACE FUNCTION public.block_preparation_days()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    prep_days INTEGER;
    loop_date DATE;
BEGIN
    -- Only process confirmed bookings
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- Get preparation days for this property
        SELECT preparation_days INTO prep_days
        FROM public.properties
        WHERE id = NEW.property_id;
        
        -- Block preparation days before check-in
        IF prep_days > 0 THEN
            loop_date := NEW.check_in_date - prep_days;
            WHILE loop_date < NEW.check_in_date LOOP
                INSERT INTO public.availability (property_id, date, available, reason)
                VALUES (NEW.property_id, loop_date, false, 'preparation')
                ON CONFLICT (property_id, date) 
                DO UPDATE SET 
                    available = false, 
                    reason = 'preparation';
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            -- Block preparation days after check-out
            loop_date := NEW.check_out_date;
            WHILE loop_date < NEW.check_out_date + prep_days LOOP
                INSERT INTO public.availability (property_id, date, available, reason)
                VALUES (NEW.property_id, loop_date, false, 'preparation')
                ON CONFLICT (property_id, date) 
                DO UPDATE SET 
                    available = false, 
                    reason = 'preparation';
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
        END IF;
    END IF;
    
    -- Free up preparation days if booking is cancelled
    IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
        SELECT preparation_days INTO prep_days
        FROM public.properties
        WHERE id = NEW.property_id;
        
        IF prep_days > 0 THEN
            -- Remove preparation days before check-in
            loop_date := NEW.check_in_date - prep_days;
            WHILE loop_date < NEW.check_in_date LOOP
                DELETE FROM public.availability 
                WHERE property_id = NEW.property_id 
                AND date = loop_date 
                AND reason = 'preparation';
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
            
            -- Remove preparation days after check-out
            loop_date := NEW.check_out_date;
            WHILE loop_date < NEW.check_out_date + prep_days LOOP
                DELETE FROM public.availability 
                WHERE property_id = NEW.property_id 
                AND date = loop_date 
                AND reason = 'preparation';
                
                loop_date := loop_date + INTERVAL '1 day';
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for blocking preparation days
DROP TRIGGER IF EXISTS trigger_block_preparation_days ON public.bookings;
CREATE TRIGGER trigger_block_preparation_days
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.block_preparation_days();