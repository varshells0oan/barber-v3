-- Deduplicate shop_settings: keep the most recently updated row per barbershop
WITH ranked AS (
  SELECT id, barbershop_id,
         row_number() OVER (PARTITION BY barbershop_id ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST) AS rn
  FROM public.shop_settings
)
DELETE FROM public.shop_settings s
USING ranked r
WHERE s.id = r.id AND r.rn > 1;

-- Prevent future duplicates
ALTER TABLE public.shop_settings
  ADD CONSTRAINT shop_settings_barbershop_id_unique UNIQUE (barbershop_id);