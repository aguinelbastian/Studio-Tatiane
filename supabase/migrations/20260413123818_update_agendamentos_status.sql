ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_status_check CHECK (status IN ('agendado', 'realizado', 'cancelado', 'falta_sem_aviso', 'a_repor'));

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION create_new_user(
  p_email TEXT,
  p_password TEXT,
  p_nome TEXT,
  p_role TEXT,
  p_avatar_url TEXT DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
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
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    json_build_object('name', p_nome, 'avatar_url', p_avatar_url),
    false, 'authenticated', 'authenticated',
    '', '', '', '', '', NULL, '', '', ''
  );

  INSERT INTO public.usuarios (id, email, nome, role, avatar_url, status)
  VALUES (new_user_id, p_email, p_nome, p_role, p_avatar_url, 'ativo')
  ON CONFLICT (id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url;

  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.usuarios WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;
