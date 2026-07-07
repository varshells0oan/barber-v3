
-- 1) claim_superadmin: authenticated user with email = 'superadmin@icloud.com' can claim role
CREATE OR REPLACE FUNCTION public.claim_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF lower(coalesce(_email,'')) <> 'superadmin@icloud.com' THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (_uid, 'superadmin'::app_role, NULL)
  ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.claim_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_superadmin() TO authenticated;

-- 2) assign_barbershop_admin: only superadmin can grant admin role to an existing user by email
CREATE OR REPLACE FUNCTION public.assign_barbershop_admin(_barbershop_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _target uuid;
BEGIN
  IF _caller IS NULL OR NOT public.is_superadmin(_caller) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  SELECT id INTO _target FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF _target IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = _barbershop_id) THEN
    RAISE EXCEPTION 'BARBERSHOP_NOT_FOUND';
  END IF;
  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (_target, 'admin'::app_role, _barbershop_id)
  ON CONFLICT DO NOTHING;
  RETURN _target;
END $$;

REVOKE ALL ON FUNCTION public.assign_barbershop_admin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_barbershop_admin(uuid, text) TO authenticated;

-- 3) update_barbershop_basic: superadmin can update name/slug/status of a barbershop
CREATE OR REPLACE FUNCTION public.update_barbershop_basic(_id uuid, _name text, _slug text, _status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;
  IF _slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'INVALID_SLUG';
  END IF;
  IF _status NOT IN ('active','inactive') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;
  UPDATE public.barbershops
     SET name = btrim(_name), slug = btrim(_slug), status = _status, updated_at = now()
   WHERE id = _id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.update_barbershop_basic(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_barbershop_basic(uuid, text, text, text) TO authenticated;
