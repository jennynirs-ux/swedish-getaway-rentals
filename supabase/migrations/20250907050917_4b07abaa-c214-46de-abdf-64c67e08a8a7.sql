-- Add the missing foreign key constraint to properties table that might be causing issues
-- Also fix any missing triggers

-- Add proper foreign key constraint if missing
DO $$ 
BEGIN
    -- Check if foreign key constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'properties_host_id_fkey' 
        AND table_name = 'properties'
    ) THEN
        ALTER TABLE public.properties 
        ADD CONSTRAINT properties_host_id_fkey 
        FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Make sure the updated_at trigger exists for properties
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Make sure the updated_at trigger exists for profiles  
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();