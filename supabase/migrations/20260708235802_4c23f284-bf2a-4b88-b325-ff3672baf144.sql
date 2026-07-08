REVOKE EXECUTE ON FUNCTION public.claim_superadmin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_barbershop_admin(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_barbershop_basic(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_barbershop_invite(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_barbershop_invite(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_barbershop_invite(text) FROM anon;