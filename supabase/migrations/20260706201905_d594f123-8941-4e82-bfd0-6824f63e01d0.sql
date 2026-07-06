
-- === APPOINTMENTS ===
DROP POLICY IF EXISTS "Authenticated read all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated reads appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public reads appointments (needed for slot conflict + client ar" ON public.appointments;
DROP POLICY IF EXISTS "Staff manage appointments" ON public.appointments;

CREATE POLICY "Barber reads own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.barber_user_owns_appt(auth.uid(), barber_id, barbershop_id));

CREATE POLICY "Admin reads appointments of own shop" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id));

CREATE POLICY "Superadmin reads all appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- === CLIENTS ===
DROP POLICY IF EXISTS "Authenticated reads clients" ON public.clients;
DROP POLICY IF EXISTS "Public can lookup client by phone" ON public.clients;

CREATE POLICY "Superadmin reads all clients" ON public.clients
  FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- === BARBERS ===
DROP POLICY IF EXISTS "Authenticated reads barbers" ON public.barbers;

CREATE POLICY "Staff reads barbers of own shop" ON public.barbers
  FOR SELECT TO authenticated
  USING (
    public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id)
    OR public.has_role_in(auth.uid(), 'barber'::app_role, barbershop_id)
    OR public.is_superadmin(auth.uid())
  );

REVOKE SELECT (phone) ON public.barbers FROM anon;

-- === SERVICES ===
DROP POLICY IF EXISTS "Authenticated reads services" ON public.services;

CREATE POLICY "Staff reads services of own shop" ON public.services
  FOR SELECT TO authenticated
  USING (
    public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id)
    OR public.has_role_in(auth.uid(), 'barber'::app_role, barbershop_id)
    OR public.is_superadmin(auth.uid())
  );

-- === SHOP_SETTINGS ===
DROP POLICY IF EXISTS "Authenticated reads shop settings" ON public.shop_settings;

CREATE POLICY "Staff reads settings of own shop" ON public.shop_settings
  FOR SELECT TO authenticated
  USING (
    public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id)
    OR public.has_role_in(auth.uid(), 'barber'::app_role, barbershop_id)
    OR public.is_superadmin(auth.uid())
  );

-- === BARBERSHOPS ===
DROP POLICY IF EXISTS "Authenticated reads barbershops" ON public.barbershops;

CREATE POLICY "Staff reads own barbershop" ON public.barbershops
  FOR SELECT TO authenticated
  USING (
    public.has_role_in(auth.uid(), 'admin'::app_role, id)
    OR public.has_role_in(auth.uid(), 'barber'::app_role, id)
    OR public.is_superadmin(auth.uid())
  );

-- === RPCs seguras ===

-- 1) Slots ocupados (mínimo necessário: horários, sem PII)
CREATE OR REPLACE FUNCTION public.public_get_taken_slots(_barber_id uuid, _date date)
RETURNS TABLE("time" text, end_time text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.time, a.end_time
  FROM public.appointments a
  WHERE a.barber_id = _barber_id
    AND a.date = _date
    AND a.status <> 'cancelado'
$$;
REVOKE ALL ON FUNCTION public.public_get_taken_slots(uuid, date) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_taken_slots(uuid, date) TO anon, authenticated;

-- 2) Upsert cliente por telefone dentro de uma barbearia (retorna só o id)
CREATE OR REPLACE FUNCTION public.public_upsert_client(
  _barbershop_id uuid, _name text, _phone text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM public.clients
   WHERE barbershop_id = _barbershop_id AND phone = _phone LIMIT 1;
  IF _id IS NULL THEN
    INSERT INTO public.clients (barbershop_id, name, phone)
    VALUES (_barbershop_id, _name, _phone)
    RETURNING id INTO _id;
  END IF;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.public_upsert_client(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_upsert_client(uuid, text, text) TO anon, authenticated;

-- 3) Cliente consulta os próprios agendamentos por telefone (sem expor tabela)
CREATE OR REPLACE FUNCTION public.public_get_my_appointments(
  _barbershop_id uuid, _phone text
) RETURNS TABLE(
  id uuid, date date, "time" text, end_time text, duration int,
  status text, price numeric, service_name text, barber_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.date, a.time, a.end_time, a.duration, a.status, a.price,
         a.service_name, a.barber_name
  FROM public.appointments a
  WHERE a.barbershop_id = _barbershop_id
    AND a.client_phone = _phone
  ORDER BY a.date DESC, a.time DESC
  LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.public_get_my_appointments(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_my_appointments(uuid, text) TO anon, authenticated;

-- 4) Cancelamento pelo próprio cliente (checa telefone)
CREATE OR REPLACE FUNCTION public.public_cancel_my_appointment(_id uuid, _phone text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _ok int;
BEGIN
  UPDATE public.appointments
     SET status = 'cancelado', updated_at = now()
   WHERE id = _id AND client_phone = _phone AND status <> 'cancelado';
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok > 0;
END $$;
REVOKE ALL ON FUNCTION public.public_cancel_my_appointment(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_cancel_my_appointment(uuid, text) TO anon, authenticated;
