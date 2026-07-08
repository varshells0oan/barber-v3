GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.barbershops TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.barbershops TO authenticated;
GRANT ALL ON public.barbershops TO service_role;

GRANT SELECT ON public.barbershop_invites TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.barbershop_invites TO authenticated;
GRANT ALL ON public.barbershop_invites TO service_role;

GRANT SELECT ON public.barbers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;

GRANT SELECT ON public.services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;

GRANT SELECT ON public.shop_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_in(uuid, app_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_barbershop_admin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_barbershop_basic(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_barbershop_invite(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_barbershop_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_barbershop_invite(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_invite_by_hash(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_taken_slots(uuid, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_my_appointments(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_cancel_my_appointment(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_upsert_client(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_client_loyalty(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_appointment(uuid, uuid, uuid, date, text, text, text, text) TO anon, authenticated;