DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- User Tatiane
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tatiane@studio.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'tatiane@studio.com',
      crypt('senha123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Tatiane Kafka Ghizoni"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- User Renata
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'renata@studio.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'renata@studio.com', crypt('senha123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Renata Tomazetti"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- User Miriam
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'miriam@studio.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'miriam@studio.com', crypt('senha123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Miriam"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- User Aguinel
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'aguinel@studio.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'aguinel@studio.com', crypt('senha123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Aguinel"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- User aguinel@gmail.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'aguinel@gmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000',
      'aguinel@gmail.com', crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Aguinel Skip"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- Ensure they exist in usuarios table as well
  INSERT INTO public.usuarios (email, nome, role, status) VALUES 
    ('tatiane@studio.com', 'Tatiane Kafka Ghizoni', 'admin', 'ativo'),
    ('renata@studio.com', 'Renata Tomazetti', 'professor', 'ativo'),
    ('miriam@studio.com', 'Miriam', 'massoterapeuta', 'ativo'),
    ('aguinel@studio.com', 'Aguinel', 'admin', 'ativo'),
    ('aguinel@gmail.com', 'Aguinel Skip', 'admin', 'ativo')
  ON CONFLICT (email) DO NOTHING;

END $$;
