CREATE OR REPLACE FUNCTION public.set_shop_account_status(_id uuid, _action text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_superadmin(auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _action = 'approve' THEN
    UPDATE barbershops SET subscription_status='active', status='active', approved_at=now(),
      subscription_started_at=coalesce(subscription_started_at, now()) WHERE id=_id;
  ELSIF _action = 'reject' THEN
    UPDATE barbershops SET subscription_status='cancelled', status='inactive' WHERE id=_id;
  ELSIF _action = 'block' THEN
    UPDATE barbershops SET subscription_status='suspended', status='suspended' WHERE id=_id;
  ELSIF _action = 'reactivate' THEN
    UPDATE barbershops SET subscription_status='active', status='active' WHERE id=_id;
  ELSE RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  RETURN true;
END $$;