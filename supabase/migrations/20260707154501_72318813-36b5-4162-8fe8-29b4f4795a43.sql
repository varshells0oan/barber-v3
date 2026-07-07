
CREATE TABLE public.barbershop_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'admin'::app_role,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_barbershop ON public.barbershop_invites(barbershop_id);
CREATE INDEX idx_invites_email ON public.barbershop_invites(lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbershop_invites TO authenticated;
GRANT ALL ON public.barbershop_invites TO service_role;

ALTER TABLE public.barbershop_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin manages invites"
  ON public.barbershop_invites FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE TRIGGER trg_invites_updated_at
  BEFORE UPDATE ON public.barbershop_invites
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RPC: superadmin cria convite (recebe token_hash calculado no client)
CREATE OR REPLACE FUNCTION public.create_barbershop_invite(
  _barbershop_id uuid, _email text, _token_hash text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF _email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'INVALID_EMAIL'; END IF;
  IF length(_token_hash) < 32 THEN RAISE EXCEPTION 'INVALID_TOKEN_HASH'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = _barbershop_id) THEN
    RAISE EXCEPTION 'BARBERSHOP_NOT_FOUND';
  END IF;
  -- Cancela convites pendentes anteriores para o mesmo email+barbearia
  UPDATE public.barbershop_invites
     SET status = 'cancelled', updated_at = now()
   WHERE barbershop_id = _barbershop_id
     AND lower(email) = lower(_email)
     AND status = 'pending';
  INSERT INTO public.barbershop_invites (barbershop_id, email, token_hash, created_by)
  VALUES (_barbershop_id, lower(btrim(_email)), _token_hash, auth.uid())
  RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.create_barbershop_invite(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_barbershop_invite(uuid, text, text) TO authenticated;

-- RPC: superadmin cancela convite
CREATE OR REPLACE FUNCTION public.cancel_barbershop_invite(_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_superadmin(auth.uid()) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  UPDATE public.barbershop_invites SET status='cancelled', updated_at=now()
   WHERE id = _id AND status = 'pending';
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.cancel_barbershop_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_barbershop_invite(uuid) TO authenticated;

-- RPC: qualquer usuário logado consulta um convite pelo hash (para saber email e slug antes de aceitar)
CREATE OR REPLACE FUNCTION public.get_invite_by_hash(_token_hash text)
RETURNS TABLE(email text, barbershop_slug text, barbershop_name text, status text, expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT i.email, b.slug, b.name, i.status, i.expires_at
    FROM public.barbershop_invites i
    JOIN public.barbershops b ON b.id = i.barbershop_id
   WHERE i.token_hash = _token_hash
   LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_invite_by_hash(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_hash(text) TO authenticated, anon;

-- RPC: usuário autenticado aceita convite
CREATE OR REPLACE FUNCTION public.accept_barbershop_invite(_token_hash text)
RETURNS text  -- retorna slug da barbearia
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _user_email text;
  _inv record;
  _slug text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT email INTO _user_email FROM auth.users WHERE id = _uid;

  SELECT * INTO _inv FROM public.barbershop_invites WHERE token_hash = _token_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVITE_NOT_FOUND'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'INVITE_NOT_PENDING'; END IF;
  IF _inv.expires_at < now() THEN
    UPDATE public.barbershop_invites SET status='cancelled', updated_at=now() WHERE id=_inv.id;
    RAISE EXCEPTION 'INVITE_EXPIRED';
  END IF;
  IF lower(coalesce(_user_email,'')) <> lower(_inv.email) THEN
    RAISE EXCEPTION 'EMAIL_MISMATCH';
  END IF;

  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (_uid, _inv.role, _inv.barbershop_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.barbershop_invites
     SET status='accepted', accepted_by=_uid, accepted_at=now(), updated_at=now()
   WHERE id = _inv.id;

  SELECT slug INTO _slug FROM public.barbershops WHERE id = _inv.barbershop_id;
  RETURN _slug;
END $$;
REVOKE ALL ON FUNCTION public.accept_barbershop_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_barbershop_invite(text) TO authenticated;
