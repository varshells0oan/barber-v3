CREATE OR REPLACE VIEW public.public_shop_settings WITH (security_invoker=true) AS
 SELECT barbershop_id, name, description, phone, whatsapp, instagram, address, logo_url, banner_url, work_hours, gallery, gallery_urls, testimonials, tagline, blocked_dates, slot_buffer_min, loyalty_target, loyalty_reward, theme_preset, theme_custom, public_visibility
   FROM public.shop_settings;