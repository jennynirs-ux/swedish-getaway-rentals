-- Admin host management and the host calendar.
--
-- * approve_host_application() could be called by anyone (even anon) and never
--   worked: it wrote auth.uid() into reviewed_by (a profiles.id) and matched the
--   applicant on profiles.user_id although host_applications.user_id is a
--   profiles.id. The admin "Reject" button called it too. Replaced by an
--   admin-only review_host_application().
-- * Admins could not change a host's service fee rate: profiles has no admin
--   UPDATE policy, so the update matched no rows and "succeeded" silently.
-- * Only admins could write availability, so hosts could not block dates or set
--   prices on their own properties.

DROP FUNCTION IF EXISTS public.approve_host_application(uuid);

CREATE OR REPLACE FUNCTION public.review_host_application(
  _application_id uuid,
  _approve boolean,
  _admin_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _reviewer uuid;
  _applicant uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can review host applications';
  END IF;

  SELECT id INTO _reviewer FROM public.profiles WHERE user_id = auth.uid();

  UPDATE public.host_applications
  SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
      reviewed_at = now(),
      reviewed_by = _reviewer,
      admin_notes = coalesce(_admin_notes, admin_notes)
  WHERE id = _application_id
  RETURNING user_id INTO _applicant;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF _approve THEN
    UPDATE public.profiles
    SET is_host = true,
        host_approved = true,
        host_application_date = coalesce(host_application_date, now())
    WHERE id = _applicant;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.review_host_application(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_host_application(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_host_commission_rate(_profile_id uuid, _rate numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can modify commission rates';
  END IF;
  IF _rate IS NULL OR _rate < 0 OR _rate > 100 THEN
    RAISE EXCEPTION 'Commission rate must be between 0 and 100';
  END IF;

  UPDATE public.profiles SET commission_rate = _rate WHERE id = _profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Host not found';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_host_commission_rate(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_host_commission_rate(uuid, numeric) TO authenticated;

-- Hosts manage their own calendar, but cannot touch dates held by a booking
-- or synced from another channel (Airbnb, Booking, ...).
DROP POLICY IF EXISTS "Hosts manage availability of their own properties" ON public.availability;
CREATE POLICY "Hosts manage availability of their own properties"
  ON public.availability FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.profiles pr ON pr.id = p.host_id
      WHERE pr.user_id = auth.uid() AND pr.is_host AND pr.host_approved
    )
    AND coalesce(reason, '') <> 'booked'
    AND coalesce(reason, '') <> 'ical_sync'
    AND coalesce(reason, '') NOT LIKE 'Blocked by %'
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.profiles pr ON pr.id = p.host_id
      WHERE pr.user_id = auth.uid() AND pr.is_host AND pr.host_approved
    )
    AND (reason IS NULL OR reason IN ('host_blocked', 'preparation'))
  );
