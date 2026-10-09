CREATE OR REPLACE VIEW public.public_shop_settings AS
SELECT s.barbershop_id, s.name, s.description, s.phone, s.whatsapp, s.instagram, s.address, s.logo_url, s.banner_url, s.work_hours, s.gallery, s.gallery_urls, s.testimonials, s.tagline, s.blocked_dates, s.slot_buffer_min, s.loyalty_target, s.loyalty_reward, s.theme_preset, s.theme_custom, s.public_visibility,
  COALESCE((SELECT b.accepting_bookings FROM public.barbershops b WHERE b.id = s.barbershop_id), true) AS accepting_bookings
FROM public.shop_settings s;