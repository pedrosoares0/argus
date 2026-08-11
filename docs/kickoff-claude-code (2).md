# Kickoff — Sentry (nome provisório) — Plataforma de Prontidão Operacional do Centro Cirúrgico

Este documento é a fonte de verdade para iniciar o projeto. Foi consolidado a partir de uma sessão de planejamento técnico entre o CTO (Peu) e o CEO (Paulo), incluindo regras de negócio originais, decisões de arquitetura e checklists reais já usados no ambiente hospitalar. Leia por completo antes de gerar qualquer código — várias decisões aqui resolvem ambiguidades que o documento de regras de negócio original deixava em aberto.

---

## 1. O que é o produto

SaaS web multi-tenant (cada hospital é um tenant) para gestão de prontidão operacional de centro cirúrgico. **O checklist não é o produto** — é o mecanismo de coleta. O produto entrega valor ao calcular, a partir dos checklists e não conformidades, se um ativo, sala ou centro cirúrgico está **pronto para operar com segurança agora**.

Nome provisório: **Sentry** (ainda em definição — não investir identidade visual fixa nesse nome, só usar como placeholder de código/pacote).

---

## 2. Stack técnica (decidida)

| Camada | Escolha |
|---|---|
| Frontend | Next.js (React), mobile-first, acesso via navegador — **não é app nativo** |
| Backend/API | Supabase Edge Functions (TS/Deno) |
| Banco de dados | PostgreSQL via Supabase, multi-tenant via RLS |
| Storage de evidências | Supabase Storage |
| Realtime do dashboard | Supabase Realtime |
| Deploy | Vercel (plano Pro — uso comercial) |
| Resiliência de conexão | IndexedDB (fila local) + Service Worker + retry automático — modelo **online-first**, não offline-first. Sem sincronização com resolução de conflito: cada checklist tem responsável único e execução sequencial, não há edição concorrente a reconciliar. |
| Leitura de QR Code | `getUserMedia` do navegador — sem dependência de app nativo |

### 2.1 Configuração do projeto Supabase (já criado — migration inicial já aplicada)

```
Project URL:      https://ilkqkqzhnlmhoxqavcfp.supabase.co
Publishable key:  sb_publishable_YdJO-z6DceNNxrixpmVShw_erxkPkKa
Connection string: postgresql://postgres:[YOUR-PASSWORD]@db.ilkqkqzhnlmhoxqavcfp.supabase.co:5432/postgres
```

Setup do CLI (rodar na raiz do repo):

```bash
supabase login
supabase init
supabase link --project-ref ilkqkqzhnlmhoxqavcfp
```

A migration `001_initial_schema.sql` já foi aplicada diretamente no SQL Editor do Supabase — ao rodar `supabase link`, sincronizar o histórico de migrations local com o que já existe no banco (`supabase db pull` ou registrar essa migration como já aplicada) antes de gerar qualquer migration nova, para não tentar recriar tabelas que já existem.

**Nunca commitar a connection string com senha preenchida nem a `service_role` key no repositório** — usar variáveis de ambiente (`.env.local`, fora do controle de versão) para qualquer credencial que não seja a publishable key. A publishable key acima é segura para uso no client (é o que a RLS existe para proteger).

---

## 3. Modelo de dados e schema

O schema SQL completo (17 tabelas, RLS por perfil, triggers de imutabilidade e de override crítico) já está pronto na migration anexa: **`001_initial_schema.sql`**. Aplique essa migration como primeiro passo, antes de qualquer scaffold de tela. Pontos que merecem atenção especial ao ler o schema:

- **`execucoes_checklist` é imutável após `status = 'concluida'`**, reforçado por trigger (`trg_bloquear_edicao_finalizada`), não só por RLS — nenhum perfil, incluindo administrador de banco, pode contornar.
- **`locais.status`** é calculado automaticamente (lógica ainda pendente — ver seção 7), mas pode ser sobreposto manualmente pelo Coordenador (`liberada_manualmente`) **apenas quando o status não é `'nao_pronta'` por item crítico**. Isso é validado por trigger (`trg_bloquear_override_critico`) que também exige justificativa em texto e grava em `logs_auditoria`.
- **`modelos_checklist.horarios_do_dia`** (jsonb) permite configurar quantas vezes ao dia e em que horário um checklist diário deve gerar tarefas — isso é dado, não schema, porque a frequência exata de alguns checklists (ex.: carrinho de parada) ainda está sendo validada com a equipe assistencial. Nunca hard-code contagem de vezes/dia em código — sempre ler desse campo.
- **`modelos_checklist.nome_variante`** existe porque uma mesma categoria de ativo pode ter mais de um template (ex.: carrinho de parada tem "Completo" e "Por plantão").
- Nomenclatura do schema é **inteiramente em português**, espelhando o vocabulário das regras de negócio (ex.: `ativos`, `hospitais`, `nao_conformidades`) — mantenha essa convenção em todo o código: variáveis, tipos, nomes de função na aplicação também devem refletir os termos de negócio em português, não traduzir para inglês na camada de aplicação.

