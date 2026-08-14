-- =============================================================================
-- Argus — Script de Cadastro: Carrinho de Anestesia
-- Executar no SQL Editor do Supabase para adicionar a categoria,
-- modelo de checklist, os 14 itens e o ativo Carrinho de Anestesia.
-- =============================================================================

BEGIN;

-- 1. Garante o Local (Sala 02) no Centro Cirúrgico Principal
INSERT INTO public.locais (id, centro_cirurgico_id, tipo, nome, codigo_qr, status, liberada_manualmente, criado_em)
VALUES (
  'e632822a-0000-0000-0000-000000000014',
  'e632822a-0000-0000-0000-000000000003',
  'sala',
  'Sala 02',
  'QR-SALA-02',
  'pronta',
  false,
  now()
)
ON CONFLICT (id) DO UPDATE SET 
  centro_cirurgico_id = EXCLUDED.centro_cirurgico_id,
  tipo = EXCLUDED.tipo,
  nome = EXCLUDED.nome,
  codigo_qr = EXCLUDED.codigo_qr;

-- 2. Cria a Categoria Carrinho de anestesia
INSERT INTO public.categorias_ativos (id, nome)
VALUES ('e632822a-0000-0000-0000-000000000015', 'Carrinho de anestesia')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

-- 3. Cria o Modelo de Checklist (Padrão / Diário)
INSERT INTO public.modelos_checklist (id, categoria_id, nome_variante, versao, frequencia, horarios_do_dia, vigente, criado_em)
VALUES (
  'e632822a-0000-0000-0000-000000000016',
  'e632822a-0000-0000-0000-000000000015',
  'Padrão',
  1,
  'diaria',
  '["07:00", "19:00"]'::jsonb,
  true,
  now()
)
ON CONFLICT (categoria_id, versao) DO UPDATE SET
  nome_variante = EXCLUDED.nome_variante,
  frequencia = EXCLUDED.frequencia,
  horarios_do_dia = EXCLUDED.horarios_do_dia,
  vigente = EXCLUDED.vigente;

-- 4. Cria o Ativo Carrinho de Anestesia
INSERT INTO public.ativos (id, hospital_id, categoria_id, local_id, nome, patrimonio, codigo_qr, status, criado_em)
VALUES (
  'e632822a-0000-0000-0000-000000000018',
  'e632822a-0000-0000-0000-000000000001',
  'e632822a-0000-0000-0000-000000000015',
  'e632822a-0000-0000-0000-000000000014',
  'Carrinho de Anestesia',
  'PAT-ANES-01',
  'Car.Anes1',
  'operacional',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  hospital_id = EXCLUDED.hospital_id,
  categoria_id = EXCLUDED.categoria_id,
  local_id = EXCLUDED.local_id,
  nome = EXCLUDED.nome,
  patrimonio = EXCLUDED.patrimonio,
  codigo_qr = EXCLUDED.codigo_qr,
  status = EXCLUDED.status;

-- 5. Limpa itens antigos do checklist do modelo antes de reinserir
DELETE FROM public.itens_modelo_checklist WHERE modelo_id = 'e632822a-0000-0000-0000-000000000016';

-- 6. Cadastra os Itens do Checklist do Carrinho de Anestesia (divididos por áreas lógicas)
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-000000000016', 1, 'Estrutura, energia e autoteste — itens_esperados: Equipamento limpo e identificado; Cabo de alimentação íntegro; Equipamento liga normalmente; Bateria funcionando; Autoteste realizado sem falhas; Manutenção preventiva válida', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000016', 2, 'Alarmes e sistema de gases — itens_esperados: Alarmes sonoros e visuais funcionando; Fluxômetros funcionando; Cilindro de O₂ com pressão adequada', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000016', 3, 'Vaporizadores — itens_esperados: Vaporizadores fixados e abastecidos', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000016', 4, 'Sistema respiratório e insumos — itens_esperados: Sistema respiratório sem vazamentos; Bolsa reservatório íntegra; Traqueias e filtros disponíveis; Cal sodada íntegra', 'importante', true, true, 'foto');

COMMIT;
