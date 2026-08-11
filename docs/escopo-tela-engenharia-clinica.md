# Escopo — Tela de Atendimento de Não Conformidade (perfil Engenharia Clínica)

Este documento complementa o `kickoff-claude-code.md` e a migration `001_initial_schema.sql` — não repete o que já está lá (stack, schema completo, direção visual geral), só aprofunda **esta tela específica**. Ler os dois primeiro.

---

## 1. Objetivo da tela

É a tela que a **Engenharia Clínica** abre para atender uma não conformidade (NC) de ativo — o ponto de trabalho principal desse perfil (RN-021). Ela cobre a fatia do fluxo de NC entre a abertura pelo Inspetor e a validação/encerramento pelo Coordenador: **receber, diagnosticar, corrigir, avançar até "aguardando validação"**.

## 2. Ponto de entrada

A tela é acionada quando uma NC é aberta e cai sob responsabilidade da Engenharia Clínica — via **Supabase Realtime**, escutando `INSERT`/`UPDATE` em `nao_conformidades` filtrado por `hospital_id` e, quando `responsavel_id` já estiver setado, por esse usuário; quando ainda não tiver responsável, a notificação vai para todos os usuários com `perfil = 'engenharia_clinica'` do hospital. Deep link direto: `/nao-conformidades/[id]`, também acessível por uma lista/fila (ver seção 6).

> **Pergunta em aberto, não decidida ainda**: RN-021 fala em "receber NC de equipamentos" — não está claro se isso é *toda* NC (incluindo as de seção do Carrinho de Parada, que são "materiais", não "equipamento com defeito") ou só as de categorias como Monitor, Mesa cirúrgica, Aparelho de anestesia. Para o MVP, assumir que a Engenharia Clínica recebe **todas** as NCs (sem distinção de categoria) — é a opção mais simples e não bloqueia o desenvolvimento. Validar com o Paulo antes de refinar isso depois.

## 3. Dados que a tela precisa carregar

De `nao_conformidades` (a NC em si): `numero_unico`, `criticidade`, `status`, `prazo`, `criado_em`.

De `itens_execucao_checklist` (via `item_execucao_id`): `resposta`, `evidencia_url` (a foto), `evidencia_texto` (a observação do Inspetor descrevendo o item específico problemático), `item_congelado` (nome da seção/item no momento da execução — importante para o Carrinho de Parada, onde o item é uma seção inteira, não um material único).

De `ativos` (via `ativo_id`): `nome`, `categoria` (join com `categorias_ativos`), `status` atual, `codigo_qr`.

De `locais` (via o local do ativo): breadcrumb completo — Hospital → Unidade → Centro Cirúrgico → Local, para a Engenharia Clínica saber fisicamente onde ir.

De `historico_status_nao_conformidade`: linha do tempo de todas as transições já feitas nessa NC.

De `registros_manutencao` (via `nao_conformidade_id`): se já existe um registro de manutenção em andamento para essa NC.

De `usuarios`: nome de quem abriu a NC (o Inspetor responsável pela execução) e nome de quem está atualmente responsável.

## 4. Ações permitidas nesta tela (RBAC — RN-021, reforçar exatamente isso, nada além)

| Ação | Efeito no schema |
|---|---|
| Assumir a NC | `UPDATE nao_conformidades SET responsavel_id = auth.uid()` (se ainda sem responsável) |
| Alterar status do ativo | `UPDATE ativos SET status = ...` — ex.: marcar como `em_manutencao` ao iniciar o reparo |
| Registrar manutenção | `INSERT INTO registros_manutencao` vinculado ao `ativo_id` e `nao_conformidade_id`, com descrição livre |
| Avançar status da NC | `UPDATE nao_conformidades SET status = ...` **apenas** dentro da sequência `em_analise → em_correcao → aguardando_validacao`. Nunca pular etapa, nunca voltar, nunca chegar em `encerrada` |
| Finalizar reparo | `UPDATE registros_manutencao SET status = 'finalizada', finalizada_em = now()` |
| Toda transição de status registra em `historico_status_nao_conformidade` | Isso ainda não tem trigger automático no schema atual — a tela precisa fazer o `INSERT` nessa tabela manualmente, na mesma transação do `UPDATE` de status, até existir uma Edge Function/trigger dedicada |

