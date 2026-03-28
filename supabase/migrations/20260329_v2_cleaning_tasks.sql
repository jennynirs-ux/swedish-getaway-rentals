-- V2 Phase 1: Cleaning task management
-- Auto-creates tasks on booking checkout, supports token-based completion by cleaners

CREATE TABLE IF NOT EXISTS public.cleaning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'in_progress', 'completed')),
  cleaner_name TEXT,
  cleaner_email TEXT,
  completion_token UUID NOT NULL DEFAULT gen_random_uuid(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_property ON public.cleaning_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_date ON public.cleaning_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_status ON public.cleaning_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cleaning_tasks_token ON public.cleaning_tasks(completion_token);

CREATE TRIGGER update_cleaning_tasks_updated_at
  BEFORE UPDATE ON public.cleaning_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.cleaning_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cleaning tasks: admin full access"
  ON public.cleaning_tasks FOR ALL
  USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Cleaning tasks: hosts manage own properties"
  ON public.cleaning_tasks FOR ALL
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.profiles pr ON p.host_id = pr.id
      WHERE pr.user_id = auth.uid()
    )
  );

-- Auto-create cleaning task when a booking is confirmed
CREATE OR REPLACE FUNCTION public.create_cleaning_task_on_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    INSERT INTO public.cleaning_tasks (booking_id, property_id, scheduled_date)
    VALUES (NEW.id, NEW.property_id, NEW.check_out_date)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_cleaning_on_booking_confirmed
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_cleaning_task_on_booking();

COMMENT ON TABLE public.cleaning_tasks IS
'Cleaning tasks auto-created on booking checkout. Cleaners complete via token link (no login).';
