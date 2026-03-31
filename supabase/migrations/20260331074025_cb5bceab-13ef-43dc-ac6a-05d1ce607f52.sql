
-- Fix 1: Revoke SELECT on ical_export_secret from anon and authenticated roles
-- This prevents the public SELECT policy from exposing the secret
REVOKE ALL ON TABLE public.properties FROM anon;
GRANT SELECT ON TABLE public.properties TO anon;

-- Revoke column-level access to ical_export_secret for anon and authenticated
REVOKE SELECT (ical_export_secret) ON TABLE public.properties FROM anon;
REVOKE SELECT (ical_export_secret) ON TABLE public.properties FROM authenticated;

-- Fix 2: Fix expenses host policies - currently checking p.host_id = auth.uid() 
-- but host_id references profiles.id, not auth.uid()
DROP POLICY IF EXISTS "Hosts view own property expenses" ON public.expenses;
DROP POLICY IF EXISTS "Hosts create own property expenses" ON public.expenses;

CREATE POLICY "Hosts view own property expenses" ON public.expenses
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN profiles pr ON p.host_id = pr.id
      WHERE p.id = expenses.property_id AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts create own property expenses" ON public.expenses
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN profiles pr ON p.host_id = pr.id
      WHERE p.id = expenses.property_id AND pr.user_id = auth.uid()
    )
  );

-- Add UPDATE and DELETE for hosts on expenses
CREATE POLICY "Hosts update own property expenses" ON public.expenses
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN profiles pr ON p.host_id = pr.id
      WHERE p.id = expenses.property_id AND pr.user_id = auth.uid()
    )
  );

-- Fix 3: Fix cleaning_tasks host policies
DROP POLICY IF EXISTS "Hosts manage own property cleaning tasks" ON public.cleaning_tasks;

CREATE POLICY "Hosts manage own property cleaning tasks" ON public.cleaning_tasks
  FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN profiles pr ON p.host_id = pr.id
      WHERE p.id = cleaning_tasks.property_id AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN profiles pr ON p.host_id = pr.id
      WHERE p.id = cleaning_tasks.property_id AND pr.user_id = auth.uid()
    )
  );
