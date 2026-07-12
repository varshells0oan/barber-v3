
-- 1) Rate limit table (backend-only)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  slug text NOT NULL,
  success boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.login_attempts TO service_role;
CREATE INDEX IF NOT EXISTS login_attempts_lookup
  ON public.login_attempts (ip, slug, created_at DESC);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- Sem policies: apenas service_role acessa (bypassa RLS). Nenhum acesso via anon/authenticated.

-- 2) Rate limit RPCs (SECURITY DEFINER, invocáveis via service_role no server function)
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(_ip text, _slug text)
RETURNS TABLE(allowed boolean, retry_after_seconds int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _fails int; _oldest timestamptz; _wait int;
BEGIN
  SELECT count(*), min(created_at) INTO _fails, _oldest
    FROM public.login_attempts
    WHERE ip = _ip AND slug = _slug AND success = false
      AND created_at > now() - interval '15 minutes';
  IF _fails >= 5 THEN
    _wait := GREATEST(1, extract(epoch from (_oldest + interval '15 minutes' - now()))::int);
    RETURN QUERY SELECT false, _wait;
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.check_login_rate_limit(text, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_login_attempt(_ip text, _slug text, _success boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (ip, slug, success)
    VALUES (btrim(coalesce(_ip,'unknown')), btrim(coalesce(_slug,'')), _success);
  -- housekeeping
  DELETE FROM public.login_attempts WHERE created_at < now() - interval '1 day';
END $$;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, text, boolean) FROM public, anon, authenticated;

-- 3) Enforce senha >= 6 + invalida sessões antigas ao trocar credenciais
CREATE OR REPLACE FUNCTION public.set_barbershop_admin_credentials(_barbershop_id uuid, _username text, _password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _u text; _p text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  _u := lower(btrim(coalesce(_username, '')));
  _p := coalesce(_password, '');
  IF length(_u) < 2 THEN RAISE EXCEPTION 'INVALID_USERNAME'; END IF;
  IF length(_p) < 6 THEN RAISE EXCEPTION 'PASSWORD_TOO_SHORT'; END IF;
  UPDATE public.barbershops
     SET admin_username = _u,
         admin_password_hash = crypt(_p, gen_salt('bf')),
         updated_at = now()
   WHERE id = _barbershop_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'BARBERSHOP_NOT_FOUND'; END IF;
  DELETE FROM public.access_sessions WHERE barbershop_id = _barbershop_id AND kind = 'admin';
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.set_barber_credentials(_admin_token uuid, _barber_id uuid, _username text, _password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _s record; _barber record; _u text;
BEGIN
  SELECT kind, barbershop_id INTO _s FROM public.access_sessions
   WHERE token = _admin_token AND expires_at > now() AND kind='admin' LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  SELECT id, barbershop_id INTO _barber FROM public.barbers WHERE id = _barber_id;
  IF NOT FOUND OR _barber.barbershop_id <> _s.barbershop_id THEN
    RAISE EXCEPTION 'BARBER_NOT_FOUND';
  END IF;
  _u := lower(btrim(coalesce(_username,'')));
  IF _u = '' OR coalesce(_password,'') = '' THEN
    UPDATE public.barbers SET access_username = NULL, access_password_hash = NULL, updated_at = now()
     WHERE id = _barber_id;
  ELSE
    IF length(_password) < 6 THEN RAISE EXCEPTION 'PASSWORD_TOO_SHORT'; END IF;
    UPDATE public.barbers
       SET access_username = _u,
           access_password_hash = crypt(_password, gen_salt('bf')),
           updated_at = now()
     WHERE id = _barber_id;
  END IF;
  DELETE FROM public.access_sessions WHERE barber_id = _barber_id AND kind = 'barber';
  RETURN true;
END $$;

-- 4) Login RPCs com rate limit embutido (usa headers HTTP não disponíveis aqui,
--    então rate limit real é feito no server function do frontend.
--    Aqui só reforçamos que a função ainda funciona pra quando for wired.)
