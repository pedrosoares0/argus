-- =============================================================================
-- Argus — Script de Seed (Cadastro do Hospital Público Itaberaba e Carrinho de Parada)
-- Respeita estritamente o schema definido em 001_initial_schema.sql.
-- =============================================================================

BEGIN;

-- 1. Remove qualquer usuário de teste antigo que possa conflitar em ID ou E-mail
DELETE FROM auth.identities 
WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('inspetor@gmail.com', 'engenharia@gmail.com', 'coordenador@gmail.com'));

DELETE FROM auth.users 
WHERE email IN ('inspetor@gmail.com', 'engenharia@gmail.com', 'coordenador@gmail.com');

DELETE FROM public.usuarios 
WHERE id NOT IN (SELECT id FROM auth.users);

-- 2. Garante os dados estruturais do Hospital Público Itaberaba
INSERT INTO public.hospitais (id, nome, criado_em)
VALUES ('e632822a-0000-0000-0000-000000000001', 'Hospital Público Itaberaba', now())
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO public.unidades (id, hospital_id, nome, criado_em)
VALUES ('e632822a-0000-0000-0000-000000000002', 'e632822a-0000-0000-0000-000000000001', 'Unidade de Internação', now())
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, hospital_id = EXCLUDED.hospital_id;

INSERT INTO public.centros_cirurgicos (id, unidade_id, nome, criado_em)
VALUES ('e632822a-0000-0000-0000-000000000003', 'e632822a-0000-0000-0000-000000000002', 'Centro Cirúrgico Principal', now())
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, unidade_id = EXCLUDED.unidade_id;

INSERT INTO public.locais (id, centro_cirurgico_id, tipo, nome, codigo_qr, status, liberada_manualmente, criado_em)
VALUES ('e632822a-0000-0000-0000-000000000004', 'e632822a-0000-0000-0000-000000000003', 'sala', 'Sala 01', 'QR-SALA-01', 'pronta', false, now())
ON CONFLICT (id) DO UPDATE SET 
  centro_cirurgico_id = EXCLUDED.centro_cirurgico_id,
  tipo = EXCLUDED.tipo,
  nome = EXCLUDED.nome,
  codigo_qr = EXCLUDED.codigo_qr;

-- 3. Cria a Categoria
INSERT INTO public.categorias_ativos (id, nome)
VALUES ('e632822a-0000-0000-0000-000000000005', 'Carrinho de parada')
ON CONFLICT (id) DO NOTHING;

-- 4. Cria os Modelos de Checklist (Completo e Por plantão)
INSERT INTO public.modelos_checklist (id, categoria_id, nome_variante, versao, frequencia, horarios_do_dia, vigente, criado_em)
VALUES ('e632822a-0000-0000-0000-000000000006', 'e632822a-0000-0000-0000-000000000005', 'Completo', 1, 'diaria', '["08:00"]'::jsonb, true, now())
ON CONFLICT (categoria_id, versao) DO UPDATE SET
  nome_variante = EXCLUDED.nome_variante,
  frequencia = EXCLUDED.frequencia,
  horarios_do_dia = EXCLUDED.horarios_do_dia,
  vigente = EXCLUDED.vigente;

INSERT INTO public.modelos_checklist (id, categoria_id, nome_variante, versao, frequencia, horarios_do_dia, vigente, criado_em)
VALUES ('e632822a-0000-0000-0000-000000000007', 'e632822a-0000-0000-0000-000000000005', 'Por plantão', 2, 'diaria', '["07:00", "19:00"]'::jsonb, true, now())
ON CONFLICT (categoria_id, versao) DO UPDATE SET
  nome_variante = EXCLUDED.nome_variante,
  frequencia = EXCLUDED.frequencia,
  horarios_do_dia = EXCLUDED.horarios_do_dia,
  vigente = EXCLUDED.vigente;

-- 5. Cria o Ativo Carrinho de Parada
INSERT INTO public.ativos (id, hospital_id, categoria_id, local_id, nome, patrimonio, codigo_qr, status, criado_em)
VALUES ('e632822a-0000-0000-0000-000000000008', 'e632822a-0000-0000-0000-000000000001', 'e632822a-0000-0000-0000-000000000005', 'e632822a-0000-0000-0000-000000000004', 'Carrinho de Parada - Itaberaba #1', 'PAT-CARRINHO-01', 'Car.Par1', 'operacional', now())
ON CONFLICT (id) DO UPDATE SET
  hospital_id = EXCLUDED.hospital_id,
  categoria_id = EXCLUDED.categoria_id,
  local_id = EXCLUDED.local_id,
  nome = EXCLUDED.nome,
  patrimonio = EXCLUDED.patrimonio,
  codigo_qr = EXCLUDED.codigo_qr,
  status = EXCLUDED.status;

