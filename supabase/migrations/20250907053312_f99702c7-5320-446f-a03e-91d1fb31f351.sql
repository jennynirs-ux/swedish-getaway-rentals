-- Check current policies on properties table and recreate them properly
-- First, get current user profile to set as default host_id
DO $$
DECLARE
    admin_profile_id uuid;
BEGIN
    -- Get the first admin profile ID
    SELECT id INTO admin_profile_id 
    FROM public.profiles 
    WHERE is_admin = true 
    LIMIT 1;
    
    -- Update properties with null host_id to use admin profile
    IF admin_profile_id IS NOT NULL THEN
        UPDATE public.properties 
        SET host_id = admin_profile_id 
        WHERE host_id IS NULL;
    END IF;
END $$;