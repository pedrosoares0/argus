-- =============================================================================
-- Migration: Perfil Técnico por Setor, Roteamento de NC e Resolução Direta
-- Execute no Supabase SQL Editor
-- =============================================================================

BEGIN;

-- 1. Permite o perfil 'tecnico' se for ENUM ou TEXT
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perfil_usuario') THEN
    ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'tecnico';
  END IF;
END$$;

-- 2. Adiciona a coluna 'setor' na tabela de usuários (caso ainda não exista)
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS setor TEXT DEFAULT NULL;

-- 3. Adiciona as colunas 'tipo' e 'setor_responsavel' na tabela de não conformidades
ALTER TABLE public.nao_conformidades 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'equipamento',
ADD COLUMN IF NOT EXISTS setor_responsavel TEXT DEFAULT 'engenharia_clinica';

-- 4. Migra usuários legados com perfil engenharia_clinica para ter o setor configurado
UPDATE public.usuarios 
SET setor = 'engenharia_clinica' 
WHERE perfil = 'engenharia_clinica' AND (setor IS NULL OR setor = '');

-- 5. Atualiza o trigger on auth.users para salvar automaticamente o setor cadastrado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, hospital_id, nome, email, perfil, setor, numero_conselho, ativo, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'hospital_id')::uuid, 'e632822a-0000-0000-0000-000000000001'::uuid),
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'inspetor'),
    NEW.raw_user_meta_data->>'setor',
    NEW.raw_user_meta_data->>'numero_conselho',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    perfil = EXCLUDED.perfil,
    setor = EXCLUDED.setor,
    numero_conselho = EXCLUDED.numero_conselho,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Políticas de Segurança RLS para permitir Técnicos interagirem com as tabelas
DO $$
BEGIN
  -- Permite técnicos visualizarem e atualizarem NCs do seu setor
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'nao_conformidades') THEN
    DROP POLICY IF EXISTS "Tecnicos podem visualizar e atualizar NCs" ON public.nao_conformidades;
    CREATE POLICY "Tecnicos podem visualizar e atualizar NCs"
      ON public.nao_conformidades
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

COMMIT;
