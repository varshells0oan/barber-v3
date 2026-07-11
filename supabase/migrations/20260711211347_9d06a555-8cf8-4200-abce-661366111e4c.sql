ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS theme_preset text NOT NULL DEFAULT 'classic';

CREATE OR REPLACE VIEW public.public_shop_settings AS
SELECT s.barbershop_id, s.name, s.description, s.phone, s.whatsapp, s.instagram,
       s.address, s.banner_url, s.logo_url, s.work_hours, s.differentials,
       s.gallery, s.loyalty_target, s.loyalty_reward, s.blocked_dates,
       s.slot_buffer_min, s.theme_preset
FROM public.shop_settings s
JOIN public.barbershops b ON b.id = s.barbershop_id
WHERE b.status = 'active';