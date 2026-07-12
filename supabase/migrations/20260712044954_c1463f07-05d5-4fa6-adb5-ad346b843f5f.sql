
-- =====================================================
-- 1. AUDIT LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  barbershop_id uuid,
  actor_kind text NOT NULL, -- 'superadmin' | 'admin' | 'barber' | 'public' | 'system'
  actor_id text,             -- user_id, barber_id, phone, or null
  actor_label text,          -- friendly name (username, phone, email)
  event text NOT NULL,       -- 'login_success' | 'login_failed' | 'password_changed' | 'appointment_created' | 'appointment_cancelled' | 'settings_updated' | 'credentials_updated' | 'session_revoked'
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_log_shop_created ON public.audit_log(barbershop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON public.audit_log(event, created_at DESC);

GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- sem policies: apenas service_role e SECURITY DEFINER RPCs

-- helper para registrar eventos
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _barbershop_id uuid,
  _actor_kind text,
  _actor_id text,
  _actor_label text,
  _event text,
  _ip text,
  _user_agent text,
  _metadata jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_log (barbershop_id, actor_kind, actor_id, actor_label, event, ip, user_agent, metadata)
  VALUES (_barbershop_id, _actor_kind, _actor_id, _actor_label, _event, _ip, _user_agent, COALESCE(_metadata, '{}'::jsonb));
$$;

REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid,text,text,text,text,text,text,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid,text,text,text,text,text,text,jsonb) TO authenticated, service_role;

-- =====================================================
-- 2. SESSÕES MAIS CURTAS (7 dias em vez de 30)
-- =====================================================
ALTER TABLE public.access_sessions
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- expira sessões antigas imediatamente (força re-login mais cedo, seguro)
UPDATE public.access_sessions
   SET expires_at = LEAST(expires_at, now() + interval '7 days')
 WHERE expires_at > now() + interval '7 days';

