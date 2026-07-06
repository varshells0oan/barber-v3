
-- 1) Tabela barbershops
CREATE TABLE IF NOT EXISTS public.barbershops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  hero_image_url TEXT,
  banner_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  address TEXT,
  opening_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocked_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  plan TEXT NOT NULL DEFAULT 'free',
  custom_domain TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT barbershops_slug_format CHECK (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')
);

GRANT SELECT ON public.barbershops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershops TO authenticated;
GRANT ALL ON public.barbershops TO service_role;

CREATE INDEX IF NOT EXISTS idx_barbershops_slug ON public.barbershops(slug);
CREATE INDEX IF NOT EXISTS idx_barbershops_status ON public.barbershops(status);

DROP TRIGGER IF EXISTS trg_barbershops_updated ON public.barbershops;
CREATE TRIGGER trg_barbershops_updated BEFORE UPDATE ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- 2) Backfill: cria a barbearia "Principal" a partir do shop_settings existente
DO $$
DECLARE v_shop RECORD;
BEGIN
  SELECT * INTO v_shop FROM public.shop_settings ORDER BY created_at ASC LIMIT 1;
  INSERT INTO public.barbershops (
    name, slug, description, logo_url, banner_url,
    phone, whatsapp, instagram, address, opening_hours, blocked_dates
  ) VALUES (
    COALESCE(v_shop.name, 'Barbearia Principal'), 'principal', v_shop.description,
    v_shop.logo_url, v_shop.banner_url, v_shop.phone, v_shop.whatsapp,
    v_shop.instagram, v_shop.address,
    COALESCE(v_shop.work_hours, '{}'::jsonb),
    COALESCE(v_shop.blocked_dates, '[]'::jsonb)
  )
  ON CONFLICT (slug) DO NOTHING;
END $$;

-- 3) Colunas barbershop_id (nullable, depois backfill, depois NOT NULL)
ALTER TABLE public.services      ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.barbers       ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.appointments  ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.clients       ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles    ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

DO $$
DECLARE v_bid UUID;
BEGIN
  SELECT id INTO v_bid FROM public.barbershops WHERE slug = 'principal';
  UPDATE public.services      SET barbershop_id = v_bid WHERE barbershop_id IS NULL;
  UPDATE public.barbers       SET barbershop_id = v_bid WHERE barbershop_id IS NULL;
  UPDATE public.appointments  SET barbershop_id = v_bid WHERE barbershop_id IS NULL;
  UPDATE public.clients       SET barbershop_id = v_bid WHERE barbershop_id IS NULL;
  UPDATE public.shop_settings SET barbershop_id = v_bid WHERE barbershop_id IS NULL;
  UPDATE public.user_roles    SET barbershop_id = v_bid WHERE barbershop_id IS NULL AND role IN ('admin','barber');
END $$;

ALTER TABLE public.services      ALTER COLUMN barbershop_id SET NOT NULL;
ALTER TABLE public.barbers       ALTER COLUMN barbershop_id SET NOT NULL;
ALTER TABLE public.appointments  ALTER COLUMN barbershop_id SET NOT NULL;
ALTER TABLE public.clients       ALTER COLUMN barbershop_id SET NOT NULL;
ALTER TABLE public.shop_settings ALTER COLUMN barbershop_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_barbershop     ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbers_barbershop      ON public.barbers(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON public.appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_barbershop      ON public.clients(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_shop_settings_barbershop ON public.shop_settings(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_barbershop   ON public.user_roles(barbershop_id);

-- 4) user_roles: unique por (user_id, role, barbershop_id) tratando NULL como igual
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
DROP INDEX IF EXISTS public.user_roles_unique_role_per_shop;
CREATE UNIQUE INDEX user_roles_unique_role_per_shop
  ON public.user_roles (user_id, role, COALESCE(barbershop_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_scope_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_scope_check
  CHECK ((role = 'superadmin'::app_role AND barbershop_id IS NULL)
      OR (role <> 'superadmin'::app_role AND barbershop_id IS NOT NULL));

-- 5) Funções auxiliares
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.has_role_in(_user_id UUID, _role app_role, _barbershop_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND barbershop_id = _barbershop_id
  ) OR public.is_superadmin(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.barber_user_owns_appt(_user_id UUID, _barber_id UUID, _barbershop_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers
    WHERE id = _barber_id AND barbershop_id = _barbershop_id AND user_id = _user_id
  )
$$;

-- 6) RLS: barbershops
DROP POLICY IF EXISTS "Public reads active barbershops" ON public.barbershops;
DROP POLICY IF EXISTS "Authenticated reads barbershops" ON public.barbershops;
DROP POLICY IF EXISTS "Admin updates own barbershop" ON public.barbershops;
DROP POLICY IF EXISTS "Superadmin manages barbershops" ON public.barbershops;

CREATE POLICY "Public reads active barbershops" ON public.barbershops
  FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Authenticated reads barbershops" ON public.barbershops
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin updates own barbershop" ON public.barbershops
  FOR UPDATE TO authenticated
  USING (public.has_role_in(auth.uid(), 'admin'::app_role, id))
  WITH CHECK (public.has_role_in(auth.uid(), 'admin'::app_role, id));
CREATE POLICY "Superadmin manages barbershops" ON public.barbershops
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- 7) RLS: services
DROP POLICY IF EXISTS "Admins manage services" ON public.services;
DROP POLICY IF EXISTS "Authenticated reads all services" ON public.services;
DROP POLICY IF EXISTS "Public reads active services" ON public.services;
DROP POLICY IF EXISTS "Authenticated reads services" ON public.services;
DROP POLICY IF EXISTS "Admin manages services of own shop" ON public.services;

CREATE POLICY "Public reads active services" ON public.services
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated reads services" ON public.services
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages services of own shop" ON public.services
  FOR ALL TO authenticated
  USING (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id))
  WITH CHECK (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id));

