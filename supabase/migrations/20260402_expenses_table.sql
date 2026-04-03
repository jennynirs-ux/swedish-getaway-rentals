-- Phase 2: Property expenses tracking
-- Enables per-property expense logging for profitability and tax reporting

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'cleaning', 'maintenance', 'supplies', 'utilities', 'insurance', 'other'
  )),
  description TEXT,
  amount INTEGER NOT NULL,             -- stored in ore (cents) for consistency with bookings
  currency TEXT NOT NULL DEFAULT 'SEK',
  expense_date DATE NOT NULL,
  receipt_url TEXT,                     -- link to uploaded receipt image
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_property_date ON public.expenses(property_id, expense_date);

-- Auto-update timestamp (uses existing function from properties table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_expenses_updated_at'
  ) THEN
    CREATE TRIGGER update_expenses_updated_at
      BEFORE UPDATE ON public.expenses
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Expenses: admin full access"
  ON public.expenses FOR ALL
  USING (public.is_user_admin(auth.uid()));

-- Hosts can manage expenses for their own properties
CREATE POLICY "Expenses: hosts manage own properties"
  ON public.expenses FOR ALL
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.profiles pr ON p.host_id = pr.id
      WHERE pr.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.expenses IS
'Property expenses for profitability tracking and Skatteverket tax reporting. Amounts in ore (1/100 SEK).';