### 3.0 Regra inegociável para toda migration futura (configuração do projeto Supabase)

O projeto Supabase está configurado com **"Automatically expose new tables" LIGADO** e **"Enable automatic RLS" DESLIGADO**. Isso significa que não existe rede de segurança automática: uma tabela criada sem RLS nasce com GRANT automático (inclusive para o role `anon`, não autenticado) e **sem** nenhuma policy — ou seja, publicamente acessível via API. Por isso:

- **Toda tabela nova, em toda migration, precisa vir com `alter table X enable row level security;` na mesma migration em que é criada.** Nunca em uma migration separada posterior.
- **Nunca escrever uma policy `using (true)` pensando em "qualquer usuário logado"** — com essa configuração, `true` significa literalmente qualquer requisição com a chave pública, autenticada ou não. Use sempre `using (auth.uid() is not null)` como piso mínimo, e o isolamento por `hospital_id` como regra padrão.
- **Toda tabela nova também precisa de `GRANT` explícito para o role `authenticated`** nas colunas/operações que fizerem sentido — não assumir que o Supabase resolve isso sozinho de forma segura.

### 3.1 Pendências de lógica de negócio (não implementadas na migration, de propósito)

Devem virar Supabase Edge Functions, não trigger de banco puro — são regras que vão mudar mais rápido que o resto do schema:
1. Cálculo automático de prontidão de sala/CC a partir de ativos e NCs abertas (RN-014).
2. Geração automática de `tarefas_checklist` a partir de `frequencia` + `horarios_do_dia` (RN-004).
3. Geração automática de `nao_conformidades` a partir de resposta `'nao_conforme'` (RN-009).

### 3.2 Gap ainda aberto
`registros_manutencao` existe na migration, mas os fluxos de "registrar manutenção" e "finalizar reparos" (RN-021) ainda não têm tela nem Edge Function — construir junto com o perfil Engenharia Clínica.

---

## 4. RBAC por perfil (decidido, mapear 1:1 nas telas)

Regra global: isolamento por `hospital_id` sempre. Nenhum perfil tem DELETE em `execucoes_checklist`, `itens_execucao_checklist` ou `nao_conformidades`.

| Perfil | Pode | Não pode |
|---|---|---|
| **Inspetor** (Enfermeiro/Téc.) | Consultar ativos/locais; executar checklist; anexar evidência; abrir NC (sempre "Aberta"); ver todas as inspeções do local/setor onde atua (não só as próprias) | Alterar modelo de checklist, excluir registros, encerrar NC, alterar indicadores |
| **Engenharia Clínica** | Receber NC de equipamento; alterar status do ativo; registrar manutenção; finalizar reparos; mover NC até `"aguardando_validacao"` | Fechar NC (é exclusivo do Coordenador); excluir histórico; alterar inspeção concluída |
| **Gestor** | Visualizar indicadores, inspeções, NCs, SLA; redistribuir responsável de NC | Fechar NC (não participa dessa etapa — só acompanha depois); alterar inspeção concluída |
| **Administrador** | CRUD completo: hospitais, unidades, CCs, locais, usuários, categorias de ativo, modelos de checklist, configurações | — |
| **Coordenador** | Visão setorial completa em tempo real; atribuir responsáveis; reabrir inspeções **não concluídas**; encaminhar NC para Engenharia Clínica; priorizar pendências; **validar e encerrar NC**; liberar sala manualmente (override, só se não-crítico + justificativa obrigatória) | Alterar modelo, excluir histórico/NC, alterar configurações do sistema. Precisa de central de pendências e central de comando dedicadas no próprio perfil |

