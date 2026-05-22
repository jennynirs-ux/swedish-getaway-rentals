
CREATE OR REPLACE FUNCTION public.consume_guestbook_token(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.guestbook_tokens
     SET used_at = now()
   WHERE token = _token
     AND used_at IS NULL
     AND expires_at > now();
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_guestbook_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_guestbook_token(text) TO anon, authenticated;
