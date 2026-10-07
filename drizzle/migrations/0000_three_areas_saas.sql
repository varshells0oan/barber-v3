-- Barbershops: owner, account status, subscription prep, booking toggle, onboarding
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_until timestamptz,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS external_customer_id text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepting_bookings boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_reschedule boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT true;
ALTER TABLE public.barbershops ADD CONSTRAINT barbershops_subscription_status_check
  CHECK (subscription_status IN ('pending_approval','trial','active','past_due','suspended','cancelled'));
CREATE INDEX IF NOT EXISTS idx_barbershops_subscription_status ON public.barbershops(subscription_status);
CREATE INDEX IF NOT EXISTS idx_barbershops_owner_phone ON public.barbershops(owner_phone);

-- Services: buffer
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS buffer_min integer NOT NULL DEFAULT 0;

-- Public settings toggles
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS public_visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS public_email text,
  ADD COLUMN IF NOT EXISTS map_url text;

-- Appointment statuses (keep old values)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check CHECK (status IN
  ('pendente','agendado','confirmado','em_atendimento','atendido','concluido','nao_compareceu','cancelado'));

-- Admin/barber rights only when the shop account is operational
CREATE OR REPLACE FUNCTION public.has_role_in(_user_id uuid, _role app_role, _barbershop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.barbershops b ON b.id = ur.barbershop_id
    WHERE ur.user_id = _user_id AND ur.role = _role AND ur.barbershop_id = _barbershop_id
      AND b.subscription_status IN ('trial','active','past_due')
  )) OR public.is_superadmin(_user_id)
$$;