---

## 5. Regras de negócio originais (RN-001 a RN-028) — resumo fiel

- **RN-001/002**: hierarquia Hospital → Unidade → Centro Cirúrgico → Local (sala ou área comum). Ativo tem ID único, nome, categoria, patrimônio opcional, QR Code exclusivo, localização, status. Categorias iniciais: Carrinho de parada, Monitor multiparamétrico, Aparelho de anestesia, Bomba de infusão, Torre de vídeo. **Geladeira de medicamentos foi excluída do escopo.**
- **RN-003/004**: cada categoria tem modelo de checklist próprio, versionado; alterar modelo não afeta execuções passadas; frequência gera tarefas automaticamente.
- **RN-005 a RN-008**: execução inicia por QR ou manual, registra responsável/data/respostas/evidências, torna-se imutável ao concluir. Respostas: Conforme / Não Conforme / Não se Aplica. Evidência pode ser obrigatória (foto, observação, lote, validade, assinatura). Criticidade: Crítico / Importante / Informativo.
- **RN-009 a RN-012**: toda resposta "Não Conforme" gera NC automaticamente, vinculada ao item específico. Fluxo: Aberta → Em análise → Em correção → Aguardando validação → Encerrada. NC sempre tem responsável e prazo. Recorrência identificada em período configurável (calculada em view, nunca persistida).
- **RN-013 a RN-015**: status do ativo (Operacional / Operacional com restrições / Indisponível / Em manutenção) atualiza automaticamente pela criticidade das NCs. Prontidão de ativo/sala/CC é calculada considerando pendências, criticidade e NCs abertas. Item crítico não conforme pode indisponibilizar o ativo e rebaixar a sala.
- **RN-016 a RN-018**: nada é apagado; toda alteração gera histórico; log de auditoria completo; dashboard com % de prontidão, ativos indisponíveis, pendências, NCs abertas, recorrência, tempo médio de resolução, evolução histórica.
- **RN-019 a RN-024**: perfis e permissões — ver seção 4.
- **RN-025 a RN-028**: inspeção sempre em contexto operacional (o ambiente carrega os ativos automaticamente ao escanear); todo ativo tem QR individual; inspeção padrão é **por ambiente**, não por equipamento isolado; hierarquia de QR em 4 níveis — Área (visão geral/indicadores), Sala (ronda, ativos, prontidão calculada ao final), Equipamento fixo (histórico, inspeção extraordinária, manutenção), Equipamento móvel (localização, movimentação, histórico independente do ambiente).

**Conceito central, repetir sempre que uma decisão de UX estiver em dúvida**: o checklist é mecanismo de coleta; o produto responde "está pronto pra operar com segurança agora?".

---

## 6. Checklists reais coletados (fonte de verdade para os primeiros templates)

Dois formatos distintos existem hoje, e ambos precisam ser suportados:

### 6.1 "Checklist de Segurança" — lista plana, funcionamento de equipamento
Usado em: Monitor multiparamétrico, Mesa cirúrgica, Carrinho de anestesia (categoria ainda a confirmar com o Paulo — pode ser a mesma que "Aparelho de anestesia" do RN-002, ou distinta).
Formato: cada item é Conforme / Não Conforme / Observações, um por linha, sem agrupamento. Exemplos de itens reais (mesa cirúrgica): "Equipamento limpo", "Estrutura íntegra", "Colchão íntegro", "Trilhos laterais íntegros", "Manutenção preventiva válida", etc.

### 6.2 "Checklist de Materiais" — agrupado por seção, só para Carrinho de Parada
**Decisão de negócio importante**: a verificação é **por seção inteira**, não item a item. O Inspetor não marca Conforme/Não Conforme em cada um dos ~80 materiais individuais (cânulas, seringas, medicamentos, etc.) — ele verifica a seção como um todo (ex.: "Via aérea", "Desfibrilador", "Medicamentos"). Se encontrar um problema, marca a seção como Não Conforme e **documenta por foto qual item específico da seção está faltando/com problema**, em vez de check individual — critério explícito de eficiência: "tempo é dinheiro" em ambiente hospitalar.

Seções do Carrinho de Parada (versão completa): Via aérea, Laringoscópio, Cilindro de oxigênio, Materiais de acesso venoso, Materiais diversos, Desfibrilador, Medicamentos, Soluções, Itens administrativos.

