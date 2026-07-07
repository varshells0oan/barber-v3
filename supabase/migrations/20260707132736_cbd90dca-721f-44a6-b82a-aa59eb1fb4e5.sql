
-- 1) Remove policies públicas permissivas
DROP POLICY IF EXISTS "Public can create client" ON public.clients;
DROP POLICY IF EXISTS "Public can create appointment" ON public.appointments;
DROP POLICY IF EXISTS "Public reads shop settings" ON public.shop_settings;

-- 2) View pública segura de shop_settings (colunas mínimas para o site público)
DROP VIEW IF EXISTS public.public_shop_settings;
CREATE VIEW public.public_shop_settings
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.barbershop_id,
  s.name,
  s.description,
  s.phone,
  s.whatsapp,
  s.instagram,
  s.address,
  s.banner_url,
  s.logo_url,
  s.work_hours,
  s.differentials,
  s.gallery,
  s.blocked_dates,
  s.slot_buffer_min,
  s.loyalty_target,
  s.loyalty_reward
FROM public.shop_settings s
JOIN public.barbershops b ON b.id = s.barbershop_id
WHERE b.status = 'active';

GRANT SELECT ON public.public_shop_settings TO anon, authenticated;

-- Policy adicional para permitir SELECT via view (security_invoker aplica RLS do chamador)
CREATE POLICY "Public reads shop settings via view"
  ON public.shop_settings FOR SELECT
  TO anon
  USING (EXISTS (SELECT 1 FROM public.barbershops b WHERE b.id = shop_settings.barbershop_id AND b.status = 'active'));

-- 3) RPC segura de agendamento público
CREATE OR REPLACE FUNCTION public.create_public_appointment(
  _barbershop_id uuid,
  _barber_id uuid,
  _service_id uuid,
  _date date,
  _time text,
  _client_name text,
  _client_phone text,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop record;
  _barber record;
  _service record;
  _shop_settings record;
  _client_id uuid;
  _appt_id uuid;
  _end_time text;
  _dur int;
  _price numeric;
  _phone text;
  _name text;
  _blocked jsonb;
BEGIN
  -- Validações de input básicas
  _name := btrim(coalesce(_client_name, ''));
  _phone := regexp_replace(coalesce(_client_phone, ''), '\D', '', 'g');
  IF length(_name) < 2 OR length(_name) > 120 THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;
  IF length(_phone) < 10 OR length(_phone) > 15 THEN
    RAISE EXCEPTION 'INVALID_PHONE';
  END IF;
  IF _date < current_date THEN
    RAISE EXCEPTION 'INVALID_DATE';
  END IF;
  IF _time !~ '^[0-2][0-9]:[0-5][0-9]$' THEN
    RAISE EXCEPTION 'INVALID_TIME';
  END IF;

  -- Barbearia ativa
  SELECT id, status INTO _shop FROM public.barbershops WHERE id = _barbershop_id;
  IF NOT FOUND OR _shop.status <> 'active' THEN
    RAISE EXCEPTION 'BARBERSHOP_NOT_FOUND';
  END IF;

  -- Barbeiro ativo e da barbearia
  SELECT id, name, active, barbershop_id, blocked_dates
    INTO _barber
  FROM public.barbers
  WHERE id = _barber_id AND barbershop_id = _barbershop_id;
  IF NOT FOUND OR NOT _barber.active THEN
    RAISE EXCEPTION 'BARBER_NOT_AVAILABLE';
  END IF;

  -- Serviço ativo e da barbearia
  SELECT id, name, active, barbershop_id, price, duration
    INTO _service
  FROM public.services
  WHERE id = _service_id AND barbershop_id = _barbershop_id;
  IF NOT FOUND OR NOT _service.active THEN
    RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE';
  END IF;

  _dur := _service.duration;
  _price := _service.price;
  _end_time := to_char(
    (('2000-01-01 ' || _time)::timestamp + make_interval(mins => _dur)),
    'HH24:MI'
  );

  -- Datas bloqueadas (barbearia)
  SELECT blocked_dates INTO _blocked FROM public.shop_settings WHERE barbershop_id = _barbershop_id LIMIT 1;
  IF _blocked IS NOT NULL AND _blocked ? to_char(_date, 'YYYY-MM-DD') THEN
    RAISE EXCEPTION 'DATE_BLOCKED';
  END IF;
  IF _barber.blocked_dates IS NOT NULL AND _barber.blocked_dates ? to_char(_date, 'YYYY-MM-DD') THEN
    RAISE EXCEPTION 'DATE_BLOCKED';
  END IF;

  -- Upsert de cliente (dedup por barbershop_id + phone)
  SELECT id INTO _client_id FROM public.clients
    WHERE barbershop_id = _barbershop_id AND phone = _phone LIMIT 1;
  IF _client_id IS NULL THEN
    INSERT INTO public.clients (barbershop_id, name, phone)
    VALUES (_barbershop_id, _name, _phone)
    RETURNING id INTO _client_id;
  END IF;

  -- Insert do agendamento (o trigger prevent_appointment_overlap valida slot)
  INSERT INTO public.appointments (
    barbershop_id, client_id, client_name, client_phone,
    barber_id, barber_name, service_id, service_name,
    date, time, end_time, duration, price, status, notes
  ) VALUES (
    _barbershop_id, _client_id, _name, _phone,
    _barber.id, _barber.name, _service.id, _service.name,
    _date, _time, _end_time, _dur, _price, 'pendente', nullif(btrim(coalesce(_notes,'')), '')
  )
  RETURNING id INTO _appt_id;

  RETURN _appt_id;
END $$;

-- 4) Ajusta permissões de EXECUTE

-- Funções internas usadas só por RLS: não devem ser chamáveis diretamente
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role_in(uuid, app_role, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.barber_user_owns_appt(uuid, uuid, uuid) FROM anon, authenticated, public;

-- Bloqueia o upsert de cliente direto (agora só via create_public_appointment)
REVOKE EXECUTE ON FUNCTION public.public_upsert_client(uuid, text, text) FROM anon, authenticated, public;

-- RPCs realmente públicas (mantém aberto o mínimo necessário)
GRANT EXECUTE ON FUNCTION public.create_public_appointment(uuid, uuid, uuid, date, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_taken_slots(uuid, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_my_appointments(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_cancel_my_appointment(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_client_loyalty(uuid, text) TO anon, authenticated;
