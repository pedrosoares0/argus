-- =============================================================================
-- Migration: Modelo de Salas Cirúrgicas
-- Cria tabela sala_ativos (M:N), salas 03/04, 7 novas categorias,
-- 7 modelos de checklist, 51 itens de inspeção, 24 novos ativos,
-- e 27 vínculos sala↔ativo (incluindo Carrinho de Parada compartilhado).
--
-- Executar no Supabase SQL Editor.
-- =============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. TABELA DE JUNÇÃO sala_ativos (M:N)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sala_ativos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL REFERENCES public.locais(id) ON DELETE CASCADE,
  ativo_id UUID NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  compartilhado BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(local_id, ativo_id)
);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. CRIAR SALAS 03 E 04
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.locais (id, centro_cirurgico_id, tipo, nome, codigo_qr, status, liberada_manualmente, criado_em)
VALUES
  ('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-000000000003', 'sala', 'Sala 03', 'QR-SALA-03', 'pronta', false, now()),
  ('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-000000000003', 'sala', 'Sala 04', 'QR-SALA-04', 'pronta', false, now())
ON CONFLICT (id) DO UPDATE SET
  centro_cirurgico_id = EXCLUDED.centro_cirurgico_id,
  tipo = EXCLUDED.tipo,
  nome = EXCLUDED.nome,
  codigo_qr = EXCLUDED.codigo_qr;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. CRIAR 7 NOVAS CATEGORIAS DE ATIVO
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.categorias_ativos (id, nome) VALUES
  ('e632822a-0000-0000-0000-100000000001', 'Monitor multiparamétrico'),
  ('e632822a-0000-0000-0000-100000000002', 'Mesa cirúrgica'),
  ('e632822a-0000-0000-0000-100000000003', 'Bisturi elétrico'),
  ('e632822a-0000-0000-0000-100000000004', 'Aspirador cirúrgico'),
  ('e632822a-0000-0000-0000-100000000005', 'Foco cirúrgico'),
  ('e632822a-0000-0000-0000-100000000006', 'Bombas de infusão'),
  ('e632822a-0000-0000-0000-100000000007', 'Gases medicinais')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. CRIAR 7 MODELOS DE CHECKLIST (um por categoria nova)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.modelos_checklist (id, categoria_id, nome_variante, versao, frequencia, horarios_do_dia, vigente, criado_em) VALUES
  ('e632822a-0000-0000-0000-200000000001', 'e632822a-0000-0000-0000-100000000001', 'Padrão', 1, 'diaria', '["07:00", "19:00"]'::jsonb, true, now()),
  ('e632822a-0000-0000-0000-200000000002', 'e632822a-0000-0000-0000-100000000002', 'Padrão', 1, 'diaria', '["07:00", "19:00"]'::jsonb, true, now()),
  ('e632822a-0000-0000-0000-200000000003', 'e632822a-0000-0000-0000-100000000003', 'Padrão', 1, 'diaria', '["07:00", "19:00"]'::jsonb, true, now()),
  ('e632822a-0000-0000-0000-200000000004', 'e632822a-0000-0000-0000-100000000004', 'Padrão', 1, 'diaria', '["07:00", "19:00"]'::jsonb, true, now()),
  ('e632822a-0000-0000-0000-200000000005', 'e632822a-0000-0000-0000-100000000005', 'Padrão', 1, 'diaria', '["07:00", "19:00"]'::jsonb, true, now()),
  ('e632822a-0000-0000-0000-200000000006', 'e632822a-0000-0000-0000-100000000006', 'Padrão', 1, 'diaria', '["07:00", "19:00"]'::jsonb, true, now()),
  ('e632822a-0000-0000-0000-200000000007', 'e632822a-0000-0000-0000-100000000007', 'Padrão', 1, 'diaria', '["07:00", "19:00"]'::jsonb, true, now())
ON CONFLICT (categoria_id, versao) DO UPDATE SET
  nome_variante = EXCLUDED.nome_variante,
  frequencia = EXCLUDED.frequencia,
  horarios_do_dia = EXCLUDED.horarios_do_dia,
  vigente = EXCLUDED.vigente;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. CADASTRAR ITENS DE CHECKLIST (51 itens)
