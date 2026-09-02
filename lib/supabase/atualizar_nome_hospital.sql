-- =============================================================================
-- Primus — Script de Atualização: Hospital Piemonte Paraguaçu
-- Executar no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Atualiza o registro do hospital piloto e eventuais ativos vinculados
-- =============================================================================

BEGIN;

-- 1. Atualiza o nome oficial do hospital
UPDATE public.hospitais
SET nome = 'Hospital Piemonte Paraguaçu'
WHERE id = 'e632822a-0000-0000-0000-000000000001';

-- Se por algum motivo o registro ainda não existir na tabela hospitais:
INSERT INTO public.hospitais (id, nome, criado_em)
VALUES ('e632822a-0000-0000-0000-000000000001', 'Hospital Piemonte Paraguaçu', now())
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- 2. Atualiza eventuais referências a 'Itaberaba' em nomes de ativos
UPDATE public.ativos
SET nome = REPLACE(nome, 'Itaberaba', 'Piemonte Paraguaçu')
WHERE nome ILIKE '%Itaberaba%';

-- 3. Garante que as políticas de leitura permitam ver o hospital
ALTER TABLE public.hospitais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura publica de hospitais" ON public.hospitais;
CREATE POLICY "Permitir leitura publica de hospitais"
  ON public.hospitais
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;

-- Consulta de confirmação
SELECT id, nome, criado_em FROM public.hospitais;