Existem **duas variantes** de checklist para essa categoria:
- **"Completo"** — as 9 seções inteiras.
- **"Por plantão"** — versão reduzida, só 3 seções (Cilindro de oxigênio, Desfibrilador, Itens administrativos).

Frequência exata (quantas vezes ao dia, em que horário) **ainda não está validada** com a equipe assistencial — usar o campo `horarios_do_dia` para não travar isso no código; não assumir um número fixo.

### 6.3 Modelagem recomendada para `itens_modelo_checklist` do Carrinho de Parada
Cada seção vira **um único item verificável** no modelo (não um item por material). Guardar a lista de materiais esperados daquela seção como conteúdo de referência/exibição (ex.: campo JSON com a lista, mostrado ao Inspetor para conferência visual), não como sub-itens clicáveis independentes.

### 6.4 Gaps ainda abertos
Torre de vídeo e Bomba de infusão ainda não têm checklist real enviado — não inventar itens para essas categorias, aguardar documento.

---

## 7. Direção visual — mobile-first, linguagem Apple (iOS/macOS)

**Use a skill `apple-design` já instalada no ambiente para toda a construção de interface.** A referência de estilo é a Human Interface Guidelines da Apple — o objetivo é que o app pareça nativo do ecossistema iOS/macOS, não um SaaS genérico.

Dois esboços foram fornecidos como referência direta de direção visual (anexos a esta sessão) — seguir fielmente os padrões observados neles:

- **Paleta**: fundo em cinza muito claro (quase branco, tom neutro frio), cards em branco puro com sombra suave e generosa, azul vibrante como cor de ação primária (gradiente sutil de azul mais claro para mais escuro em botões preenchidos), com um leve *glow*/halo azul-claro ao redor de botões primários — efeito de profundidade suave, nunca sombra dura.
- **Botões**: formato pílula (`border-radius` total), sem cantos retos em nenhum botão. Botão primário preenchido em azul com glow; botão secundário com fundo branco/quase transparente, borda sutil, ícone colorido à esquerda do texto (padrão visto no botão "Chamar Gestor" com ícone de alerta laranja).
- **Cards**: cantos bem arredondados (raio grande, ~20-24px), fundo branco, elevação sutil, bastante respiro interno (padding generoso) — nunca conteúdo colado na borda.
- **Tipografia**: título em peso bold/semibold, subtítulo em cinza médio mais leve — hierarquia clara de dois níveis, sem poluição visual. Fonte de sistema (San Francisco / equivalente web).
- **Componentes recorrentes observados no esboço**: pill de usuário no canto superior direito (ícone + nome, ex.: "Dr. Paulo"), tag colorida de categoria/setor (ex.: pill roxa "UTI"), barra de busca em formato pílula com ícone de lupa, item de lista com seta (chevron) indicando navegação, ação central de "escanear QR Code" como CTA primário da tela inicial — reforça que o fluxo de entrada do app é a leitura do QR, com busca manual como alternativa secundária, nunca a ação principal.
- **Mobile-first é literal**: desenhar e testar toda tela primeiro em viewport de smartphone; versão desktop/tablet é adaptação depois, não o ponto de partida — o uso real é em campo, no centro cirúrgico, em celular ou tablet.

**Peu (CTO) está cuidando pessoalmente de toda a identidade visual e naming — não gerar logo, nome de marca definitivo ou paleta de marca própria fora do que já está referenciado aqui. Focar em componentização e padrões de interação, não em branding.**

---

## 8. Ordem sugerida de execução

1. Scaffold do projeto Next.js + configuração do Supabase (client, tipos gerados a partir do schema).
2. Aplicar `001_initial_schema.sql` no projeto Supabase.
3. Construir o design system base (tokens de cor, tipografia, componente de botão pílula, card, pill de tag) seguindo a seção 7, usando a skill `apple-design`.
4. Tela de login/seleção de perfil.
5. Fluxo do Inspetor primeiro (é o perfil de maior volume de uso em campo): leitura de QR → carregamento do local → execução de checklist por seção (Carrinho de Parada) e por item (demais categorias) → abertura de NC com evidência por foto.
6. Demais perfis (Coordenador, Engenharia Clínica, Gestor, Administrador) em seguida, na ordem de frequência de uso esperada.