-- ═══════════════════════════════════════════════════════════════════════

-- Limpa itens antigos dos novos modelos (idempotência)
DELETE FROM public.itens_modelo_checklist WHERE modelo_id IN (
  'e632822a-0000-0000-0000-200000000001',
  'e632822a-0000-0000-0000-200000000002',
  'e632822a-0000-0000-0000-200000000003',
  'e632822a-0000-0000-0000-200000000004',
  'e632822a-0000-0000-0000-200000000005',
  'e632822a-0000-0000-0000-200000000006',
  'e632822a-0000-0000-0000-200000000007'
);

-- ── Monitor multiparamétrico (11 itens) ─────────────────────────────
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-200000000001',  1, 'Equipamento liga normalmente', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000001',  2, 'Bateria funcionando', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000001',  3, 'Cabo de alimentação íntegro', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000001',  4, 'Cabo de PNI disponível e íntegro', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000001',  5, 'Manguitos de PNI disponíveis nos tamanhos necessários', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000001',  6, 'Sensor de SpO₂ disponível e funcionando', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000001',  7, 'Cabo de ECG/cardioscopia disponível e íntegro', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000001',  8, 'Capnografia disponível e funcionando', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000001',  9, 'Cabo de PAI disponível e íntegro, quando aplicável', 'informativo', true, false, null),
('e632822a-0000-0000-0000-200000000001', 10, 'Transdutor/acessórios de PAI disponíveis, quando aplicável', 'informativo', true, false, null),
('e632822a-0000-0000-0000-200000000001', 11, 'Tela e alarmes funcionando adequadamente', 'critico', true, false, null);

-- ── Mesa cirúrgica (11 itens) ───────────────────────────────────────
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-200000000002',  1, 'Equipamento funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000002',  2, 'Cabo de alimentação íntegro', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000002',  3, 'Elevação/descida da mesa funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000002',  4, 'Elevação/descida da cabeceira funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000002',  5, 'Trendelenburg e Proclive funcionando', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000002',  6, 'Movimentação lateral funcionando', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000002',  7, 'Rodas e sistema de travamento funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000002',  8, 'Braçadeiras disponíveis e íntegras', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000002',  9, 'Perneiras disponíveis e íntegras', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000002', 10, 'Colchão e acessórios em condições adequadas', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000002', 11, 'Controle/comando funcionando', 'critico', true, false, null);

-- ── Bisturi elétrico (8 itens) ──────────────────────────────────────
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-200000000003', 1, 'Equipamento liga normalmente', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000003', 2, 'Cabo de alimentação íntegro', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000003', 3, 'Cabo da placa/paciente disponível e íntegro', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000003', 4, 'Pedal disponível e funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000003', 5, 'Caneta ativa disponível', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000003', 6, 'Funcionamento dos modos de corte/coagulação', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000003', 7, 'Placas de retorno disponíveis, dentro da validade e íntegras', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000003', 8, 'Cabos e conexões íntegros', 'importante', true, false, null);

-- ── Aspirador cirúrgico (5 itens) ───────────────────────────────────
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-200000000004', 1, 'Equipamento liga normalmente', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000004', 2, 'Sucção funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000004', 3, 'Frasco coletor disponível', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000004', 4, 'Tubulação disponível e íntegra', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000004', 5, 'Filtro/conexões em condições adequadas', 'importante', true, false, null);

-- ── Foco cirúrgico (5 itens) ────────────────────────────────────────
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-200000000005', 1, 'Equipamento liga normalmente', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000005', 2, 'Iluminação funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000005', 3, 'Intensidade da luz adequada', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000005', 4, 'Movimentação vertical e horizontal funcionando', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000005', 5, 'Articulações/braços sem travamentos', 'importante', true, false, null);

