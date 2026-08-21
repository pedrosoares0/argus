-- =============================================================================
-- Script para Limpar TODAS as Inspeções e Testes Anteriores
-- Executar no SQL Editor do Supabase para zerar o histórico
-- =============================================================================

BEGIN;

-- 1. Remove todas as Não Conformidades geradas em testes
DELETE FROM public.nao_conformidades;

-- 2. Remove todas as respostas individuais dos itens de checklist
DELETE FROM public.itens_execucao_checklist;

-- 3. Remove todas as execuções de checklist (histórico de rondas/inspeções)
DELETE FROM public.execucoes_checklist;

-- 4. Remove tarefas agendadas de checklist se houver
DELETE FROM public.tarefas_checklist;

-- 5. Reseta o status de todos os equipamentos para 'operacional'
UPDATE public.ativos 
SET status = 'operacional';

-- 6. Reseta o status de todas as salas para 'pronta' sem liberação manual
UPDATE public.locais 
SET status = 'pronta', 
    liberada_manualmente = false;

COMMIT;