-- 8) RLS: barbers
DROP POLICY IF EXISTS "Admins manage barbers" ON public.barbers;
DROP POLICY IF EXISTS "Authenticated reads all barbers" ON public.barbers;
DROP POLICY IF EXISTS "Public reads active barbers" ON public.barbers;
DROP POLICY IF EXISTS "Authenticated reads barbers" ON public.barbers;
DROP POLICY IF EXISTS "Admin manages barbers of own shop" ON public.barbers;

CREATE POLICY "Public reads active barbers" ON public.barbers
  FOR SELECT TO anon USING (active = true);
CREATE POLICY "Authenticated reads barbers" ON public.barbers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages barbers of own shop" ON public.barbers
  FOR ALL TO authenticated
  USING (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id))
  WITH CHECK (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id));

-- 9) RLS: clients
DROP POLICY IF EXISTS "Admins manage clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated read all clients" ON public.clients;
DROP POLICY IF EXISTS "Public can create client" ON public.clients;
DROP POLICY IF EXISTS "Public can lookup client by phone" ON public.clients;
DROP POLICY IF EXISTS "Authenticated reads clients" ON public.clients;
DROP POLICY IF EXISTS "Admin manages clients of own shop" ON public.clients;

CREATE POLICY "Public can lookup client by phone" ON public.clients
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public can create client" ON public.clients
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated reads clients" ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages clients of own shop" ON public.clients
  FOR ALL TO authenticated
  USING (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id))
  WITH CHECK (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id));

-- 10) RLS: appointments
DROP POLICY IF EXISTS "Admins manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated reads appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can create appointment" ON public.appointments;
DROP POLICY IF EXISTS "Public can read own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber reads own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Barber updates own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can read appointments (lookup)" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated reads appointments in own shops" ON public.appointments;
DROP POLICY IF EXISTS "Admin manages appointments of own shop" ON public.appointments;

CREATE POLICY "Public can create appointment" ON public.appointments
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can read appointments" ON public.appointments
  FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated reads appointments" ON public.appointments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages appointments of own shop" ON public.appointments
  FOR ALL TO authenticated
  USING (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id))
  WITH CHECK (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id));
CREATE POLICY "Barber updates own appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (public.barber_user_owns_appt(auth.uid(), barber_id, barbershop_id))
  WITH CHECK (public.barber_user_owns_appt(auth.uid(), barber_id, barbershop_id));

-- 11) RLS: shop_settings
DROP POLICY IF EXISTS "Admins manage shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Authenticated reads shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Public reads shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Admin manages settings of own shop" ON public.shop_settings;

CREATE POLICY "Public reads shop settings" ON public.shop_settings
  FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated reads shop settings" ON public.shop_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manages settings of own shop" ON public.shop_settings
  FOR ALL TO authenticated
  USING (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id))
  WITH CHECK (public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id));

-- 12) RLS: user_roles
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Bootstrap first admin" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin reads roles of own shop" ON public.user_roles;
DROP POLICY IF EXISTS "Admin manages roles of own shop" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmin manages all roles" ON public.user_roles;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin reads roles of own shop" ON public.user_roles
  FOR SELECT TO authenticated
  USING (barbershop_id IS NOT NULL AND public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id));
CREATE POLICY "Admin manages roles of own shop" ON public.user_roles
  FOR ALL TO authenticated
  USING (barbershop_id IS NOT NULL AND public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id))
  WITH CHECK (barbershop_id IS NOT NULL AND public.has_role_in(auth.uid(), 'admin'::app_role, barbershop_id));
CREATE POLICY "Superadmin manages all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));
