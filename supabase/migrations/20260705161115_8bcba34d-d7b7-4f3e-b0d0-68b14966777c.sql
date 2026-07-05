
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'barber');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 30,
  category TEXT NOT NULL DEFAULT 'corte' CHECK (category IN ('corte','barba','combo','tratamento','outros')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active services" ON public.services FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated reads all services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- BARBERS
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  specialty TEXT,
  bio TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 50,
  work_hours JSONB NOT NULL DEFAULT '{"1":{"start":"09:00","end":"19:00"},"2":{"start":"09:00","end":"19:00"},"3":{"start":"09:00","end":"19:00"},"4":{"start":"09:00","end":"19:00"},"5":{"start":"09:00","end":"19:00"},"6":{"start":"09:00","end":"17:00"}}'::jsonb,
  blocked_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.barbers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active barbers" ON public.barbers FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated reads all barbers" ON public.barbers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage barbers" ON public.barbers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_barbers_updated BEFORE UPDATE ON public.barbers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','recorrente','vip','inativo')),
  total_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  visits INTEGER NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  last_visit DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_phone ON public.clients(phone);
GRANT SELECT, INSERT ON public.clients TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can lookup client by phone" ON public.clients FOR SELECT TO anon USING (true);
CREATE POLICY "Public can create client" ON public.clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated read all clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage clients" ON public.clients FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
  barber_name TEXT NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','atendido','cancelado','nao_compareceu')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appt_date ON public.appointments(date);
CREATE INDEX idx_appt_barber_date ON public.appointments(barber_id, date);
CREATE INDEX idx_appt_phone ON public.appointments(client_phone);
GRANT SELECT, INSERT ON public.appointments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads appointments (needed for slot conflict + client area)" ON public.appointments FOR SELECT TO anon USING (true);
CREATE POLICY "Public can create appointment" ON public.appointments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated read all appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage appointments" ON public.appointments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'barber')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'barber'));
CREATE TRIGGER trg_appt_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- SHOP SETTINGS
CREATE TABLE public.shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Barbearia',
  description TEXT DEFAULT 'Cortes clássicos e modernos com atendimento premium.',
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  address TEXT,
  banner_url TEXT,
  logo_url TEXT,
  work_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  differentials JSONB NOT NULL DEFAULT '["Ambiente climatizado","Wi-Fi grátis","Café cortesia"]'::jsonb,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  loyalty_target INTEGER NOT NULL DEFAULT 10,
  loyalty_reward TEXT DEFAULT 'Um corte grátis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shop_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads shop settings" ON public.shop_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated reads shop settings" ON public.shop_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage shop settings" ON public.shop_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_shop_updated BEFORE UPDATE ON public.shop_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
