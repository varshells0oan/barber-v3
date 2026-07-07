DROP POLICY IF EXISTS "Public reads shop settings via view" ON public.shop_settings;

DROP VIEW IF EXISTS public.public_shop_settings;
CREATE VIEW public.public_shop_settings
WITH (security_invoker = false) AS
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