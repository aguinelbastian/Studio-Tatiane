DO $$
DECLARE
  admin_id uuid;
  tatiane_id uuid;
  renata_id uuid;
  miriam_id uuid;
  aguinel_id uuid;
BEGIN
  -- admin@studio.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@studio.com') THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      admin_id, '00000000-0000-0000-0000-000000000000', 'admin@studio.com',
      crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Admin Geral"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.usuarios (id, email, nome, role, status)
    VALUES (admin_id, 'admin@studio.com', 'Admin Geral', 'admin', 'ativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  -- tatiane@studio.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'tatiane@studio.com') THEN
    tatiane_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      tatiane_id, '00000000-0000-0000-0000-000000000000', 'tatiane@studio.com',
      crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Tatiane Kafka Ghizoni"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.usuarios (id, email, nome, role, status)
    VALUES (tatiane_id, 'tatiane@studio.com', 'Tatiane Kafka Ghizoni', 'admin', 'ativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  -- renata@studio.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'renata@studio.com') THEN
    renata_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      renata_id, '00000000-0000-0000-0000-000000000000', 'renata@studio.com',
      crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Renata Tomazetti"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.usuarios (id, email, nome, role, status)
    VALUES (renata_id, 'renata@studio.com', 'Renata Tomazetti', 'professor', 'ativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  -- miriam@studio.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'miriam@studio.com') THEN
    miriam_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      miriam_id, '00000000-0000-0000-0000-000000000000', 'miriam@studio.com',
      crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Miriam"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.usuarios (id, email, nome, role, status)
    VALUES (miriam_id, 'miriam@studio.com', 'Miriam', 'professor', 'ativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  -- aguinel@studio.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'aguinel@studio.com') THEN
    aguinel_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      aguinel_id, '00000000-0000-0000-0000-000000000000', 'aguinel@studio.com',
      crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Aguinel"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.usuarios (id, email, nome, role, status)
    VALUES (aguinel_id, 'aguinel@studio.com', 'Aguinel', 'admin', 'ativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;
  
  -- Create missing profissionais to map correctly
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE email = 'tatiane@studio.com') AND NOT EXISTS (SELECT 1 FROM public.profissionais WHERE nome = 'Tatiane Kafka Ghizoni') THEN
    INSERT INTO public.profissionais (usuario_id, nome, tipo, comissao_percentual, status)
    SELECT id, 'Tatiane Kafka Ghizoni', 'pilates', 50, 'ativo' FROM public.usuarios WHERE email = 'tatiane@studio.com'
    ON CONFLICT (usuario_id) DO NOTHING;
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.usuarios WHERE email = 'renata@studio.com') AND NOT EXISTS (SELECT 1 FROM public.profissionais WHERE nome = 'Renata Tomazetti') THEN
    INSERT INTO public.profissionais (usuario_id, nome, tipo, comissao_percentual, status)
    SELECT id, 'Renata Tomazetti', 'pilates', 40, 'ativo' FROM public.usuarios WHERE email = 'renata@studio.com'
    ON CONFLICT (usuario_id) DO NOTHING;
  END IF;

END $$;