-- =====================================================
-- 3. RATE LIMIT REFORÇADO
-- =====================================================
-- 3a. Limite por IP+slug: 3 falhas em 15 min (antes 5)
-- 3b. Limite global por slug: 20 falhas de qualquer IP em 1 hora
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(_ip text, _slug text)
 RETURNS TABLE(allowed boolean, retry_after_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ip_fails int; _ip_oldest timestamptz;
  _shop_fails int; _shop_oldest timestamptz;
  _wait int;
BEGIN
  -- por IP+slug (janela 15min)
  SELECT count(*), min(created_at) INTO _ip_fails, _ip_oldest
    FROM public.login_attempts
    WHERE ip = _ip AND slug = _slug AND success = false
      AND created_at > now() - interval '15 minutes';

  IF _ip_fails >= 3 THEN
    _wait := GREATEST(1, extract(epoch from (_ip_oldest + interval '15 minutes' - now()))::int);
    RETURN QUERY SELECT false, _wait;
    RETURN;
  END IF;

  -- global por slug (janela 1h) - protege contra botnets
  SELECT count(*), min(created_at) INTO _shop_fails, _shop_oldest
    FROM public.login_attempts
    WHERE slug = _slug AND success = false
      AND created_at > now() - interval '1 hour';

  IF _shop_fails >= 20 THEN
    _wait := GREATEST(1, extract(epoch from (_shop_oldest + interval '1 hour' - now()))::int);
    RETURN QUERY SELECT false, _wait;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 0;
END $function$;

-- =====================================================
-- 4. LOGIN COM AUDITORIA AUTOMÁTICA
-- =====================================================
-- Wrapper que loga sucesso/falha em audit_log automaticamente
CREATE OR REPLACE FUNCTION public.login_barbershop_admin_v2(
  _slug text, _username text, _password text, _ip text, _user_agent text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _shop record; _token uuid;
BEGIN
  SELECT id, admin_username, admin_password_hash INTO _shop
    FROM public.barbershops WHERE slug = _slug AND status = 'active' LIMIT 1;

  IF NOT FOUND OR _shop.admin_password_hash IS NULL
     OR lower(btrim(coalesce(_username,''))) <> _shop.admin_username
     OR _shop.admin_password_hash <> crypt(_password, _shop.admin_password_hash) THEN
    PERFORM public.log_audit_event(
      COALESCE(_shop.id, NULL), 'admin', NULL, lower(btrim(coalesce(_username,''))),
      'login_failed', _ip, _user_agent, jsonb_build_object('slug', _slug)
    );
    RAISE EXCEPTION 'INVALID_CREDENTIALS';
  END IF;

  INSERT INTO public.access_sessions (kind, barbershop_id) VALUES ('admin', _shop.id)
    RETURNING token INTO _token;

  PERFORM public.log_audit_event(
    _shop.id, 'admin', _shop.id::text, _shop.admin_username,
    'login_success', _ip, _user_agent, jsonb_build_object('slug', _slug)
  );

  RETURN _token;
END $$;

REVOKE EXECUTE ON FUNCTION public.login_barbershop_admin_v2(text,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.login_barbershop_admin_v2(text,text,text,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.login_barber_v2(
  _slug text, _username text, _password text, _ip text, _user_agent text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _shop_id uuid; _barber record; _token uuid;
BEGIN
  SELECT id INTO _shop_id FROM public.barbershops WHERE slug = _slug AND status='active';
  IF NOT FOUND THEN
    PERFORM public.log_audit_event(NULL, 'barber', NULL, lower(btrim(coalesce(_username,''))),
      'login_failed', _ip, _user_agent, jsonb_build_object('slug', _slug, 'reason', 'shop_not_found'));
    RAISE EXCEPTION 'INVALID_CREDENTIALS';
  END IF;

  SELECT id, name, access_password_hash INTO _barber FROM public.barbers
   WHERE barbershop_id = _shop_id
     AND access_username = lower(btrim(coalesce(_username,'')))
     AND active = true
   LIMIT 1;

  IF NOT FOUND OR _barber.access_password_hash IS NULL
     OR _barber.access_password_hash <> crypt(_password, _barber.access_password_hash) THEN
    PERFORM public.log_audit_event(_shop_id, 'barber', NULL, lower(btrim(coalesce(_username,''))),
      'login_failed', _ip, _user_agent, jsonb_build_object('slug', _slug));
    RAISE EXCEPTION 'INVALID_CREDENTIALS';
  END IF;

  INSERT INTO public.access_sessions (kind, barbershop_id, barber_id)
    VALUES ('barber', _shop_id, _barber.id)
    RETURNING token INTO _token;

  PERFORM public.log_audit_event(_shop_id, 'barber', _barber.id::text, _barber.name,
    'login_success', _ip, _user_agent, jsonb_build_object('slug', _slug));

  RETURN _token;
END $$;

REVOKE EXECUTE ON FUNCTION public.login_barber_v2(text,text,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.login_barber_v2(text,text,text,text,text) TO authenticated, service_role;

-- =====================================================
-- 5. RPC PARA SUPERADMIN LER AUDIT LOG
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_audit_log(_barbershop_id uuid, _limit int DEFAULT 200)
RETURNS TABLE(
  id uuid, created_at timestamptz, barbershop_id uuid,
  actor_kind text, actor_label text, event text, ip text, metadata jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, created_at, barbershop_id, actor_kind, actor_label, event, ip, metadata
    FROM public.audit_log
   WHERE (_barbershop_id IS NULL OR barbershop_id = _barbershop_id)
     AND (auth.uid() IS NOT NULL AND public.is_superadmin(auth.uid()))
   ORDER BY created_at DESC
   LIMIT LEAST(GREATEST(_limit, 1), 1000)
$$;

REVOKE EXECUTE ON FUNCTION public.get_audit_log(uuid, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_log(uuid, int) TO authenticated, service_role;

-- housekeeping: apaga logs de auditoria com mais de 180 dias
-- (roda oportunamente quando alguém insere)
CREATE OR REPLACE FUNCTION public.audit_log_housekeeping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1% de chance de rodar cleanup por insert (barato)
  IF random() < 0.01 THEN
    DELETE FROM public.audit_log WHERE created_at < now() - interval '180 days';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_log_housekeeping ON public.audit_log;
CREATE TRIGGER trg_audit_log_housekeeping
AFTER INSERT ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.audit_log_housekeeping();
