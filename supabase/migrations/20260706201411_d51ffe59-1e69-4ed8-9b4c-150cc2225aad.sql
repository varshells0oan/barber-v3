
DO $$
DECLARE
  sa_id uuid;
BEGIN
  SELECT id INTO sa_id FROM auth.users WHERE email = 'superadmin@icloud.com';
  IF sa_id IS NULL THEN
    sa_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', sa_id, 'authenticated', 'authenticated',
      'superadmin@icloud.com', crypt('!12345678aA', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), sa_id, jsonb_build_object('sub', sa_id::text, 'email', 'superadmin@icloud.com'), 'email', sa_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (sa_id, 'superadmin', NULL)
  ON CONFLICT DO NOTHING;
END $$;
