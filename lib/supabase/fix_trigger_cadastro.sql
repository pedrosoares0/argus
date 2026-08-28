-- =============================================================================
-- CORREÇÃO CRÍTICA: Trigger handle_new_user no Supabase
-- Motivo do erro 500 ("Database error saving new user" / erro "{}"):
-- O trigger anterior tentava gravar nas colunas 'ativo', 'created_at' e 'updated_at',
-- que não existem na tabela public.usuarios (a coluna correta é 'criado_em').
--
-- EXECUTE ESTE SCRIPT NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/ilkqkqzhnlmhoxqavcfp/sql
-- =============================================================================

BEGIN;

-- 1. Garante que o tipo perfil_usuario aceite 'coordenador', 'inspetor', 'engenharia_clinica', 'tecnico'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perfil_usuario') THEN
    ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'coordenador';
    ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'tecnico';
    ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'inspetor';
    ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'engenharia_clinica';
  END IF;
END$$;

-- 2. Recria a função handle_new_user usando estritamente as colunas existentes em public.usuarios
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
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(EXCLUDED.nome, usuarios.nome),
    email = COALESCE(EXCLUDED.email, usuarios.email),
    perfil = COALESCE(EXCLUDED.perfil, usuarios.perfil),
    setor = COALESCE(EXCLUDED.setor, usuarios.setor),
    numero_conselho = COALESCE(EXCLUDED.numero_conselho, usuarios.numero_conselho);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reassocia o trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