-- ── Bombas de infusão (6 itens) ─────────────────────────────────────
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-200000000006', 1, 'Equipamento liga normalmente', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000006', 2, 'Cabo de alimentação íntegro', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000006', 3, 'Bateria funcionando', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000006', 4, 'Teclado/comandos funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000006', 5, 'Cabos/conexões íntegros', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000006', 6, 'Display/tela funcionando adequadamente', 'critico', true, false, null);

-- ── Gases medicinais (5 itens) ──────────────────────────────────────
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-200000000007', 1, 'Saída de O₂ funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000007', 2, 'Saída de ar comprimido funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000007', 3, 'Sistema de vácuo funcionando', 'critico', true, false, null),
('e632822a-0000-0000-0000-200000000007', 4, 'Conexões identificadas e íntegras', 'importante', true, false, null),
('e632822a-0000-0000-0000-200000000007', 5, 'Mangueiras/conectores em condições adequadas', 'importante', true, false, null);

-- ═══════════════════════════════════════════════════════════════════════
-- 6. CRIAR ATIVOS (8 exclusivos por sala × 3 salas = 24 novos ativos)
-- ═══════════════════════════════════════════════════════════════════════

-- IDs das salas:
--   Sala 01 = e632822a-0000-0000-0000-000000000004
--   Sala 03 = e632822a-0000-0000-0000-000000000030
--   Sala 04 = e632822a-0000-0000-0000-000000000040
-- Hospital  = e632822a-0000-0000-0000-000000000001

-- ── SALA 01 ─────────────────────────────────────────────────────────

