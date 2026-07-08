UPDATE auth.users SET encrypted_password = crypt('123456', gen_salt('bf')), email_confirmed_at = COALESCE(email_confirmed_at, now()), updated_at = now() WHERE email = 'superadmin@icloud.com';

INSERT INTO public.user_roles (user_id, role, barbershop_id)
SELECT id, 'superadmin'::app_role, NULL FROM auth.users WHERE email = 'superadmin@icloud.com'
ON CONFLICT DO NOTHING;