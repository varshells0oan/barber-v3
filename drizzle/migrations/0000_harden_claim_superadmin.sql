CREATE OR REPLACE FUNCTION public.claim_superadmin()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _email text; _confirmed timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT email, email_confirmed_at INTO _email, _confirmed FROM auth.users WHERE id = _uid;
  IF lower(coalesce(_email,'')) <> 'superadmin@icloud.com' OR _confirmed IS NULL THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role='superadmin' AND user_id <> _uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (_uid, 'superadmin'::app_role, NULL) ON CONFLICT DO NOTHING;
  RETURN true;
END $function$;
REVOKE EXECUTE ON FUNCTION public.claim_superadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_superadmin() TO authenticated;