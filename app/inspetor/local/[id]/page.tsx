'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { PillTag } from '@/components/ui/PillTag'
import type { StatusAtivo } from '@/lib/supabase/types'
import { criarClienteSupabase } from '@/lib/supabase/client'

/**
 * Tela de detalhes do Local / Sala — Apple-style, hierarquia clara.
 */

const STATUS_ATIVO: Record<StatusAtivo, { label: string; dot: string }> = {
  operacional: { label: 'Operacional', dot: 'bg-emerald-500' },
  operacional_com_restricoes: { label: 'Com restrição', dot: 'bg-amber-500' },
  indisponivel: { label: 'Indisponível', dot: 'bg-red-500' },
  em_manutencao: { label: 'Em manutenção', dot: 'bg-sky-500' },
}

const STATUS_LOCAL = {
  pronta: { label: 'Pronta', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pronta_com_ressalvas: { label: 'Com ressalvas', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  nao_pronta: { label: 'Não pronta', bg: 'bg-red-50 text-red-700 border-red-200' },
  liberada_manualmente: { label: 'Liberada', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
} as const

export default function PaginaLocal() {
  const router = useRouter()

  const params = useParams()
  const localId = params.id as string

  const [local, setLocal] = useState<any>(null)
  const [ativos, setAtivos] = useState<any[]>([])
  const [ncs, setNcs] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [ultimoChecklistItens, setUltimoChecklistItens] = useState<any[]>([])
  const [dataFiltro, setDataFiltro] = useState('')
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDados() {
      try {
        const supabase = criarClienteSupabase() as any

        // Buscar detalhes do local
        const { data: localData, error: localError } = await supabase
          .from('locais')
          .select('*, centros_cirurgicos(*)')
          .eq('id', localId)
          .single()

        if (localError) {
          console.error(localError)
          setErro(`Erro ao carregar local: ${localError.message} (Código ${localError.code})`)
          return
        }

        if (!localData) {
          setErro('Nenhum dado encontrado para esta sala.')
          return
        }

        setLocal({
          id: localData.id,
          nome: localData.nome,
          setor: localData.centros_cirurgicos?.nome || 'Centro Cirúrgico',
          status: localData.status as keyof typeof STATUS_LOCAL,
        })

        // Buscar ativos desse local
        const { data: ativosData, error: ativosError } = await supabase
          .from('ativos')
          .select('*')
          .eq('local_id', localId)

        if (ativosError) {
          console.error(ativosError)
          setErro(`Erro ao carregar ativos: ${ativosError.message} (Código ${ativosError.code})`)
          return
        }

        if (ativosData) {
          if (ativosData.length > 0) {
            const ativosIds = ativosData.map((a: any) => a.id)

            // Buscar execuções concluídas para esses ativos (com joins para carregar dados históricos completos)
            const { data: execsData, error: execsError } = await supabase
              .from('execucoes_checklist')
              .select('*, usuarios(nome), modelos_checklist(nome_variante)')
              .in('ativo_id', ativosIds)
              .eq('status', 'concluida')
              .order('finalizado_em', { ascending: false })

            if (execsError) {
              console.error(execsError)
            }

            // Buscar todos os itens executados para identificar se houve não conformidade e sua criticidade
            const execsNcMapa = new Map()
            if (execsData && execsData.length > 0) {
              const execsIds = execsData.map((e: any) => e.id)
              const { data: itemsData } = await supabase
                .from('itens_execucao_checklist')
                .select('execucao_id, resposta, criticidade, item_congelado')
                .in('execucao_id', execsIds)

              if (itemsData) {
                itemsData.forEach((it: any) => {
                  if (it.resposta === 'nao_conforme') {
                    const currentHighest = execsNcMapa.get(it.execucao_id)
                    if (!currentHighest ||
                      (it.criticidade === 'critico') ||
                      (it.criticidade === 'importante' && currentHighest !== 'critico')) {
                      execsNcMapa.set(it.execucao_id, it.criticidade)
                    }
                  }
                })

                // Preencher o checklist da última execução
                const ultimaExecId = execsData[0].id
                const ultimoItems = itemsData.filter((it: any) => it.execucao_id === ultimaExecId)
                const secoesMapa = new Map<string, { resposta: string; criticidade: string }>()

                ultimoItems.forEach((it: any) => {
                  const desc = it.item_congelado?.descricao || ''
                  const secao = desc.split(' — ')[0] || 'Outros'

                  const atual = secoesMapa.get(secao)
                  if (it.resposta === 'nao_conforme') {
                    if (!atual || atual.resposta === 'conforme' ||
                      (it.criticidade === 'critico') ||
                      (it.criticidade === 'importante' && atual.criticidade !== 'critico')) {
                      secoesMapa.set(secao, { resposta: 'nao_conforme', criticidade: it.criticidade })
                    }
                  } else if (!atual) {
                    secoesMapa.set(secao, { resposta: 'conforme', criticidade: 'informativo' })
                  }
                })

                const secoesLista = Array.from(secoesMapa.entries()).map(([secao, val]) => ({
                  secao,
                  resposta: val.resposta,
                  criticidade: val.criticidade
                }))
                setUltimoChecklistItens(secoesLista)
              }
            }

            // Mapear ativos com a última inspeção
            setAtivos(ativosData.map((a: any) => {
              const ultimaExec = execsData?.find((e: any) => e.ativo_id === a.id)
              let textoInspecao = 'Sem inspeções hoje'
              if (ultimaExec) {
                const dataInspecao = new Date(ultimaExec.finalizado_em || ultimaExec.iniciado_em)
                const formatador = new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const nomeInspetor = ultimaExec.usuarios?.nome || 'Inspetor'
                textoInspecao = `Insp. por ${nomeInspetor} em ${formatador.format(dataInspecao)}`
              }

              return {
                id: a.id,
                nome: a.nome,
                status: a.status as StatusAtivo,
                ultimaInspecao: textoInspecao,
              }
            }))

            // Definir o histórico completo do ativo principal (o primeiro da lista)
            const primaryAsset = ativosData[0]
            if (primaryAsset) {
              const execsAtivo = execsData?.filter((e: any) => e.ativo_id === primaryAsset.id) || []
              const historicoFormatado = execsAtivo.map((exec: any) => {
                const criticidadeNc = execsNcMapa.get(exec.id)
                const dataInspecao = new Date(exec.finalizado_em || exec.iniciado_em)
                const formatador = new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })

                return {
                  id: exec.id,
                  variante: exec.modelos_checklist?.nome_variante || 'Checklist',
                  usuario: exec.usuarios?.nome || 'Inspetor',
                  dataHora: formatador.format(dataInspecao),
                  dataOriginal: dataInspecao,
                  resultado: criticidadeNc || 'conforme'
                }
              })
              setHistorico(historicoFormatado)

              // Buscar NCs abertas dos ativos desse local para exibir alerta piscante e resumo da última
              const { data: ncsData, error: ncsError } = await supabase
                .from('nao_conformidades')
                .select('*, itens_execucao_checklist(*, execucoes_checklist(*, usuarios(nome)))')
                .in('ativo_id', ativosIds)
                .neq('status', 'encerrada')
                .order('criado_em', { ascending: false })

              if (!ncsError && ncsData) {
                setNcs(ncsData)
              }
            }
          } else {
            setAtivos([])
            setHistorico([])
            setNcs([])
          }
        }
      } catch (err: any) {
        console.error(err)
        setErro(`Erro de conexão: ${err.message || err}`)
      } finally {
        setCarregando(false)
      }
    }
    if (localId) {
      carregarDados()
    }
  }, [localId])

  if (erro) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F4F6FA] p-6 space-y-4">
        <p className="text-sm font-semibold text-red-500 text-center">{erro}</p>
        <Link href="/inspetor" className="text-xs font-bold text-[#246BFD] underline">
          Voltar para Início
        </Link>
      </div>
    )
  }

  if (carregando || !local) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F4F6FA]">
        <p className="text-sm font-semibold text-gray-400 animate-pulse">Carregando sala...</p>
      </div>
    )
  }

  const temNcAberta = ncs.length > 0
  const maiorCriticidade = temNcAberta
    ? ncs.reduce((acc, curr) => {
      if (curr.criticidade === 'critico') return 'critico'
      if (curr.criticidade === 'importante' && acc !== 'critico') return 'importante'
      return acc
    }, 'informativo')
    : null

  const statusLabel = temNcAberta
    ? maiorCriticidade === 'critico' ? 'Não pronta' : maiorCriticidade === 'importante' ? 'Com restrição' : 'Informativo'
    : 'Pronta'

  const statusCor = temNcAberta
    ? maiorCriticidade === 'critico' ? 'vermelho' : maiorCriticidade === 'importante' ? 'laranja' : 'azul'
    : 'verde'

  const ativoPrincipal = ativos[0]
  const tituloExibido = ativoPrincipal ? ativoPrincipal.nome : local.nome
  const subtituloExibido = ativoPrincipal ? `${local.nome} · ${local.setor}` : local.setor
  const isCarrinho = tituloExibido.toLowerCase().includes('carrinho de parada') || tituloExibido.toLowerCase().includes('carrinho')

  const historicoFiltrado = historico.filter((ins) => {
    if (!dataFiltro) return true
    const ano = ins.dataOriginal.getFullYear()
    const mes = String(ins.dataOriginal.getMonth() + 1).padStart(2, '0')
    const dia = String(ins.dataOriginal.getDate()).padStart(2, '0')
    const formattedInsDate = `${ano}-${mes}-${dia}`
    return formattedInsDate === dataFiltro
  })

  return (
    <div className="px-5 pt-3 pb-10 space-y-6">
      {/* Voltar */}
      <Link
        href="/inspetor"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-600 hover:text-black transition-colors -ml-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Voltar
      </Link>
      {/* ── Card Principal: Ativo / Sala ── */}
      <div className="bg-white rounded-[24px] p-6 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80">
        {/* Nome + Badge de Prontidão */}
        <div className="flex items-start justify-between gap-3 mb-1 min-w-0">
          <div className="flex items-start gap-3.5 min-w-0">
            {isCarrinho && (
              <img
                src="/icon-carrinho2.webp"
                alt="Carrinho de Parada"
                className="w-24 h-24 object-contain shrink-0 mt-0.5"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight leading-tight">
                {tituloExibido}
              </h1>
              <p className="text-[13px] text-gray-500 mt-0.5">{subtituloExibido}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <PillTag cor={statusCor}>
              {statusLabel}
            </PillTag>
          </div>
        </div>

        {/* Separador */}
        <div className="h-px bg-gray-100 my-4" />

        {/* Prontidão Visual */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-450 tracking-wider uppercase">
            Itens do Checklist e Avaliação
          </p>
          {ultimoChecklistItens.length > 0 ? (
            <div className="space-y-1.5 mt-2 bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60">
              {ultimoChecklistItens.map((item, idx) => {
                const isNc = item.resposta === 'nao_conforme'
                return (
                  <div
                    key={idx}
                    className={[
                      'flex items-center justify-between px-3 py-2 rounded-xl transition-all',
                      isNc
                        ? item.criticidade === 'critico'
                          ? 'bg-red-50/60 border border-red-100/40 shadow-[0_1px_4px_rgba(239,68,68,0.03)]'
                          : 'bg-amber-50/60 border border-amber-100/40 shadow-[0_1px_4px_rgba(245,158,11,0.03)]'
                        : 'bg-white border border-slate-100/40 shadow-[0_1px_3px_rgba(0,0,0,0.015)]'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={[
                        'w-2 h-2 rounded-full shrink-0',
                        isNc
                          ? item.criticidade === 'critico' ? 'bg-red-500' : 'bg-amber-500'
                          : 'bg-emerald-500'
                      ].join(' ')} />
                      <span className={[
                        'text-[13px] truncate',
                        isNc ? 'text-slate-900 font-bold' : 'text-slate-700 font-medium'
                      ].join(' ')}>
                        {item.secao}
                      </span>
                    </div>

                    <span className={[
                      'text-[11px] font-bold uppercase tracking-wider',
                      isNc
                        ? item.criticidade === 'critico' ? 'text-red-650' : 'text-amber-650'
                        : 'text-emerald-650'
                    ].join(' ')}>
                      {isNc ? 'Não Conforme' : 'Conforme'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50/40 border border-slate-100/50 rounded-2xl text-xs text-slate-400 font-medium">
              Sem dados de checklist recentes.
            </div>
          )}
        </div>

        {/* CTA — Iniciar Ronda */}
        <div className="mt-5">
          <Botao
            variante="primario"
            tamanho="lg"
            larguraTotal
            onClick={() => router.push(`/inspetor/checklist/ronda-${local.id}`)}
            icone={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            Iniciar ronda
          </Botao>
        </div>
      </div>

      {/* ── Resumo da Última NC Aberta ── */}
      {ncs.length > 0 && (() => {
        const ultimaNc = ncs[0]
        const dataCriacao = new Date(ultimaNc.criado_em)
        const formatador = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

        const criticidadeCores = {
          critico: 'bg-red-50 text-red-700 border-red-100',
          importante: 'bg-amber-50 text-amber-700 border-amber-100',
          informativo: 'bg-blue-50 text-blue-700 border-blue-100'
        }

        const statusCores = {
          aberta: 'bg-slate-50 text-slate-650 border-slate-100',
          em_analise: 'bg-sky-50 text-sky-700 border-sky-100',
          em_correcao: 'bg-amber-50 text-amber-700 border-amber-100',
          aguardando_validacao: 'bg-purple-50 text-purple-700 border-purple-100',
          encerrada: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          correcao_recusada: 'bg-rose-50 text-rose-700 border-rose-100'
        }

        const criticidadeLabel = {
          critico: 'NC Crítica',
          importante: 'NC Importante',
          informativo: 'NC Informativa'
        }

        const statusLabel = {
          aberta: 'Aberta',
          em_analise: 'Em análise',
          em_correcao: 'Em correção',
          aguardando_validacao: 'Aguardando validação',
          encerrada: 'Encerrada',
          correcao_recusada: 'Recusada'
        }

        const itemExec = ultimaNc.itens_execucao_checklist || {}
        const exec = itemExec.execucoes_checklist || {}
        const nomeInspetor = exec.usuarios?.nome || 'Inspetor'
        const secaoAfetada = itemExec.item_congelado?.descricao?.split(' — ')[0] || 'Geral'
        const descricaoEvidencia = itemExec.evidencia_texto || 'Sem descrição detalhada.'
        const fotoUrl = itemExec.evidencia_url
        const temFotoReal = fotoUrl && !fotoUrl.includes('unsplash.com')

        const criticidadeEstilos = {
          critico: {
            bg: 'bg-red-50/40 border-red-100/50',
            border: 'border-l-red-500',
            badge: 'bg-red-50 text-red-700 border-red-100',
            dot: 'bg-red-500'
          },
          importante: {
            bg: 'bg-amber-50/40 border-amber-100/50',
            border: 'border-l-amber-500',
            badge: 'bg-amber-50 text-amber-700 border-amber-100',
            dot: 'bg-amber-500'
          },
          informativo: {
            bg: 'bg-blue-50/40 border-blue-100/50',
            border: 'border-l-blue-500',
            badge: 'bg-blue-50 text-blue-700 border-blue-100',
            dot: 'bg-blue-500'
          }
        }

        const estilo = criticidadeEstilos[ultimaNc.criticidade as keyof typeof criticidadeEstilos] || criticidadeEstilos.informativo

        return (
          <div className="space-y-3">
            <p className="text-[12px] font-bold text-slate-400 tracking-wider uppercase px-1">
              Última Não Conformidade Aberta
            </p>

            <div className={`bg-white rounded-[24px] p-6 border border-slate-100/80 border-l-4 ${estilo.border} shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4`}>
              {/* Cabeçalho */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                    {ultimaNc.numero_unico || `NC-${ultimaNc.id.substring(0, 4).toUpperCase()}`}
                  </span>
                  <h4 className="text-[17px] font-extrabold text-slate-900 tracking-tight leading-snug">
                    {secaoAfetada}
                  </h4>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${estilo.badge}`}>
                    {criticidadeLabel[ultimaNc.criticidade as keyof typeof criticidadeLabel]}
                  </span>
                </div>
              </div>

              {/* Description Section */}
              <div className={`rounded-xl p-4 border ${estilo.bg} space-y-2`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Problema Relatado
                </p>
                <p className="text-[14px] text-slate-800 font-semibold leading-relaxed">
                  {descricaoEvidencia}
                </p>

                {temFotoReal && (
                  <div className="pt-2">
                    <img
                      src={fotoUrl}
                      alt="Evidência NC"
                      className="rounded-xl max-h-48 w-full object-cover border border-slate-200/40 shadow-xs"
                    />
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-200/50" />

              {/* Footer */}
              <div className="flex items-center justify-between text-[12px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Registrada por {nomeInspetor} em {formatador.format(dataCriacao)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/nao-conformidades/${ultimaNc.id}`)}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[12px] font-bold text-[#246BFD] bg-white hover:bg-slate-50 border border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all rounded-full"
                >
                  Ver detalhes
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Histórico de Inspeções (Colapsável) ── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setHistoricoAberto(!historicoAberto)}
          className="w-full flex items-center justify-between px-1 cursor-pointer select-none py-1 group"
        >
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase group-hover:text-gray-600 transition-colors">
              Histórico de Inspeções
            </p>
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {historicoFiltrado.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro de Data */}
            {historicoAberto && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-white border border-gray-200/60 rounded-full px-2.5 py-1 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <input
                  type="date"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                  className="text-xs font-semibold text-gray-700 bg-transparent outline-none border-none cursor-pointer p-0 w-24"
                />
                {dataFiltro && (
                  <button
                    type="button"
                    onClick={() => setDataFiltro('')}
                    className="text-gray-400 hover:text-black transition-colors cursor-pointer text-[10px] font-bold px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${historicoAberto ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </button>

        {historicoAberto && (
          <div className="animate-[fadeIn_0.2s_ease-out] space-y-3">
            {historicoFiltrado.length > 0 ? (
              <div className="bg-white rounded-[24px] shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 divide-y divide-gray-100/80 overflow-hidden">
                {historicoFiltrado.map((ins) => {
                  const cores = {
                    conforme: {
                      bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      badge: 'Conforme',
                      iconBg: 'bg-emerald-500',
                      icon: (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )
                    },
                    critico: {
                      bg: 'bg-red-50 text-red-700 border-red-100',
                      badge: 'NC Crítica',
                      iconBg: 'bg-red-500',
                      icon: (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      )
                    },
                    importante: {
                      bg: 'bg-amber-50 text-amber-700 border-amber-100',
                      badge: 'NC Importante',
                      iconBg: 'bg-amber-500',
                      icon: (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
                        </svg>
                      )
                    },
                    informativo: {
                      bg: 'bg-blue-50 text-blue-700 border-blue-100',
                      badge: 'NC Informativa',
                      iconBg: 'bg-blue-500',
                      icon: (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                      )
                    }
                  }

                  const cfg = cores[ins.resultado as keyof typeof cores] || cores.conforme

                  return (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => router.push(`/inspetor/checklist/${ativoPrincipal.id}?execId=${ins.id}`)}
                      className="w-full flex items-center justify-between py-4 px-5 hover:bg-slate-50/50 transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Status Badge Icon */}
                        <div className={`w-8 h-8 rounded-full ${cfg.iconBg} flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                          {cfg.icon}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <p className="text-[14px] font-bold text-gray-900 tracking-tight">
                            Ronda: {ins.variante}
                          </p>
                          <p className="text-[12px] text-gray-600 font-medium leading-none">
                            Inspetor: <span className="text-gray-900 font-semibold">{ins.usuario}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            Realizada em {ins.dataHora}
                          </p>
                        </div>
                      </div>

                      {/* Status do lado direito */}
                      <div className="flex items-center gap-2.5 shrink-0 ml-3">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-extrabold border uppercase tracking-wider ${cfg.bg}`}>
                          {cfg.badge}
                        </span>
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-[24px] p-8 text-center text-gray-400 border border-gray-100/80 text-xs font-semibold">
                Nenhuma inspeção encontrada {dataFiltro ? 'para este dia' : 'no histórico'}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