-- Limpa itens antigos do checklist
DELETE FROM public.itens_modelo_checklist WHERE modelo_id IN ('e632822a-0000-0000-0000-000000000006', 'e632822a-0000-0000-0000-000000000007');

-- 6. Cadastra os Itens do Modelo "Completo" (v1)
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-000000000006', 1, 'Via aérea — itens_esperados: Cânulas orofaríngeas (Guedel) nº 0-5; Máscaras faciais P/M/G; Bolsa-válvula-máscara adulto; Bolsa-válvula-máscara pediátrica; Reservatório de O₂; Tubos orotraqueais 6,0-8,5; Guia (mandril); Seringa 20mL; Lubrificante hidrossolúvel; Fita de fixação; Pinça de Magill; Máscara de O₂; Cateter nasal', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000006', 2, 'Laringoscópio — itens_esperados: Cabo; Lâmina reta nº 0 e 1; Lâminas curvas nº 2, 3 e 4; Pilhas/bateria reserva', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000006', 3, 'Cilindro de oxigênio cheio — itens_esperados: Fluxômetro; Umidificador; Extensão de O₂', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000006', 4, 'Materiais de acesso venoso — itens_esperados: Jelcos 18G/20G/22G; Torneador; Garrote; Equipo macro/micro/bomba; Extensor; Conectores; Tampas estéreis; Seringas 3/5/10/20mL; Agulhas diversas; Álcool 70%; Clorexidina alcoólica; Gaze estéril; Esparadrapo; Curativo transparente', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000006', 5, 'Materiais diversos — itens_esperados: Tesoura; Pinça anatômica; Pinça Kelly; Lâmina de bisturi; Cabo de bisturi; Compressas estéreis; Luvas estéreis; Luvas de procedimento; Máscaras cirúrgicas; Avental descartável', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000006', 6, 'Desfibrilador — itens_esperados: Equipamento funcionando; Cabo de alimentação; Bateria carregada; Pás adulto; Pás pediátricas; Cabos íntegros; Eletrodos adesivos; Gel condutor; Papel da impressora', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000006', 7, 'Medicamentos — itens_esperados: Adrenalina; Amiodarona; Atropina; Adenosina; Sulfato de Magnésio; Bicarbonato de Sódio; Cloreto/Gluconato de Cálcio; Glicose 50%; Furosemida; Dobutamina; Dopamina; Noradrenalina; Nitroglicerina; Hidrocortisona; Diazepam/Midazolam; Fenitoína/Levetiracetam; Naloxona; Flumazenil', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000006', 8, 'Soluções — itens_esperados: Soro Fisiológico 0,9%; Ringer Lactato; Glicose 5%', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000006', 9, 'Itens administrativos — itens_esperados: Lacre do carrinho íntegro; Lista de conferência atualizada; Etiqueta de validade dos medicamentos; Caneta para registros', 'importante', true, true, 'foto');

