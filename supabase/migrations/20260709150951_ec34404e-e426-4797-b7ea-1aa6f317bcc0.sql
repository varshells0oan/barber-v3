
-- Extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. New columns
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS admin_username text,
  ADD COLUMN IF NOT EXISTS admin_password_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS barbershops_admin_username_key
  ON public.barbershops (lower(admin_username)) WHERE admin_username IS NOT NULL;

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS access_username text,
  ADD COLUMN IF NOT EXISTS access_password_hash text,
  ADD COLUMN IF NOT EXISTS breaks jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS barbers_access_username_per_shop_key
  ON public.barbers (barbershop_id, lower(access_username)) WHERE access_username IS NOT NULL;

-- 2. Access sessions table (opaque tokens)
CREATE TABLE IF NOT EXISTS public.access_sessions (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('admin','barber')),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

GRANT ALL ON public.access_sessions TO service_role;
-- No anon/authenticated grants: only accessed via SECURITY DEFINER RPCs
ALTER TABLE public.access_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: locked down, only definer functions read/write

CREATE INDEX IF NOT EXISTS access_sessions_shop_idx ON public.access_sessions(barbershop_id);
CREATE INDEX IF NOT EXISTS access_sessions_expires_idx ON public.access_sessions(expires_at);

-- 3. RPCs

