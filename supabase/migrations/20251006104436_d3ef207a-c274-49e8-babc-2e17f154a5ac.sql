-- Add check-in/check-out times to properties
ALTER TABLE public.properties
ADD COLUMN check_in_time TIME DEFAULT '15:00:00',
ADD COLUMN check_out_time TIME DEFAULT '11:00:00';

-- Create yale_locks table for smart lock management
CREATE TABLE public.yale_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lock_id TEXT NOT NULL,
  lock_name TEXT,
  api_credentials TEXT, -- encrypted credentials
  access_duration_hours INTEGER DEFAULT 1, -- extra hours after check-out
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, lock_id)
);

-- Create lock_access_log table
CREATE TABLE public.lock_access_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  yale_lock_id UUID NOT NULL REFERENCES public.yale_locks(id) ON DELETE CASCADE,
  access_code TEXT NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, revoked, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID
);

-- Add access_code to bookings for easy reference
ALTER TABLE public.bookings
ADD COLUMN access_code TEXT,
ADD COLUMN access_code_expires_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.yale_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lock_access_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for yale_locks
CREATE POLICY "Admins can manage all yale locks"
ON public.yale_locks FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can manage their property locks"
ON public.yale_locks FOR ALL
USING (
  property_id IN (
    SELECT p.id FROM properties p
    JOIN profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid() AND pr.is_host = true AND pr.host_approved = true
  )
);

-- RLS policies for lock_access_log
CREATE POLICY "Admins can view all access logs"
ON public.lock_access_log FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can view logs for their property bookings"
ON public.lock_access_log FOR SELECT
USING (
  yale_lock_id IN (
    SELECT yl.id FROM yale_locks yl
    JOIN properties p ON yl.property_id = p.id
    JOIN profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Guests can view their own booking access logs"
ON public.lock_access_log FOR SELECT
USING (
  booking_id IN (
    SELECT id FROM bookings
    WHERE user_id = auth.uid() OR guest_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_yale_locks_property ON public.yale_locks(property_id);
CREATE INDEX idx_lock_access_log_booking ON public.lock_access_log(booking_id);
CREATE INDEX idx_lock_access_log_yale_lock ON public.lock_access_log(yale_lock_id);
CREATE INDEX idx_lock_access_log_status ON public.lock_access_log(status);

-- Trigger to update updated_at
CREATE TRIGGER update_yale_locks_updated_at
BEFORE UPDATE ON public.yale_locks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lock_access_log_updated_at
BEFORE UPDATE ON public.lock_access_log
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();