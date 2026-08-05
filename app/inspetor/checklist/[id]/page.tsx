'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { PillTag } from '@/components/ui/PillTag'
import { Botao } from '@/components/ui/Botao'
import type { RespostaItem, CriticidadeItem } from '@/lib/supabase/types'

/**
 * Execução de Checklist — suporta dois modos:
 * 1. Lista plana (Monitor, Mesa, Anestesia): cada item é Conforme/Não Conforme/NA
 * 2. Agrupado por seção (Carrinho de Parada): verificação por seção inteira
 *
 * RN-005 a RN-008: respostas, evidências, criticidade.
 * RN-009: toda resposta "Não Conforme" gera NC automaticamente.
 */

// ---- Tipos locais ----
interface ItemChecklist {
  id: string
  descricao: string
  criticidade: CriticidadeItem
  evidenciaObrigatoria: boolean
  secao: string | null
  materiaisReferencia: string[] | null
}

interface RespostaChecklist {
  resposta: RespostaItem | null
  observacao: string
  evidenciaUrl: string | null
}

export default function PaginaChecklist() {
  const router = useRouter()

  // Determinar tipo de checklist (mock — futuramente do modelo via Supabase)
  const modelo = {
    nome: 'Carrinho de Parada',
    variante: 'Completo' as string | null,
    tipo: 'agrupado' as 'plano' | 'agrupado', // Carrinho de Parada = agrupado
  }

  // Itens mock — Carrinho de Parada (agrupado por seção)
  const itensAgrupados: ItemChecklist[] = [
    {
      id: 's1', descricao: 'Via aérea', criticidade: 'critico', evidenciaObrigatoria: false, secao: 'Via aérea',
      materiaisReferencia: ['Cânula orofaríngea (Guedel) nº 3, 4 e 5', 'Máscara laríngea nº 3 e 4', 'Tubo endotraqueal 6.5 a 8.0', 'Fio guia', 'Seringa 20ml p/ cuff', 'Cânula nasal tipo óculos'],
    },
    {
      id: 's2', descricao: 'Laringoscópio', criticidade: 'critico', evidenciaObrigatoria: false, secao: 'Laringoscópio',
      materiaisReferencia: ['Cabo adulto', 'Lâminas curvas nº 3 e 4', 'Lâmina reta nº 4', 'Pilhas reserva'],
    },
    {
      id: 's3', descricao: 'Cilindro de oxigênio', criticidade: 'critico', evidenciaObrigatoria: false, secao: 'Cilindro de oxigênio',
      materiaisReferencia: ['Cilindro cheio (manômetro > 150 kgf/cm²)', 'Válvula reguladora funcionante', 'Máscara de O₂ com reservatório', 'Extensão de O₂'],
    },
    {
      id: 's4', descricao: 'Materiais de acesso venoso', criticidade: 'importante', evidenciaObrigatoria: false, secao: 'Acesso venoso',
      materiaisReferencia: ['Jelco 14G, 16G, 18G, 20G', 'Scalp 21G, 23G', 'Equipo macrogotas', 'Equipo microgotas', 'Torneirinha 3 vias', 'Seringa 10ml, 20ml'],
    },
    {
      id: 's5', descricao: 'Materiais diversos', criticidade: 'importante', evidenciaObrigatoria: false, secao: 'Materiais diversos',
      materiaisReferencia: ['Luvas estéreis 7.0 e 7.5', 'Gaze estéril', 'Esparadrapo', 'Clorexidina alcoólica', 'Sonda aspiração nº 12 e 14', 'Eletrodos de ECG'],
    },
    {
      id: 's6', descricao: 'Desfibrilador', criticidade: 'critico', evidenciaObrigatoria: false, secao: 'Desfibrilador',
      materiaisReferencia: ['Equipamento ligado e carregado', 'Pás adulto e pediátrico', 'Gel condutor', 'Teste de carga realizado'],
    },
    {
      id: 's7', descricao: 'Medicamentos', criticidade: 'critico', evidenciaObrigatoria: false, secao: 'Medicamentos',
      materiaisReferencia: ['Adrenalina 1mg/ml (5 ampolas)', 'Atropina 0.25mg/ml (5 ampolas)', 'Amiodarona 50mg/ml (3 ampolas)', 'Lidocaína 2% s/v (2 frascos)', 'Midazolam 5mg/ml', 'Fentanil 50mcg/ml'],
    },
    {
      id: 's8', descricao: 'Soluções', criticidade: 'importante', evidenciaObrigatoria: false, secao: 'Soluções',
      materiaisReferencia: ['SF 0,9% 500ml (2 frascos)', 'SF 0,9% 250ml (2 frascos)', 'Ringer Lactato 500ml (1 frasco)', 'SG 5% 500ml (1 frasco)'],
    },
    {
      id: 's9', descricao: 'Itens administrativos', criticidade: 'informativo', evidenciaObrigatoria: false, secao: 'Itens administrativos',
      materiaisReferencia: ['Checklist de parada preenchido', 'Protocolo ACLS disponível', 'Folha de registro de PCR', 'Lacre de segurança íntegro'],
    },
  ]

  // Itens mock — lista plana (ex: Monitor multiparamétrico)
  const itensPlanos: ItemChecklist[] = [
    { id: 'p1', descricao: 'Equipamento limpo', criticidade: 'importante', evidenciaObrigatoria: false, secao: null, materiaisReferencia: null },
    { id: 'p2', descricao: 'Estrutura íntegra', criticidade: 'critico', evidenciaObrigatoria: false, secao: null, materiaisReferencia: null },
    { id: 'p3', descricao: 'Cabos e conexões íntegros', criticidade: 'critico', evidenciaObrigatoria: false, secao: null, materiaisReferencia: null },
    { id: 'p4', descricao: 'Tela funcionando corretamente', criticidade: 'critico', evidenciaObrigatoria: false, secao: null, materiaisReferencia: null },
    { id: 'p5', descricao: 'Alarmes configurados', criticidade: 'critico', evidenciaObrigatoria: false, secao: null, materiaisReferencia: null },
    { id: 'p6', descricao: 'Sensor de SpO₂ disponível', criticidade: 'importante', evidenciaObrigatoria: false, secao: null, materiaisReferencia: null },
    { id: 'p7', descricao: 'Manguito de PNI disponível', criticidade: 'importante', evidenciaObrigatoria: false, secao: null, materiaisReferencia: null },
    { id: 'p8', descricao: 'Manutenção preventiva válida', criticidade: 'critico', evidenciaObrigatoria: true, secao: null, materiaisReferencia: null },
  ]

  const itens = modelo.tipo === 'agrupado' ? itensAgrupados : itensPlanos

  // Estado das respostas
  const [respostas, setRespostas] = useState<Record<string, RespostaChecklist>>(
    () =>
      Object.fromEntries(
        itens.map((item) => [
          item.id,
          { resposta: null, observacao: '', evidenciaUrl: null },
        ])
      )
  )
  const [secaoExpandida, setSecaoExpandida] = useState<string | null>(itens[0]?.id ?? null)
  const [enviando, setEnviando] = useState(false)

  const totalRespondidos = Object.values(respostas).filter((r) => r.resposta !== null).length
  const progresso = Math.round((totalRespondidos / itens.length) * 100)
  const todosRespondidos = totalRespondidos === itens.length

  function setResposta(id: string, resposta: RespostaItem) {
    setRespostas((prev) => ({
      ...prev,
      [id]: { ...prev[id], resposta },
    }))
  }

  const criticidadeConfig: Record<CriticidadeItem, { label: string; cor: 'vermelho' | 'laranja' | 'cinza' }> = {
    critico: { label: 'Crítico', cor: 'vermelho' },
    importante: { label: 'Importante', cor: 'laranja' },
    informativo: { label: 'Informativo', cor: 'cinza' },
  }

  async function handleConcluir() {
    setEnviando(true)
    // Futuramente: salvar no Supabase via Edge Function
    // Para itens "nao_conforme", a Edge Function gerará NC automaticamente (RN-009)
    await new Promise((r) => setTimeout(r, 1500))
    router.push('/inspetor')
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-4">
      {/* Botão voltar */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-primaria text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Voltar
      </button>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-texto">{modelo.nome}</h2>
        {modelo.variante && (
          <p className="text-sm text-texto-secundario mt-0.5">
            Variante: {modelo.variante}
          </p>
        )}
      </div>

      {/* Barra de progresso */}
      <Card className="!p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-texto-secundario">Progresso</span>
          <span className="text-sm font-bold text-texto">
            {totalRespondidos}/{itens.length}
          </span>
        </div>
        <div className="w-full h-2 bg-fundo rounded-pill overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primaria-clara to-primaria rounded-pill transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </Card>

      {/* Itens do checklist */}
      <div className="space-y-3">
        {itens.map((item) => {
          const resposta = respostas[item.id]
          const critCfg = criticidadeConfig[item.criticidade]
          const isAgrupado = modelo.tipo === 'agrupado'
          const isExpandido = secaoExpandida === item.id

          return (
            <Card key={item.id} className="!p-0 overflow-hidden">
              {/* Header do item / seção */}
              <button
                className={[
                  'flex items-center gap-3 w-full px-4 py-3.5 text-left',
                  isAgrupado ? 'hover:bg-texto/[0.02]' : '',
                ].join(' ')}
                onClick={isAgrupado ? () => setSecaoExpandida(isExpandido ? null : item.id) : undefined}
                type="button"
              >
                {/* Indicador de resposta */}
                <div
                  className={[
                    'w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold',
                    resposta.resposta === 'conforme'
                      ? 'bg-sucesso text-white'
                      : resposta.resposta === 'nao_conforme'
                        ? 'bg-perigo text-white'
                        : resposta.resposta === 'nao_se_aplica'
                          ? 'bg-texto-terciario text-white'
                          : 'bg-fundo border-2 border-separador',
                  ].join(' ')}
                >
                  {resposta.resposta === 'conforme' && '✓'}
                  {resposta.resposta === 'nao_conforme' && '✗'}
                  {resposta.resposta === 'nao_se_aplica' && '—'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-texto">{item.descricao}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <PillTag cor={critCfg.cor}>{critCfg.label}</PillTag>
                    {item.evidenciaObrigatoria && (
                      <PillTag cor="azul">Evidência obrigatória</PillTag>
                    )}
                  </div>
                </div>

                {isAgrupado && (
                  <svg
                    className={[
                      'shrink-0 h-4 w-4 text-texto-terciario transition-transform duration-200',
                      isExpandido ? 'rotate-90' : '',
                    ].join(' ')}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </button>

              {/* Conteúdo expandido (sempre visível em modo plano) */}
              {(isExpandido || !isAgrupado) && (
                <div className="px-4 pb-4 border-t border-separador">
                  {/* Lista de materiais de referência (só para agrupado) */}
                  {isAgrupado && item.materiaisReferencia && (
                    <div className="mt-3 mb-4 p-3 bg-fundo rounded-sm">
                      <p className="text-xs font-semibold text-texto-secundario uppercase tracking-wider mb-2">
                        Materiais esperados
                      </p>
                      <ul className="space-y-1">
                        {item.materiaisReferencia.map((material, i) => (
                          <li key={i} className="text-sm text-texto-secundario flex items-start gap-2">
                            <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-texto-terciario" />
                            {material}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Botões de resposta */}
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      className={[
                        'flex-1 py-2.5 rounded-pill text-sm font-semibold transition-all duration-200',
                        resposta.resposta === 'conforme'
                          ? 'bg-sucesso text-white shadow-sm'
                          : 'bg-sucesso/10 text-sucesso hover:bg-sucesso/20',
                      ].join(' ')}
                      onClick={() => setResposta(item.id, 'conforme')}
                    >
                      ✓ Conforme
                    </button>
                    <button
                      type="button"
                      className={[
                        'flex-1 py-2.5 rounded-pill text-sm font-semibold transition-all duration-200',
                        resposta.resposta === 'nao_conforme'
                          ? 'bg-perigo text-white shadow-sm'
                          : 'bg-perigo/10 text-perigo hover:bg-perigo/20',
                      ].join(' ')}
                      onClick={() => setResposta(item.id, 'nao_conforme')}
                    >
                      ✗ Não Conforme
                    </button>
                    <button
                      type="button"
                      className={[
                        'flex-1 py-2.5 rounded-pill text-sm font-semibold transition-all duration-200',
                        resposta.resposta === 'nao_se_aplica'
                          ? 'bg-texto-terciario text-white shadow-sm'
                          : 'bg-texto-terciario/10 text-texto-terciario hover:bg-texto-terciario/20',
                      ].join(' ')}
                      onClick={() => setResposta(item.id, 'nao_se_aplica')}
                    >
                      N/A
                    </button>
                  </div>

                  {/* Se marcou Não Conforme — link para abrir NC com foto */}
                  {resposta.resposta === 'nao_conforme' && (
                    <div className="mt-3 animate-[fadeIn_0.2s_ease-out_both]">
                      <Botao
                        variante="secundario"
                        tamanho="sm"
                        larguraTotal
                        onClick={() => router.push(`/inspetor/nc/nova?item=${item.id}`)}
                        icone={
                          <svg className="w-4 h-4 text-perigo" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                          </svg>
                        }
                      >
                        Documentar com foto
                      </Botao>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Botão concluir */}
      <div className="pt-4">
        <Botao
          variante="primario"
          tamanho="lg"
          larguraTotal
          carregando={enviando}
          disabled={!todosRespondidos}
          onClick={handleConcluir}
          icone={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          {todosRespondidos ? 'Concluir inspeção' : `Responda todos os itens (${totalRespondidos}/${itens.length})`}
        </Botao>
      </div>
    </div>
  )
}
