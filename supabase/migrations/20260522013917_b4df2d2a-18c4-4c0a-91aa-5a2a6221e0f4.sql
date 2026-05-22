
-- 1. Hide ical_export_secret from public/authenticated SELECTs (column-level revoke)
REVOKE SELECT (ical_export_secret) ON public.properties FROM anon, authenticated;

-- 2. Hide guest_email on guestbook_entries from anon (and authenticated non-admin)
REVOKE SELECT (guest_email) ON public.guestbook_entries FROM anon, authenticated;

-- 3. Tighten guestbook_tokens: only service_role can INSERT/UPDATE
DROP POLICY IF EXISTS "System can create tokens" ON public.guestbook_tokens;
DROP POLICY IF EXISTS "System can mark tokens as used" ON public.guestbook_tokens;

CREATE POLICY "Service role can create tokens"
  ON public.guestbook_tokens
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update tokens"
  ON public.guestbook_tokens
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Tighten coupon_usages INSERT to authenticated owner only
DROP POLICY IF EXISTS "Users can create coupon usages" ON public.coupon_usages;

CREATE POLICY "Authenticated users can create their own coupon usages"
  ON public.coupon_usages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 5. Restrict realtime.messages: only service role can subscribe by default.
-- Enables RLS so unauthorized subscriptions are blocked. App-specific realtime
-- subscriptions remain available via server-side broadcasts using service_role.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'realtime' AND table_name = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    -- Drop any prior permissive policy we own
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can read own bookings channel" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access" ON realtime.messages';

    EXECUTE $POL$
      CREATE POLICY "Service role full access"
      ON realtime.messages
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
    $POL$;
  END IF;
END $$;
