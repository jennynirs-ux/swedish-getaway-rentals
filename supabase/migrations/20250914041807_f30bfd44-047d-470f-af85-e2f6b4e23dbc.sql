-- Add performance indexes for faster queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_active ON public.properties(active) WHERE active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_host_id ON public.properties(host_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_availability_property_date ON public.availability(property_id, date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_property_dates ON public.bookings(property_id, check_in_date, check_out_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Enable real-time updates for properties, availability, and bookings
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.availability REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Add tables to real-time publication
ALTER publication supabase_realtime ADD TABLE public.properties;
ALTER publication supabase_realtime ADD TABLE public.availability;
ALTER publication supabase_realtime ADD TABLE public.bookings;