-- Time blocks
CREATE TABLE public.barber_time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time text NOT NULL CHECK (start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  end_time text NOT NULL CHECK (end_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  reason text NOT NULL DEFAULT 'outro' CHECK (reason IN ('almoco','compromisso','folga','manutencao','outro')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_time_blocks_barber_date ON public.barber_time_blocks(barber_id, date);
CREATE INDEX idx_time_blocks_shop ON public.barber_time_blocks(barbershop_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_time_blocks TO authenticated;
GRANT ALL ON public.barber_time_blocks TO service_role;
ALTER TABLE public.barber_time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages time blocks" ON public.barber_time_blocks FOR ALL TO authenticated
  USING (has_role_in(auth.uid(),'admin',barbershop_id)) WITH CHECK (has_role_in(auth.uid(),'admin',barbershop_id));
CREATE POLICY "Barber manages own time blocks" ON public.barber_time_blocks FOR ALL TO authenticated
  USING (barber_user_owns_appt(auth.uid(), barber_id, barbershop_id)) WITH CHECK (barber_user_owns_appt(auth.uid(), barber_id, barbershop_id));

-- Waitlist
CREATE TABLE public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL,
  desired_date date NOT NULL,
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','contatado','agendado','cancelado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_waitlist_shop_date ON public.waitlist_entries(barbershop_id, desired_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_entries TO authenticated;
GRANT ALL ON public.waitlist_entries TO service_role;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages waitlist" ON public.waitlist_entries FOR ALL TO authenticated
  USING (has_role_in(auth.uid(),'admin',barbershop_id)) WITH CHECK (has_role_in(auth.uid(),'admin',barbershop_id));

CREATE OR REPLACE FUNCTION public.public_join_waitlist(_barbershop_id uuid, _name text, _phone text, _service_id uuid, _barber_id uuid, _date date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _id uuid; _p text; _n text;
BEGIN
  _n := btrim(coalesce(_name,'')); _p := regexp_replace(coalesce(_phone,''),'\D','','g');
  IF length(_n) < 2 OR length(_n) > 120 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF length(_p) < 10 OR length(_p) > 15 THEN RAISE EXCEPTION 'INVALID_PHONE'; END IF;
  IF _date < current_date THEN RAISE EXCEPTION 'INVALID_DATE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM barbershops WHERE id=_barbershop_id AND status='active') THEN RAISE EXCEPTION 'BARBERSHOP_NOT_FOUND'; END IF;
  IF (SELECT count(*) FROM waitlist_entries WHERE barbershop_id=_barbershop_id AND client_phone=_p AND desired_date=_date AND status='aguardando') > 0 THEN
    RAISE EXCEPTION 'ALREADY_ON_WAITLIST'; END IF;
  INSERT INTO waitlist_entries(barbershop_id, client_name, client_phone, service_id, barber_id, desired_date)
  VALUES (_barbershop_id, _n, _p,
    (SELECT id FROM services WHERE id=_service_id AND barbershop_id=_barbershop_id),
    (SELECT id FROM barbers WHERE id=_barber_id AND barbershop_id=_barbershop_id), _date)
  RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.public_join_waitlist(uuid,text,text,uuid,uuid,date) TO anon, authenticated;

-- Taken slots include time blocks
CREATE OR REPLACE FUNCTION public.public_get_taken_slots(_barber_id uuid, _date date)
RETURNS TABLE("time" text, end_time text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.time, a.end_time FROM public.appointments a
   WHERE a.barber_id = _barber_id AND a.date = _date AND a.status NOT IN ('cancelado','nao_compareceu')
  UNION ALL
  SELECT b.start_time, b.end_time FROM public.barber_time_blocks b
   WHERE b.barber_id = _barber_id AND b.date = _date
$$;

-- Overlap also respects blocks
CREATE OR REPLACE FUNCTION public.prevent_appointment_overlap()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('cancelado','nao_compareceu') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.appointments a WHERE a.barber_id = NEW.barber_id AND a.date = NEW.date
      AND a.id <> NEW.id AND a.status NOT IN ('cancelado','nao_compareceu') AND a.time < NEW.end_time AND a.end_time > NEW.time)
     OR EXISTS (SELECT 1 FROM public.barber_time_blocks b WHERE b.barber_id = NEW.barber_id AND b.date = NEW.date
      AND b.start_time < NEW.end_time AND b.end_time > NEW.time) THEN
    RAISE EXCEPTION 'SLOT_TAKEN: horário já reservado para este barbeiro' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END $$;

-- Public booking: pause toggle + buffer
CREATE OR REPLACE FUNCTION public.create_public_appointment(_barbershop_id uuid, _barber_id uuid, _service_id uuid, _date date, _time text, _client_name text, _client_phone text, _notes text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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

  SELECT id, status, accepting_bookings, subscription_status INTO _shop FROM public.barbershops WHERE id = _barbershop_id;
  IF NOT FOUND OR _shop.status <> 'active' THEN RAISE EXCEPTION 'BARBERSHOP_NOT_FOUND'; END IF;
  IF NOT _shop.accepting_bookings OR _shop.subscription_status NOT IN ('trial','active','past_due') THEN RAISE EXCEPTION 'BOOKINGS_PAUSED'; END IF;

  SELECT id, name, active, barbershop_id, blocked_dates, breaks INTO _barber
    FROM public.barbers WHERE id = _barber_id AND barbershop_id = _barbershop_id;
  IF NOT FOUND OR NOT _barber.active THEN RAISE EXCEPTION 'BARBER_NOT_AVAILABLE'; END IF;

  SELECT id, name, active, barbershop_id, price, duration, buffer_min INTO _service
    FROM public.services WHERE id = _service_id AND barbershop_id = _barbershop_id;
  IF NOT FOUND OR NOT _service.active THEN RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE'; END IF;

  _dur := _service.duration;
  _price := _service.price;
  _start_ts := ('2000-01-01 ' || _time)::timestamp;
  _end_ts := _start_ts + make_interval(mins => _dur + coalesce(_service.buffer_min,0));
  _end_time := to_char(_end_ts, 'HH24:MI');

  SELECT blocked_dates INTO _blocked FROM public.shop_settings WHERE barbershop_id = _barbershop_id LIMIT 1;
  IF _blocked IS NOT NULL AND _blocked ? to_char(_date, 'YYYY-MM-DD') THEN RAISE EXCEPTION 'DATE_BLOCKED'; END IF;
  IF _barber.blocked_dates IS NOT NULL AND _barber.blocked_dates ? to_char(_date, 'YYYY-MM-DD') THEN RAISE EXCEPTION 'DATE_BLOCKED'; END IF;

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

  INSERT INTO public.appointments (barbershop_id, client_id, client_name, client_phone, barber_id, barber_name, service_id, service_name,
    date, time, end_time, duration, price, status, notes)
  VALUES (_barbershop_id, _client_id, _name, _phone, _barber.id, _barber.name, _service.id, _service.name,
    _date, _time, _end_time, _dur, _price, 'agendado', nullif(btrim(coalesce(_notes,'')), ''))
  RETURNING id INTO _appt_id;
  RETURN _appt_id;
END $function$;

-- Client reschedule
CREATE OR REPLACE FUNCTION public.public_reschedule_my_appointment(_id uuid, _phone text, _date date, _time text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _a record; _p text; _shop record; _end text;
BEGIN
  _p := regexp_replace(coalesce(_phone,''),'\D','','g');
  IF _time !~ '^[0-2][0-9]:[0-5][0-9]$' OR _date < current_date THEN RAISE EXCEPTION 'INVALID_TIME'; END IF;
  SELECT * INTO _a FROM appointments WHERE id=_id AND client_phone=_p;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _a.status NOT IN ('pendente','agendado','confirmado') THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  SELECT allow_reschedule, accepting_bookings INTO _shop FROM barbershops WHERE id=_a.barbershop_id;
  IF NOT _shop.allow_reschedule OR NOT _shop.accepting_bookings THEN RAISE EXCEPTION 'RESCHEDULE_DISABLED'; END IF;
  _end := to_char(('2000-01-01 ' || _time)::timestamp + ((('2000-01-01 ' || _a.end_time)::timestamp - ('2000-01-01 ' || _a.time)::timestamp)), 'HH24:MI');
  UPDATE appointments SET date=_date, time=_time, end_time=_end, status='agendado', whatsapp_reminder_sent=false, updated_at=now() WHERE id=_id;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.public_reschedule_my_appointment(uuid,text,date,text) TO anon, authenticated;

-- Client loyalty with visits
CREATE OR REPLACE FUNCTION public.public_get_client_summary(_barbershop_id uuid, _phone text)
RETURNS TABLE(name text, loyalty_points integer, visits integer, loyalty_target integer, loyalty_reward text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT c.name, c.loyalty_points, c.visits, s.loyalty_target, s.loyalty_reward
  FROM public.clients c LEFT JOIN public.shop_settings s ON s.barbershop_id = c.barbershop_id
  WHERE c.barbershop_id = _barbershop_id AND c.phone = regexp_replace(coalesce(_phone,''),'\D','','g') LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.public_get_client_summary(uuid,text) TO anon, authenticated;

-- Owner shop access status (callable even when not operational)
CREATE OR REPLACE FUNCTION public.my_shop_access(_slug text)
RETURNS TABLE(barbershop_id uuid, name text, subscription_status text, onboarding_completed boolean, is_owner boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.id, b.name, b.subscription_status, b.onboarding_completed,
    (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.barbershop_id = b.id AND ur.role = 'admin') OR is_superadmin(auth.uid()))
  FROM barbershops b WHERE b.slug = _slug
$$;
REVOKE EXECUTE ON FUNCTION public.my_shop_access(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_shop_access(text) TO authenticated;

-- Superadmin account status changes
CREATE OR REPLACE FUNCTION public.set_shop_account_status(_id uuid, _action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _action = 'approve' THEN
    UPDATE barbershops SET subscription_status='trial', status='active', approved_at=now(),
      subscription_started_at=coalesce(subscription_started_at, now()),
      subscription_ends_at=coalesce(subscription_ends_at, now() + interval '14 days'),
      onboarding_completed = onboarding_completed WHERE id=_id;
  ELSIF _action = 'reject' THEN
    UPDATE barbershops SET subscription_status='cancelled', status='inactive' WHERE id=_id;
  ELSIF _action = 'block' THEN
    UPDATE barbershops SET subscription_status='suspended', status='suspended' WHERE id=_id;
  ELSIF _action = 'reactivate' THEN
    UPDATE barbershops SET subscription_status='active', status='active' WHERE id=_id;
  ELSIF _action = 'past_due' THEN
    UPDATE barbershops SET subscription_status='past_due', grace_period_until=coalesce(grace_period_until, now() + interval '7 days') WHERE id=_id;
  ELSE RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  RETURN true;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_shop_account_status(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_shop_account_status(uuid,text) TO authenticated;