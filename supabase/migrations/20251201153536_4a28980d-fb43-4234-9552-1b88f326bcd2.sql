-- Add applicable_to field to coupons table to specify usage type
ALTER TABLE coupons 
ADD COLUMN applicable_to text NOT NULL DEFAULT 'bookings';

-- Add check constraint
ALTER TABLE coupons 
ADD CONSTRAINT coupons_applicable_to_check 
CHECK (applicable_to IN ('bookings', 'products', 'both'));