INSERT INTO public.ativos (id, hospital_id, categoria_id, local_id, nome, patrimonio, codigo_qr, status, criado_em) VALUES
-- Carrinho de Anestesia - Sala 01
('e632822a-0000-0000-0000-300000000101', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-000000000015', 'e632822a-0000-0000-0000-000000000004', 'Carrinho de Anestesia - Sala 01', 'PAT-ANES-S01', 'Car.Anes.S01', 'operacional', now()),
-- Monitor Multiparamétrico - Sala 01
('e632822a-0000-0000-0000-300000000102', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000001', 'e632822a-0000-0000-0000-000000000004', 'Monitor Multiparamétrico - Sala 01', 'PAT-MON-S01', 'QR-MON-S01', 'operacional', now()),
-- Mesa Cirúrgica - Sala 01
('e632822a-0000-0000-0000-300000000103', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000002', 'e632822a-0000-0000-0000-000000000004', 'Mesa Cirúrgica - Sala 01', 'PAT-MESA-S01', 'QR-MESA-S01', 'operacional', now()),
-- Bisturi Elétrico - Sala 01
('e632822a-0000-0000-0000-300000000104', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000003', 'e632822a-0000-0000-0000-000000000004', 'Bisturi Elétrico - Sala 01', 'PAT-BIST-S01', 'QR-BIST-S01', 'operacional', now()),
-- Aspirador Cirúrgico - Sala 01
('e632822a-0000-0000-0000-300000000105', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000004', 'e632822a-0000-0000-0000-000000000004', 'Aspirador Cirúrgico - Sala 01', 'PAT-ASP-S01', 'QR-ASP-S01', 'operacional', now()),
-- Foco Cirúrgico - Sala 01
('e632822a-0000-0000-0000-300000000106', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000005', 'e632822a-0000-0000-0000-000000000004', 'Foco Cirúrgico - Sala 01', 'PAT-FOCO-S01', 'QR-FOCO-S01', 'operacional', now()),
-- Bombas de Infusão - Sala 01
('e632822a-0000-0000-0000-300000000107', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000006', 'e632822a-0000-0000-0000-000000000004', 'Bombas de Infusão - Sala 01', 'PAT-BOMB-S01', 'QR-BOMB-S01', 'operacional', now()),
-- Gases Medicinais - Sala 01
('e632822a-0000-0000-0000-300000000108', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000007', 'e632822a-0000-0000-0000-000000000004', 'Gases Medicinais - Sala 01', 'PAT-GAS-S01', 'QR-GAS-S01', 'operacional', now())
ON CONFLICT (id) DO UPDATE SET
  hospital_id = EXCLUDED.hospital_id, categoria_id = EXCLUDED.categoria_id,
  local_id = EXCLUDED.local_id, nome = EXCLUDED.nome, patrimonio = EXCLUDED.patrimonio,
  codigo_qr = EXCLUDED.codigo_qr, status = EXCLUDED.status;

-- ── SALA 03 ─────────────────────────────────────────────────────────

INSERT INTO public.ativos (id, hospital_id, categoria_id, local_id, nome, patrimonio, codigo_qr, status, criado_em) VALUES
('e632822a-0000-0000-0000-300000000301', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-000000000015', 'e632822a-0000-0000-0000-000000000030', 'Carrinho de Anestesia - Sala 03', 'PAT-ANES-S03', 'Car.Anes.S03', 'operacional', now()),
('e632822a-0000-0000-0000-300000000302', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000001', 'e632822a-0000-0000-0000-000000000030', 'Monitor Multiparamétrico - Sala 03', 'PAT-MON-S03', 'QR-MON-S03', 'operacional', now()),
('e632822a-0000-0000-0000-300000000303', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000002', 'e632822a-0000-0000-0000-000000000030', 'Mesa Cirúrgica - Sala 03', 'PAT-MESA-S03', 'QR-MESA-S03', 'operacional', now()),
('e632822a-0000-0000-0000-300000000304', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000003', 'e632822a-0000-0000-0000-000000000030', 'Bisturi Elétrico - Sala 03', 'PAT-BIST-S03', 'QR-BIST-S03', 'operacional', now()),
('e632822a-0000-0000-0000-300000000305', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000004', 'e632822a-0000-0000-0000-000000000030', 'Aspirador Cirúrgico - Sala 03', 'PAT-ASP-S03', 'QR-ASP-S03', 'operacional', now()),
('e632822a-0000-0000-0000-300000000306', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000005', 'e632822a-0000-0000-0000-000000000030', 'Foco Cirúrgico - Sala 03', 'PAT-FOCO-S03', 'QR-FOCO-S03', 'operacional', now()),
('e632822a-0000-0000-0000-300000000307', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000006', 'e632822a-0000-0000-0000-000000000030', 'Bombas de Infusão - Sala 03', 'PAT-BOMB-S03', 'QR-BOMB-S03', 'operacional', now()),
('e632822a-0000-0000-0000-300000000308', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000007', 'e632822a-0000-0000-0000-000000000030', 'Gases Medicinais - Sala 03', 'PAT-GAS-S03', 'QR-GAS-S03', 'operacional', now())
ON CONFLICT (id) DO UPDATE SET
  hospital_id = EXCLUDED.hospital_id, categoria_id = EXCLUDED.categoria_id,
  local_id = EXCLUDED.local_id, nome = EXCLUDED.nome, patrimonio = EXCLUDED.patrimonio,
  codigo_qr = EXCLUDED.codigo_qr, status = EXCLUDED.status;

-- ── SALA 04 ─────────────────────────────────────────────────────────

INSERT INTO public.ativos (id, hospital_id, categoria_id, local_id, nome, patrimonio, codigo_qr, status, criado_em) VALUES
('e632822a-0000-0000-0000-300000000401', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-000000000015', 'e632822a-0000-0000-0000-000000000040', 'Carrinho de Anestesia - Sala 04', 'PAT-ANES-S04', 'Car.Anes.S04', 'operacional', now()),
('e632822a-0000-0000-0000-300000000402', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000001', 'e632822a-0000-0000-0000-000000000040', 'Monitor Multiparamétrico - Sala 04', 'PAT-MON-S04', 'QR-MON-S04', 'operacional', now()),
('e632822a-0000-0000-0000-300000000403', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000002', 'e632822a-0000-0000-0000-000000000040', 'Mesa Cirúrgica - Sala 04', 'PAT-MESA-S04', 'QR-MESA-S04', 'operacional', now()),
('e632822a-0000-0000-0000-300000000404', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000003', 'e632822a-0000-0000-0000-000000000040', 'Bisturi Elétrico - Sala 04', 'PAT-BIST-S04', 'QR-BIST-S04', 'operacional', now()),
('e632822a-0000-0000-0000-300000000405', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000004', 'e632822a-0000-0000-0000-000000000040', 'Aspirador Cirúrgico - Sala 04', 'PAT-ASP-S04', 'QR-ASP-S04', 'operacional', now()),
('e632822a-0000-0000-0000-300000000406', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000005', 'e632822a-0000-0000-0000-000000000040', 'Foco Cirúrgico - Sala 04', 'PAT-FOCO-S04', 'QR-FOCO-S04', 'operacional', now()),
('e632822a-0000-0000-0000-300000000407', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000006', 'e632822a-0000-0000-0000-000000000040', 'Bombas de Infusão - Sala 04', 'PAT-BOMB-S04', 'QR-BOMB-S04', 'operacional', now()),
('e632822a-0000-0000-0000-300000000408', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-100000000007', 'e632822a-0000-0000-0000-000000000040', 'Gases Medicinais - Sala 04', 'PAT-GAS-S04', 'QR-GAS-S04', 'operacional', now())
ON CONFLICT (id) DO UPDATE SET
  hospital_id = EXCLUDED.hospital_id, categoria_id = EXCLUDED.categoria_id,
  local_id = EXCLUDED.local_id, nome = EXCLUDED.nome, patrimonio = EXCLUDED.patrimonio,
  codigo_qr = EXCLUDED.codigo_qr, status = EXCLUDED.status;

-- ═══════════════════════════════════════════════════════════════════════
-- 7. POPULAR sala_ativos (27 vínculos: 9 por sala)
--    Carrinho de Parada (e632822a-...-000000000008) é compartilhado=true
-- ═══════════════════════════════════════════════════════════════════════

-- Limpa vínculos anteriores (idempotência)
DELETE FROM public.sala_ativos WHERE local_id IN (
  'e632822a-0000-0000-0000-000000000004',
  'e632822a-0000-0000-0000-000000000030',
  'e632822a-0000-0000-0000-000000000040'
);

-- ── Sala 01 ─────────────────────────────────────────────────────────
INSERT INTO public.sala_ativos (local_id, ativo_id, compartilhado) VALUES
-- Carrinho de Parada (compartilhado)
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-000000000008', true),
-- Carrinho de Anestesia (exclusivo)
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-300000000101', false),
-- Monitor Multiparamétrico
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-300000000102', false),
-- Mesa Cirúrgica
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-300000000103', false),
-- Bisturi Elétrico
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-300000000104', false),
-- Aspirador Cirúrgico
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-300000000105', false),
-- Foco Cirúrgico
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-300000000106', false),
-- Bombas de Infusão
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-300000000107', false),
-- Gases Medicinais
('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-300000000108', false);

-- ── Sala 03 ─────────────────────────────────────────────────────────
INSERT INTO public.sala_ativos (local_id, ativo_id, compartilhado) VALUES
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-000000000008', true),
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-300000000301', false),
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-300000000302', false),
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-300000000303', false),
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-300000000304', false),
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-300000000305', false),
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-300000000306', false),
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-300000000307', false),
('e632822a-0000-0000-0000-000000000030', 'e632822a-0000-0000-0000-300000000308', false);

-- ── Sala 04 ─────────────────────────────────────────────────────────
INSERT INTO public.sala_ativos (local_id, ativo_id, compartilhado) VALUES
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-000000000008', true),
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-300000000401', false),
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-300000000402', false),
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-300000000403', false),
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-300000000404', false),
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-300000000405', false),
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-300000000406', false),
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-300000000407', false),
('e632822a-0000-0000-0000-000000000040', 'e632822a-0000-0000-0000-300000000408', false);

-- ═══════════════════════════════════════════════════════════════════════
-- 8. RLS POLICIES PARA sala_ativos
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.sala_ativos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sala_ativos_select ON public.sala_ativos;
CREATE POLICY sala_ativos_select ON public.sala_ativos
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sala_ativos_all ON public.sala_ativos;
CREATE POLICY sala_ativos_all ON public.sala_ativos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
