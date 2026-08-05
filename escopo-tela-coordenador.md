# Escopo — Tela de Validação de NC (perfil Coordenador)

Complementa `kickoff-claude-code.md` e `escopo-tela-engenharia-clinica.md`. Assumindo que este é o ponto de entrada equivalente ao da Eng. Clínica, mas disparado quando `nao_conformidades.status = 'aguardando_validacao'`.

## Objetivo
Onde o Coordenador valida a correção feita pela Engenharia Clínica e encerra a NC (decisão já fechada: só o Coordenador encerra, não o Gestor).

## Entrada
Realtime em `nao_conformidades` filtrado por `hospital_id` + `status = 'aguardando_validacao'`. Notifica todos os `perfil = 'coordenador'` do hospital. Deep link `/nao-conformidades/[id]/validar`.

## Dados exibidos
- NC: `numero_unico`, `criticidade`, `criado_em`, `prazo`
- Item/seção que falhou + foto/observação original do Inspetor (`itens_execucao_checklist`)
- `registros_manutencao` vinculado — descrição do reparo, quem fez, quando finalizou
- `historico_status_nao_conformidade` — timeline completa
- Ativo e local (mesmo breadcrumb da tela de Eng. Clínica)

## Ações permitidas (RN-024)
| Ação | Efeito |
|---|---|
| Validar correção e encerrar | `UPDATE nao_conformidades SET status = 'encerrada'` + `INSERT` em `historico_status_nao_conformidade` |
| Reabrir (correção insuficiente) | `UPDATE nao_conformidades SET status = 'em_correcao'`, volta pra fila da Eng. Clínica + histórico |
| Priorizar | campo de prioridade na NC (ainda não existe no schema — adicionar se este fluxo for confirmado) |

**Nunca nesta tela**: editar `execucoes_checklist`/`itens_execucao_checklist`, excluir qualquer coisa, alterar modelos de checklist.

## Fluxo
```
Aguardando validação ──(correção ok)──> Encerrada
Aguardando validação ──(correção insuficiente)──> Em correção (volta pra Eng. Clínica)
```
Dois botões de ação, nunca mais que isso: "Validar e encerrar" (primário, pílula azul) e "Reabrir correção" (secundário, outline).

## Fora de escopo deste documento
Liberação manual de sala (override) e atribuição/reabertura de inspeção — são outras telas do mesmo perfil, ainda não detalhadas. Avisar quando quiser seguir para elas.

## Critérios de aceite
- [ ] Nenhum caminho da UI permite pular de `aguardando_validacao` direto para outro status que não `encerrada` ou `em_correcao`.
- [ ] `historico_status_nao_conformidade` recebe uma linha em toda transição feita aqui.
- [ ] NC `encerrada` vira somente leitura, sem nenhum botão de ação.
