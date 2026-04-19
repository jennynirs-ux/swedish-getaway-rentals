-- Phase 4 Step 4: Host message templates
-- Hosts can define reusable messages with triggers (confirmation, pre-arrival, etc.)

CREATE TABLE IF NOT EXISTS public.host_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'booking_confirmed',
    'days_before_checkin',
    'day_of_checkin',
    'day_after_checkout'
  )),
  trigger_days INTEGER,
  subject TEXT DEFAULT '',
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_msg_templates_host ON public.host_message_templates(host_id);
CREATE INDEX IF NOT EXISTS idx_host_msg_templates_trigger ON public.host_message_templates(trigger_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_host_message_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_host_message_templates_updated_at
      BEFORE UPDATE ON public.host_message_templates
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.host_message_templates ENABLE ROW LEVEL SECURITY;

-- Host sees and manages only their own templates
CREATE POLICY "Host message templates: host owns"
  ON public.host_message_templates FOR ALL
  USING (
    host_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Host message templates: admin full"
  ON public.host_message_templates FOR ALL
  USING (public.is_user_admin(auth.uid()));

COMMENT ON TABLE public.host_message_templates IS
'Reusable guest message templates with triggers. Automated dispatch requires a scheduled edge function (future work).';
