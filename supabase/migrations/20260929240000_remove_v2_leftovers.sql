-- Remove what the abandoned v2-features branch left in the database (the
-- branch is kept as the git tag archive/v2-features). All of it was unused
-- by the site and the tables were empty.
DROP TRIGGER IF EXISTS booking_cleaning_task ON public.bookings;
DROP FUNCTION IF EXISTS public.auto_create_cleaning_task();
DROP TABLE IF EXISTS public.cleaning_tasks;

DROP FUNCTION IF EXISTS public.cleanup_rate_limits();
DROP TABLE IF EXISTS public.rate_limits;

DROP FUNCTION IF EXISTS public.detect_double_bookings();
