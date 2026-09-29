-- Self-service host signup.
--
-- Before this, nobody could become a host:
-- * prevent_privilege_escalation() rejected every non-admin change to
--   is_host / host_approved, including the signup page's own update;
-- * it also rejected the service role (auth.uid() is NULL there), so
--   create-connect-account could never save a host's Stripe account id;
-- * host_applications.user_id references profiles.id, but the page wrote the
--   auth user id (profiles.id <> profiles.user_id), so the insert failed too.
--
-- become_host() does the whole signup in one trusted step. The trigger now lets
-- the service role and that function through; ordinary users still cannot
-- grant themselves host status or change a Stripe account id.

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Edge functions (service role) and become_host() are trusted
    IF coalesce(auth.role(), '') = 'service_role'
       OR current_setting('app.trusted_host_change', true) = 'on' THEN
      RETURN NEW;
    END IF;

    -- Prevent users from modifying their own Stripe account ID via direct update
    IF (OLD.stripe_connect_account_id IS DISTINCT FROM NEW.stripe_connect_account_id) THEN
      IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can modify Stripe account IDs';
      END IF;
    END IF;

    -- The service fee rate is the platform's revenue: admins only
    IF (OLD.commission_rate IS DISTINCT FROM NEW.commission_rate) THEN
      IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can modify commission rates';
      END IF;
    END IF;

    -- Prevent users from granting themselves host privileges
    IF (OLD.is_host IS DISTINCT FROM NEW.is_host OR OLD.host_approved IS DISTINCT FROM NEW.host_approved) THEN
      IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can modify host status';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Hosts get access right away; their properties stay unpublished until an
-- admin reviews them (properties.pending_approval / active).
CREATE OR REPLACE FUNCTION public.become_host(_business_name text, _contact_phone text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile public.profiles%ROWTYPE;
  _name text := left(btrim(coalesce(_business_name, '')), 200);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _name = '' THEN
    RAISE EXCEPTION 'A property or business name is required';
  END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF _profile.is_host AND _profile.host_approved THEN
    RETURN _profile.id;
  END IF;

  PERFORM set_config('app.trusted_host_change', 'on', true);
  UPDATE public.profiles
  SET is_host = true,
      host_approved = true,
      host_business_name = _name,
      host_onboarding_completed = coalesce(host_onboarding_completed, false)
  WHERE id = _profile.id;
  PERFORM set_config('app.trusted_host_change', 'off', true);

  INSERT INTO public.host_applications (user_id, business_name, description, contact_phone, status, reviewed_at)
  VALUES (_profile.id, _name, 'Self-service host signup',
          nullif(btrim(coalesce(_contact_phone, '')), ''), 'approved', now());

  RETURN _profile.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.become_host(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.become_host(text, text) TO authenticated;

-- host_applications.user_id is a profiles.id; the old policies compared it with
-- auth.uid(), so applicants could neither insert nor see their own rows.
DROP POLICY IF EXISTS "Users can view their own host applications" ON public.host_applications;
CREATE POLICY "Users can view their own host applications"
  ON public.host_applications FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM public.profiles WHERE profiles.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create their own host application" ON public.host_applications;
CREATE POLICY "Users can create their own host application"
  ON public.host_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE profiles.user_id = auth.uid()));

-- Publishing is reviewed: a host can submit (pending_approval) or unpublish
-- their own property, but only an admin (or the service role) can make it
-- active. The host update policy has no WITH CHECK, so this is the guard.
CREATE OR REPLACE FUNCTION public.prevent_self_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.active IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.active IS DISTINCT FROM TRUE)
     AND coalesce(auth.role(), '') <> 'service_role'
     AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can publish a property; submit it for review instead';
  END IF;
  -- An admin publishing it closes the review
  IF NEW.active IS TRUE THEN
    NEW.pending_approval := false;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_self_publish ON public.properties;
CREATE TRIGGER prevent_self_publish
  BEFORE INSERT OR UPDATE OF active ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_publish();
