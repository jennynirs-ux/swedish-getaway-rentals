-- Enable realtime for tables that aren't already enabled
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.shop_products REPLICA IDENTITY FULL;

-- Add tables to realtime publication (skip if already added)
DO $$
BEGIN
    -- Add bookings if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;

    -- Add properties if not already in publication  
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'properties'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
    END IF;

    -- Add shop_products if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'shop_products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_products;
    END IF;
END $$;

-- Create trigger to automatically update availability when booking is confirmed
CREATE OR REPLACE FUNCTION public.auto_update_availability_on_booking()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic availability updates
DROP TRIGGER IF EXISTS auto_update_availability_trigger ON public.bookings;
CREATE TRIGGER auto_update_availability_trigger
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_update_availability_on_booking();