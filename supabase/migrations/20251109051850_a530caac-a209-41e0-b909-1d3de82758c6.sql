-- Create guestbook entries table
CREATE TABLE public.guestbook_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  stay_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMP WITH TIME ZONE
);

-- Create guestbook tokens table for secure access
CREATE TABLE public.guestbook_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add updated_at trigger for guestbook_entries
CREATE TRIGGER update_guestbook_entries_updated_at
BEFORE UPDATE ON public.guestbook_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestbook_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guestbook_entries
CREATE POLICY "Approved guestbook entries are publicly viewable"
ON public.guestbook_entries
FOR SELECT
USING (status = 'approved');

CREATE POLICY "Authenticated users can create guestbook entries"
ON public.guestbook_entries
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  guest_name IS NOT NULL AND
  guest_email IS NOT NULL AND
  message IS NOT NULL AND
  length(guest_name) >= 2 AND
  length(message) >= 10 AND
  length(message) <= 2000 AND
  guest_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

CREATE POLICY "Admins can view all guestbook entries"
ON public.guestbook_entries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update guestbook entries"
ON public.guestbook_entries
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete guestbook entries"
ON public.guestbook_entries
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for guestbook_tokens
CREATE POLICY "Anyone can validate tokens"
ON public.guestbook_tokens
FOR SELECT
USING (expires_at > now() AND used_at IS NULL);

CREATE POLICY "System can create tokens"
ON public.guestbook_tokens
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can mark tokens as used"
ON public.guestbook_tokens
FOR UPDATE
USING (true);

-- Create index for performance
CREATE INDEX idx_guestbook_entries_property_approved ON public.guestbook_entries(property_id, status, created_at DESC);
CREATE INDEX idx_guestbook_entries_status ON public.guestbook_entries(status);
CREATE INDEX idx_guestbook_tokens_token ON public.guestbook_tokens(token);
CREATE INDEX idx_guestbook_tokens_booking ON public.guestbook_tokens(booking_id);