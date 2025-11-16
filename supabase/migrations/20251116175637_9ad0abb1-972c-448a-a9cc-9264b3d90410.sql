-- Add check-in instructions, parking info, and local tips to properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS check_in_instructions TEXT,
ADD COLUMN IF NOT EXISTS parking_info TEXT,
ADD COLUMN IF NOT EXISTS local_tips TEXT;