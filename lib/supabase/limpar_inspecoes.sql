-- =============================================================================
-- Argus — Script de Limpeza Completa de Inspeções e Testes
-- Executar no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Zera todo o histórico de execuções, itens, NCs e restaura as salas e ativos
-- =============================================================================

-- 1. Limpa todas as tabelas de inspeções e NCs em cascata (ignora triggers de linha com segurança)
TRUNCATE TABLE 
  public.nao_conformidades, 
  public.itens_execucao_checklist, 
  public.execucoes_checklist,
  public.tarefas_checklist
CASCADE;

-- 2. Reseta o status de todos os equipamentos para 'operacional'
UPDATE public.ativos 
SET status = 'operacional';

-- 3. Reseta o status de todas as salas para 'pronta' e sem liberação manual
UPDATE public.locais 
SET status = 'pronta', 
    liberada_manualmente = false;
