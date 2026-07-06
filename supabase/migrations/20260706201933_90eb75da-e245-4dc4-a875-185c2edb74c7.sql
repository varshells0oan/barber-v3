
CREATE OR REPLACE FUNCTION public.public_get_client_loyalty(
  _barbershop_id uuid, _phone text
) RETURNS TABLE(name text, loyalty_points int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.name, c.loyalty_points
  FROM public.clients c
  WHERE c.barbershop_id = _barbershop_id AND c.phone = _phone
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.public_get_client_loyalty(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_client_loyalty(uuid, text) TO anon, authenticated;
