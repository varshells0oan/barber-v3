
-- Revogar EXECUTE de anon (público) em funções que exigem auth.uid() internamente.
-- Elas continuam disponíveis para 'authenticated' e 'service_role'.
REVOKE ALL ON FUNCTION public.assign_barbershop_admin(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.claim_superadmin() FROM public, anon;
REVOKE ALL ON FUNCTION public.create_barbershop_invite(uuid, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.cancel_barbershop_invite(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.accept_barbershop_invite(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.update_barbershop_basic(uuid, text, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.set_barbershop_admin_credentials(uuid, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_invite_by_hash(text) FROM public, anon;

-- Garante que continuam chamáveis por quem deve
GRANT EXECUTE ON FUNCTION public.assign_barbershop_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_barbershop_invite(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_barbershop_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_barbershop_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_barbershop_basic(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_barbershop_admin_credentials(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_by_hash(text) TO authenticated;
