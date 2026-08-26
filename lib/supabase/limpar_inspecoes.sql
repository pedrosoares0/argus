-- =============================================================================
-- Argus — Script de Limpeza Completa de Inspeções e Testes
-- Executar no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Zera todo o histórico de execuções, itens, NCs e restaura as salas para "Pendente"
-- =============================================================================

BEGIN;

-- 1. Desativa temporariamente os triggers de imutabilidade (RN-005)
ALTER TABLE public.execucoes_checklist DISABLE TRIGGER ALL;
ALTER TABLE public.itens_execucao_checklist DISABLE TRIGGER ALL;
ALTER TABLE public.nao_conformidades DISABLE TRIGGER ALL;

-- 2. Remove todas as Não Conformidades (NCs) geradas em testes
DELETE FROM public.nao_conformidades;

-- 3. Remove todas as respostas dos itens de checklist
DELETE FROM public.itens_execucao_checklist;

-- 4. Remove todas as execuções de checklist (histórico de rondas)
DELETE FROM public.execucoes_checklist;

-- 5. Remove tarefas agendadas de checklist (se houver)
DELETE FROM public.tarefas_checklist;

-- 6. Reseta o status de todos os equipamentos para 'operacional'
UPDATE public.ativos 
SET status = 'operacional';

-- 7. Reseta o status de todas as salas para 'pronta' e sem liberação manual
UPDATE public.locais 
SET status = 'pronta', 
    liberada_manualmente = false;

-- 8. Reativa os triggers
ALTER TABLE public.execucoes_checklist ENABLE TRIGGER ALL;
ALTER TABLE public.itens_execucao_checklist ENABLE TRIGGER ALL;
ALTER TABLE public.nao_conformidades ENABLE TRIGGER ALL;

COMMIT;
