DROP POLICY IF EXISTS "Anon reads active barbers via view" ON public.barbers;
DROP POLICY IF EXISTS "Public reads shop settings via view" ON public.shop_settings;
REVOKE SELECT ON public.barbers FROM anon;
REVOKE SELECT ON public.shop_settings FROM anon;