**O que esta tela NUNCA mostra nem permite, mesmo desabilitado/cinza — simplesmente não existe na UI**:
- Botão de encerrar/fechar NC (`status = 'encerrada'`) — isso é exclusivo do Coordenador, em outra tela.
- Qualquer edição em `execucoes_checklist` ou `itens_execucao_checklist` — são imutáveis, e nem aparecem como editáveis aqui, só como leitura (a foto e a observação do Inspetor são contexto, não campos de formulário).
- Botão de excluir qualquer coisa — não existe em nenhum lugar desse perfil.

## 5. Fluxo de estado da NC nesta tela

```
Aberta ──(Engenharia assume)──> Em análise ──(diagnóstico feito)──> Em correção ──(reparo registrado)──> Aguardando validação ──(sai da tela da Eng. Clínica, vai para o Coordenador)
```

A tela sempre mostra **um único botão de ação primária**, que muda de rótulo conforme o status atual da NC — não mostrar os quatro botões de uma vez:
- `status = 'aberta'` → botão "Iniciar análise" (vai para `em_analise`)
- `status = 'em_analise'` → botão "Registrar correção" (abre o formulário de `registros_manutencao`, depois vai para `em_correcao`)
- `status = 'em_correcao'` → botão "Finalizar reparo" (fecha o `registros_manutencao`, depois vai para `aguardando_validacao`)
- `status = 'aguardando_validacao'` → sem botão de ação; mostrar estado somente leitura com texto "Aguardando validação do Coordenador"

## 6. Fila de NCs (tela-lista antes da tela de detalhe)

Antes de detalhar uma NC específica, a Engenharia Clínica precisa de uma lista com todas as NCs sob sua responsabilidade (ou sem responsável ainda) — ordenada por criticidade (`critico` primeiro) e depois por `prazo` mais próximo. Cada item da lista é um card compacto: nome do ativo, local, badge de criticidade, badge de status, tempo desde a abertura.

## 7. Layout — mobile-first, linguagem Apple (seguir a seção 7 do `kickoff-claude-code.md`)

- **Header da tela**: pill com o número da NC + badge de criticidade colorido (crítico = vermelho, importante = laranja, informativo = cinza) no canto, seguindo o mesmo padrão de pill/tag visto no esboço original (ex.: a tag "UTI").
- **Card 1 — Ativo**: nome do ativo, categoria, breadcrumb do local, ícone/thumbnail se houver.
- **Card 2 — A não conformidade**: seção/item que falhou, foto em destaque (tap para tela cheia), texto de observação do Inspetor, quem abriu e quando.
- **Card 3 — Linha do tempo**: histórico de status em formato de timeline vertical, cada entrada com avatar/nome de quem mudou e timestamp.
- **Card 4 — Registro de manutenção** (aparece só a partir de `em_correcao`): descrição do reparo feito.
- **Botão de ação primária**: fixo na parte inferior da tela (padrão iOS de CTA ancorado), pílula azul com glow, mesmo estilo do botão "Finalizar Auditoria" do esboço.
- **Botão secundário** (ex.: "Chamar Coordenador" para escalar um caso urgente): mesmo padrão do botão outline com ícone visto no esboço ("Chamar Gestor"), reaproveitado aqui para escalar, não para gestor especificamente.

## 8. Estados vazios e de erro

- Fila vazia: ilustração leve + texto "Nenhuma não conformidade pendente" — não é um estado de erro, é um estado positivo, tratar visualmente como tal (não usar tom de alerta).
- NC já assumida por outro usuário da Engenharia Clínica: mostrar quem está com ela, sem bloquear a visualização (RN-020/RN-021 dão visão ampla de setor), mas esconder os botões de ação se `responsavel_id` for de outra pessoa.
- Falha ao tentar avançar status fora de ordem (proteção de UI, redundante com a regra que deveria existir no backend): mensagem clara, não um erro técnico genérico.

## 9. Critérios de aceite

- [ ] Não é possível, por nenhum caminho da UI, mover a NC para `encerrada` a partir desta tela.
- [ ] Não é possível editar qualquer campo de `execucoes_checklist` ou `itens_execucao_checklist` a partir desta tela.
- [ ] Toda mudança de status gera uma linha em `historico_status_nao_conformidade` na mesma operação.
- [ ] A tela funciona com a resiliência de conexão já definida no projeto (fila local + retry) — registrar manutenção ou avançar status não pode travar o app se a conexão cair no meio da ação.
- [ ] Criticidade `critico` tem destaque visual inequívoco na fila e no header do detalhe (cor, não só texto).
