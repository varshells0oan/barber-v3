
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS gallery_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS testimonials jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.shop_settings
   SET gallery_urls = gallery
 WHERE gallery_urls = '[]'::jsonb
   AND gallery IS NOT NULL
   AND jsonb_typeof(gallery) = 'array';

DROP VIEW IF EXISTS public.public_shop_settings;
CREATE VIEW public.public_shop_settings AS
SELECT s.barbershop_id, s.name, s.description, s.phone, s.whatsapp, s.instagram,
       s.address, s.banner_url, s.logo_url, s.work_hours, s.differentials,
       s.gallery, s.gallery_urls, s.testimonials, s.tagline,
       s.loyalty_target, s.loyalty_reward, s.blocked_dates, s.slot_buffer_min,
       s.theme_preset
  FROM public.shop_settings s
  JOIN public.barbershops b ON b.id = s.barbershop_id
 WHERE b.status = 'active';
GRANT SELECT ON public.public_shop_settings TO anon, authenticated;
