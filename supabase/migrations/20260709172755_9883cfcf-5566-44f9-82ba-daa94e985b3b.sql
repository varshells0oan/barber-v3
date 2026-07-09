UPDATE auth.users
SET encrypted_password = crypt('94961118', gen_salt('bf')),
    updated_at = now()
WHERE lower(email) = 'superadmin@icloud.com';