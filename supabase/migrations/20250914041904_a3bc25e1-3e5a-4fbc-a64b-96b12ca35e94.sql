-- Add performance indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_properties_active ON public.properties(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_properties_host_id ON public.properties(host_id);
CREATE INDEX IF NOT EXISTS idx_availability_property_date ON public.availability(property_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_property_dates ON public.bookings(property_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Enable real-time updates for properties, availability, and bookings
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.availability REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;