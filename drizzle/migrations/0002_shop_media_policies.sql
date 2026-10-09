CREATE OR REPLACE FUNCTION public.can_manage_shop(_shop uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbershops b WHERE b.id = _shop AND b.owner_user_id = auth.uid())
    OR public.has_role_in(auth.uid(), 'admin', _shop) OR public.is_superadmin(auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_shop(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_manage_shop(uuid) TO authenticated;
CREATE POLICY "shop media read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shop-media' AND public.can_manage_shop(((storage.foldername(name))[1])::uuid));
CREATE POLICY "shop media insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shop-media' AND public.can_manage_shop(((storage.foldername(name))[1])::uuid));
CREATE POLICY "shop media delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shop-media' AND public.can_manage_shop(((storage.foldername(name))[1])::uuid));