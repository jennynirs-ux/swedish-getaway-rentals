-- Create booking_messages table for chat between guests and hosts
CREATE TABLE public.booking_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('guest', 'host', 'admin', 'system')),
  sender_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'attachment')),
  read_by_guest BOOLEAN NOT NULL DEFAULT false,
  read_by_host BOOLEAN NOT NULL DEFAULT false,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Add foreign key to bookings table
ALTER TABLE public.booking_messages 
ADD CONSTRAINT booking_messages_booking_id_fkey 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Create policies for booking messages
CREATE POLICY "Guests can view messages for their bookings" 
ON public.booking_messages 
FOR SELECT 
USING (
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE (user_id = auth.uid() OR guest_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
  )
);

CREATE POLICY "Hosts can view messages for their property bookings" 
ON public.booking_messages 
FOR SELECT 
USING (
  booking_id IN (
    SELECT b.id FROM public.bookings b
    JOIN public.properties p ON b.property_id = p.id
    JOIN public.profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all messages" 
ON public.booking_messages 
FOR SELECT 
USING (is_user_admin_safe(auth.uid()));

-- Insert policies for guests and hosts
CREATE POLICY "Guests can send messages for their bookings" 
ON public.booking_messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'guest' AND
  booking_id IN (
    SELECT id FROM public.bookings 
    WHERE (user_id = auth.uid() OR guest_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
  )
);

CREATE POLICY "Hosts can send messages for their property bookings" 
ON public.booking_messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'host' AND
  booking_id IN (
    SELECT b.id FROM public.bookings b
    JOIN public.properties p ON b.property_id = p.id
    JOIN public.profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid()
  )
);

CREATE POLICY "System and admins can send any messages" 
ON public.booking_messages 
FOR INSERT 
WITH CHECK (
  (sender_type = 'system') OR 
  (sender_type = 'admin' AND is_user_admin_safe(auth.uid()))
);

-- Update policies
CREATE POLICY "Users can update read status of messages" 
ON public.booking_messages 
FOR UPDATE 
USING (
  -- Guests can update read_by_guest for their bookings
  (booking_id IN (
    SELECT id FROM public.bookings 
    WHERE (user_id = auth.uid() OR guest_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    ))
  )) OR
  -- Hosts can update read_by_host for their property bookings
  (booking_id IN (
    SELECT b.id FROM public.bookings b
    JOIN public.properties p ON b.property_id = p.id
    JOIN public.profiles pr ON p.host_id = pr.id
    WHERE pr.user_id = auth.uid()
  )) OR
  -- Admins can update any
  is_user_admin_safe(auth.uid())
);

-- Add trigger for updated_at
CREATE TRIGGER update_booking_messages_updated_at
BEFORE UPDATE ON public.booking_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.booking_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;