-- 7. Cadastra os Itens do Modelo "Por plantão" (v2)
INSERT INTO public.itens_modelo_checklist (modelo_id, ordem, descricao, criticidade, obrigatorio, evidencia_obrigatoria, tipo_evidencia) VALUES
('e632822a-0000-0000-0000-000000000007', 1, 'Via aérea — itens_esperados: Cânulas orofaríngeas (Guedel) nº 0-5; Máscaras faciais P/M/G; Bolsa-válvula-máscara adulto; Bolsa-válvula-máscara pediátrica; Reservatório de O₂; Tubos orotraqueais 6,0-8,5; Guia (mandril); Seringa 20mL; Lubrificante hidrossolúvel; Fita de fixação; Pinça de Magill; Máscara de O₂; Cateter nasal', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000007', 2, 'Desfibrilador — itens_esperados: Equipamento funcionando; Cabo de alimentação; Bateria carregada; Pás adulto; Pás pediátricas; Cabos íntegros; Eletrodos adesivos; Gel condutor; Papel da impressora', 'importante', true, true, 'foto'),
('e632822a-0000-0000-0000-000000000007', 3, 'Itens administrativos — itens_esperados: Lacre do carrinho íntegro; Lista de conferência atualizada; Caneta para registros', 'importante', true, true, 'foto');

COMMIT;

-- =============================================================================
-- TRIGGER DE AUTOCREATE PARA PERFIS (Executar fora da transação de dados)
-- =============================================================================

-- Cria a função de sincronização do perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, hospital_id, nome, email, perfil, numero_conselho)
  VALUES (
    new.id,
    coalesce((new.raw_user_meta_data->>'hospital_id')::uuid, 'e632822a-0000-0000-0000-000000000001'),
    coalesce(new.raw_user_meta_data->>'nome', case 
      when new.email = 'inspetor@gmail.com' then 'Enf. Pedro Soares'
      when new.email = 'engenharia@gmail.com' then 'Eng. Carlos Eduardo'
      when new.email = 'coordenador@gmail.com' then 'Coord. Paulo Morais'
      else split_part(new.email, '@', 1)
    end),
    new.email,
    coalesce(new.raw_user_meta_data->>'perfil', case 
      when new.email = 'inspetor@gmail.com' then 'inspetor'
      when new.email = 'engenharia@gmail.com' then 'engenharia_clinica'
      when new.email = 'coordenador@gmail.com' then 'coordenador'
      else 'inspetor'
    end),
    new.raw_user_meta_data->>'numero_conselho'
  )
  ON CONFLICT (id) DO UPDATE SET
    hospital_id = EXCLUDED.hospital_id,
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    perfil = EXCLUDED.perfil,
    numero_conselho = EXCLUDED.numero_conselho;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria o trigger na tabela do auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- POLÍTICAS DE RLS PARA LEITURA DE TABELAS (Permitir consulta por autenticados)
-- =============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
CREATE POLICY usuarios_select ON public.usuarios FOR SELECT TO authenticated USING (true);

ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS locais_select ON public.locais;
CREATE POLICY locais_select ON public.locais FOR SELECT TO authenticated USING (true);

ALTER TABLE public.centros_cirurgicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS centros_cirurgicos_select ON public.centros_cirurgicos;
CREATE POLICY centros_cirurgicos_select ON public.centros_cirurgicos FOR SELECT TO authenticated USING (true);

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS unidades_select ON public.unidades;
CREATE POLICY unidades_select ON public.unidades FOR SELECT TO authenticated USING (true);

ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ativos_select ON public.ativos;
CREATE POLICY ativos_select ON public.ativos FOR SELECT TO authenticated USING (true);

ALTER TABLE public.categorias_ativos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categorias_ativos_select ON public.categorias_ativos;
CREATE POLICY categorias_ativos_select ON public.categorias_ativos FOR SELECT TO authenticated USING (true);

ALTER TABLE public.modelos_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS modelos_checklist_select ON public.modelos_checklist;
CREATE POLICY modelos_checklist_select ON public.modelos_checklist FOR SELECT TO authenticated USING (true);

ALTER TABLE public.itens_modelo_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS itens_modelo_checklist_select ON public.itens_modelo_checklist;
CREATE POLICY itens_modelo_checklist_select ON public.itens_modelo_checklist FOR SELECT TO authenticated USING (true);

-- Politicas adicionais para possibilitar atualizacao e insercao no fluxo de NCs e checklist
ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ativos_update ON public.ativos;
CREATE POLICY ativos_update ON public.ativos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS locais_update ON public.locais;
CREATE POLICY locais_update ON public.locais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nao_conformidades_all ON public.nao_conformidades;
CREATE POLICY nao_conformidades_all ON public.nao_conformidades FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.registros_manutencao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS registros_manutencao_all ON public.registros_manutencao;
CREATE POLICY registros_manutencao_all ON public.registros_manutencao FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.historico_status_nao_conformidade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS historico_status_all ON public.historico_status_nao_conformidade;
CREATE POLICY historico_status_all ON public.historico_status_nao_conformidade FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Politicas para permitir que usuarios gravem e atualizem seu proprio perfil
DROP POLICY IF EXISTS usuarios_insert ON public.usuarios;
CREATE POLICY usuarios_insert ON public.usuarios FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
CREATE POLICY usuarios_update ON public.usuarios FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Politicas para permitir o registro de execucoes de checklist
ALTER TABLE public.execucoes_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS execucoes_checklist_all ON public.execucoes_checklist;
CREATE POLICY execucoes_checklist_all ON public.execucoes_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Politicas para permitir o registro dos itens da execucao do checklist
ALTER TABLE public.itens_execucao_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS itens_execucao_checklist_all ON public.itens_execucao_checklist;
CREATE POLICY itens_execucao_checklist_all ON public.itens_execucao_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);