-- Superadmin sets shop admin credentials
CREATE OR REPLACE FUNCTION public.set_barbershop_admin_credentials(
  _barbershop_id uuid, _username text, _password text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u text; _p text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  _u := lower(btrim(coalesce(_username, '')));
  _p := coalesce(_password, '');
  IF length(_u) < 2 THEN RAISE EXCEPTION 'INVALID_USERNAME'; END IF;
  IF length(_p) < 1 THEN RAISE EXCEPTION 'INVALID_PASSWORD'; END IF;
  UPDATE public.barbershops
     SET admin_username = _u,
         admin_password_hash = crypt(_p, gen_salt('bf')),
         updated_at = now()
   WHERE id = _barbershop_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'BARBERSHOP_NOT_FOUND'; END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_barbershop_admin_credentials(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_barbershop_admin_credentials(uuid, text, text) TO authenticated;

-- Verify a session token; returns kind + ids if valid, else null row
CREATE OR REPLACE FUNCTION public.verify_access_token(_token uuid)
RETURNS TABLE(kind text, barbershop_id uuid, barber_id uuid, barbershop_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.kind, s.barbershop_id, s.barber_id, b.slug
    FROM public.access_sessions s
    JOIN public.barbershops b ON b.id = s.barbershop_id
   WHERE s.token = _token AND s.expires_at > now()
   LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.verify_access_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_access_token(uuid) TO anon, authenticated;

-- Login for barbershop admin
CREATE OR REPLACE FUNCTION public.login_barbershop_admin(_slug text, _username text, _password text)
RETURNS uuid  -- returns session token, or raises
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _shop record; _token uuid;
BEGIN
  SELECT id, admin_username, admin_password_hash INTO _shop
    FROM public.barbershops WHERE slug = _slug AND status = 'active' LIMIT 1;
  IF NOT FOUND OR _shop.admin_password_hash IS NULL THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS';
  END IF;
  IF lower(btrim(coalesce(_username,''))) <> _shop.admin_username
     OR _shop.admin_password_hash <> crypt(_password, _shop.admin_password_hash) THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS';
  END IF;
  INSERT INTO public.access_sessions (kind, barbershop_id) VALUES ('admin', _shop.id)
    RETURNING token INTO _token;
  RETURN _token;
END $$;
REVOKE ALL ON FUNCTION public.login_barbershop_admin(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_barbershop_admin(text, text, text) TO anon, authenticated;

-- Admin sets barber credentials (username OR password null-empty means "no gate")
CREATE OR REPLACE FUNCTION public.set_barber_credentials(
  _admin_token uuid, _barber_id uuid, _username text, _password text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    UPDATE public.barbers
       SET access_username = _u,
           access_password_hash = crypt(_password, gen_salt('bf')),
           updated_at = now()
     WHERE id = _barber_id;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_barber_credentials(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_barber_credentials(uuid, uuid, text, text) TO anon, authenticated;

-- Login for barber (requires shop has that username set)
CREATE OR REPLACE FUNCTION public.login_barber(_slug text, _username text, _password text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _shop_id uuid; _barber record; _token uuid;
BEGIN
  SELECT id INTO _shop_id FROM public.barbershops WHERE slug = _slug AND status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_CREDENTIALS'; END IF;
  SELECT id, access_password_hash INTO _barber FROM public.barbers
   WHERE barbershop_id = _shop_id
     AND access_username = lower(btrim(coalesce(_username,'')))
     AND active = true
   LIMIT 1;
  IF NOT FOUND OR _barber.access_password_hash IS NULL
     OR _barber.access_password_hash <> crypt(_password, _barber.access_password_hash) THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS';
  END IF;
  INSERT INTO public.access_sessions (kind, barbershop_id, barber_id)
    VALUES ('barber', _shop_id, _barber.id)
    RETURNING token INTO _token;
  RETURN _token;
END $$;
REVOKE ALL ON FUNCTION public.login_barber(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_barber(text, text, text) TO anon, authenticated;

-- Logout
CREATE OR REPLACE FUNCTION public.access_logout(_token uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.access_sessions WHERE token = _token RETURNING true;
$$;
REVOKE ALL ON FUNCTION public.access_logout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.access_logout(uuid) TO anon, authenticated;

-- Public helper: does shop require barber login? (so /{slug}/barbeiro knows whether to gate)
CREATE OR REPLACE FUNCTION public.shop_barbers_gate_info(_slug text)
RETURNS TABLE(has_any_barber_gate boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers b
      JOIN public.barbershops s ON s.id = b.barbershop_id
     WHERE s.slug = _slug AND b.access_password_hash IS NOT NULL
  )
$$;
REVOKE ALL ON FUNCTION public.shop_barbers_gate_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_barbers_gate_info(text) TO anon, authenticated;

-- Update create_public_appointment to also respect per-DOW breaks
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  _barbershop_id uuid, _barber_id uuid, _service_id uuid,
  _date date, _time text, _client_name text, _client_phone text, _notes text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _shop record; _barber record; _service record;
  _client_id uuid; _appt_id uuid;
  _end_time text; _dur int; _price numeric;
  _phone text; _name text;
  _blocked jsonb; _breaks jsonb; _brk jsonb; _dow text;
  _start_ts timestamp; _end_ts timestamp;
BEGIN
  _name := btrim(coalesce(_client_name, ''));
  _phone := regexp_replace(coalesce(_client_phone, ''), '\D', '', 'g');
  IF length(_name) < 2 OR length(_name) > 120 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF length(_phone) < 10 OR length(_phone) > 15 THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF _date < current_date THEN RAISE EXCEPTION 'INVALID_DATE'; END IF;
  IF _time !~ '^[0-2][0-9]:[0-5][0-9]$' THEN RAISE EXCEPTION 'INVALID_TIME'; END IF;

  SELECT id, status INTO _shop FROM public.barbershops WHERE id = _barbershop_id;
  IF NOT FOUND OR _shop.status <> 'active' THEN RAISE EXCEPTION 'BARBERSHOP_NOT_FOUND'; END IF;

  SELECT id, name, active, barbershop_id, blocked_dates, breaks INTO _barber
    FROM public.barbers WHERE id = _barber_id AND barbershop_id = _barbershop_id;
  IF NOT FOUND OR NOT _barber.active THEN RAISE EXCEPTION 'BARBER_NOT_AVAILABLE'; END IF;

  SELECT id, name, active, barbershop_id, price, duration INTO _service
    FROM public.services WHERE id = _service_id AND barbershop_id = _barbershop_id;
  IF NOT FOUND OR NOT _service.active THEN RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE'; END IF;

  _dur := _service.duration;
  _price := _service.price;
  _start_ts := ('2000-01-01 ' || _time)::timestamp;
  _end_ts := _start_ts + make_interval(mins => _dur);
  _end_time := to_char(_end_ts, 'HH24:MI');

  SELECT blocked_dates INTO _blocked FROM public.shop_settings WHERE barbershop_id = _barbershop_id LIMIT 1;
  IF _blocked IS NOT NULL AND _blocked ? to_char(_date, 'YYYY-MM-DD') THEN RAISE EXCEPTION 'DATE_BLOCKED'; END IF;
  IF _barber.blocked_dates IS NOT NULL AND _barber.blocked_dates ? to_char(_date, 'YYYY-MM-DD') THEN RAISE EXCEPTION 'DATE_BLOCKED'; END IF;

  -- Breaks per day of week
  _breaks := _barber.breaks;
  _dow := extract(dow from _date)::text;
  IF _breaks IS NOT NULL AND _breaks ? _dow THEN
    FOR _brk IN SELECT jsonb_array_elements(_breaks->_dow) LOOP
      IF _start_ts < ('2000-01-01 ' || (_brk->>'end'))::timestamp
         AND _end_ts > ('2000-01-01 ' || (_brk->>'start'))::timestamp THEN
        RAISE EXCEPTION 'BREAK_TIME';
      END IF;
    END LOOP;
  END IF;

  SELECT id INTO _client_id FROM public.clients WHERE barbershop_id = _barbershop_id AND phone = _phone LIMIT 1;
  IF _client_id IS NULL THEN
    INSERT INTO public.clients (barbershop_id, name, phone) VALUES (_barbershop_id, _name, _phone) RETURNING id INTO _client_id;
  END IF;

  INSERT INTO public.appointments (
    barbershop_id, client_id, client_name, client_phone,
    barber_id, barber_name, service_id, service_name,
    date, time, end_time, duration, price, status, notes
  ) VALUES (
    _barbershop_id, _client_id, _name, _phone,
    _barber.id, _barber.name, _service.id, _service.name,
    _date, _time, _end_time, _dur, _price, 'pendente', nullif(btrim(coalesce(_notes,'')), '')
  ) RETURNING id INTO _appt_id;

  RETURN _appt_id;
END $$;
