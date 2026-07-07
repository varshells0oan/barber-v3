DROP VIEW IF EXISTS public.public_shop_settings;
CREATE VIEW public.public_shop_settings
WITH (security_invoker = true) AS
SELECT
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
  s.loyalty_target,
  s.loyalty_reward,
  s.blocked_dates,
  s.slot_buffer_min
FROM public.shop_settings s
JOIN public.barbershops b ON b.id = s.barbershop_id
WHERE b.status = 'active';

GRANT SELECT ON public.public_shop_settings TO anon, authenticated;

-- Policy mínima para a view (security_invoker) conseguir ler shop_settings de barbearias ativas.
DROP POLICY IF EXISTS "Public reads shop settings via view" ON public.shop_settings;
CREATE POLICY "Public reads shop settings via view"
  ON public.shop_settings
  FOR SELECT
  TO anon
  USING (EXISTS (SELECT 1 FROM public.barbershops b WHERE b.id = shop_settings.barbershop_id AND b.status = 'active'));