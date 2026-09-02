-- =============================================================================
-- MIGRATION OFICIAL: Suporte a Foto de Avatar do Usuário (Storage + Banco)
--
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/ilkqkqzhnlmhoxqavcfp/sql
-- =============================================================================

BEGIN;

-- 1. Adiciona coluna avatar_url na tabela public.usuarios (se não existir)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Cria o Bucket 'avatars' no Supabase Storage (público para CDN)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de RLS para o Storage
DO $$
BEGIN
  -- Política de Leitura Pública
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Avatares são públicos para todos'
  ) THEN
    CREATE POLICY "Avatares são públicos para todos" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  -- Política de Upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Permitir upload de avatares'
  ) THEN
    CREATE POLICY "Permitir upload de avatares" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');
  END IF;

  -- Política de Update/Overwrite
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Permitir atualizar avatares'
  ) THEN
    CREATE POLICY "Permitir atualizar avatares" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');
  END IF;
END $$;

-- 4. Atualiza a função do trigger handle_new_user para vincular novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (
    id,
    hospital_id,
    nome,
    email,
    perfil,
    setor,
    numero_conselho,
    avatar_url,
    criado_em
  )
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'hospital_id')::uuid, 'e632822a-0000-0000-0000-000000000001'::uuid),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'inspetor'),
    NEW.raw_user_meta_data->>'setor',
    NEW.raw_user_meta_data->>'numero_conselho',
    NEW.raw_user_meta_data->>'avatar_url',
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, usuarios.nome),
    email = COALESCE(EXCLUDED.email, usuarios.email),
    perfil = COALESCE(EXCLUDED.perfil, usuarios.perfil),
    setor = COALESCE(EXCLUDED.setor, usuarios.setor),
    numero_conselho = COALESCE(EXCLUDED.numero_conselho, usuarios.numero_conselho),
    avatar_url = COALESCE(EXCLUDED.avatar_url, usuarios.avatar_url);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
