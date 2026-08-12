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
  const [ncAbertaExpandida, setNcAbertaExpandida] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null)

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
  const ultimaNcAberta = ncs[0]
  const criticidadeUltimaInspecao = ultimaNcAberta ? ultimaNcAberta.criticidade : null

  const statusLabel = temNcAberta
    ? criticidadeUltimaInspecao === 'critico' ? 'Crítico' : 'Importante'
    : 'Pronto'

  const statusCor = temNcAberta
    ? criticidadeUltimaInspecao === 'critico' ? 'vermelho' : 'laranja'
    : 'verde'

  const ativoPrincipal = ativos[0]
  const tituloExibido = ativoPrincipal ? ativoPrincipal.nome : local.nome
  const subtituloExibido = local.setor || 'Centro Cirúrgico'
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
    <div className="px-4 sm:px-5 pt-3 pb-10 space-y-4 sm:space-y-6">
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
      <div className="bg-white rounded-[28px] p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100/80">
        {/* Nome + Badge de Prontidão */}
        <div className="flex items-center justify-between gap-3 mb-1 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {isCarrinho && (
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-gray-100/30">
                <img
                  src="/icon-carrinho.webp"
                  alt="Carrinho de Parada"
                  className="w-full h-full object-cover"
                />
                {/* Sombra interna branca (innershadow branco) */}
                <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_2.5px_8px_rgba(255,255,255,0.95)] border border-white/25" />
              </div>
            )}
            <div className="min-w-0 space-y-0.5">
              <h1 className="text-sm sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
                {tituloExibido}
              </h1>
              <p className="text-xs text-gray-500 font-semibold">{subtituloExibido}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <PillTag cor={statusCor} className="scale-90 sm:scale-100 origin-right">
              {statusLabel}
            </PillTag>
          </div>
        </div>

        {/* Separador */}
        <div className="h-px bg-gray-100 my-3.5" />

        {/* Prontidão Visual */}
        <div className="space-y-2">
          <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
            Itens do Checklist e Avaliação
          </p>
          {ultimoChecklistItens.length > 0 ? (
            <div className="space-y-2 mt-2 bg-[#F4F6FA]/50 rounded-[20px] p-3.5 border border-gray-100/80">
              {ultimoChecklistItens.map((item, idx) => {
                const isNc = item.resposta === 'nao_conforme'
                return (
                  <div
                    key={idx}
                    className={[
                      'flex items-center justify-between px-3 py-2 rounded-xl transition-all border',
                      isNc
                        ? item.criticidade === 'critico'
                          ? 'bg-red-50/70 border-red-200/40 shadow-[0_1px_4px_rgba(239,68,68,0.02)]'
                          : 'bg-amber-50/70 border-amber-200/40 shadow-[0_1px_4px_rgba(245,158,11,0.02)]'
                        : 'bg-white border-gray-100/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)]'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={[
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isNc
                          ? item.criticidade === 'critico' ? 'bg-red-500' : 'bg-amber-500'
                          : 'bg-emerald-500'
                      ].join(' ')} />
                      <span className={[
                        'text-xs truncate',
                        isNc ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold'
                      ].join(' ')}>
                        {item.secao}
                      </span>
                    </div>

                    <span className={[
                      'text-[9px] sm:text-[10px] font-bold uppercase tracking-wider',
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
            <div className="text-center py-6 bg-slate-50/40 border border-slate-100/50 rounded-xl text-xs text-slate-400 font-medium">
              Sem dados de checklist recentes.
            </div>
          )}
        </div>

        {/* CTA — Iniciar Ronda */}
        <div className="mt-4">
          <Botao
            variante="primario"
            tamanho="md"
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

        const itemExec = ultimaNc.itens_execucao_checklist || {}
        const exec = itemExec.execucoes_checklist || {}
        const nomeInspetor = exec.usuarios?.nome || 'Inspetor'
        const secaoAfetada = itemExec.item_congelado?.descricao?.split(' — ')[0] || 'Geral'
        const descricaoEvidencia = itemExec.evidencia_texto || ultimaNc.descricao || 'Sem descrição detalhada.'
        const fotoUrl = itemExec.evidencia_url || ultimaNc.evidencia_url
        const temFotoReal = Boolean(fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim() !== '' && !fotoUrl.includes('unsplash.com'))

        const formatadorDataCurta = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        const dataFormatada = formatadorDataCurta.format(dataCriacao).replace(', ', ' às ')

        const corPill =
          ultimaNc.criticidade === 'critico' ? 'vermelho' :
            ultimaNc.criticidade === 'importante' ? 'laranja' : 'azul'

        const labelPill =
          ultimaNc.criticidade === 'critico' ? 'Crítico' :
            ultimaNc.criticidade === 'importante' ? 'Importante' : 'Informativo'

        return (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setNcAbertaExpandida(!ncAbertaExpandida)}
              className="w-full flex items-center justify-between px-1 cursor-pointer select-none py-1 group"
            >
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase group-hover:text-gray-600 transition-colors">
                Última Não Conformidade Aberta
              </p>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${ncAbertaExpandida ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            <div className={`grid transition-all duration-300 ease-in-out ${ncAbertaExpandida ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 pointer-events-none mt-0'}`}>
              <div className="overflow-hidden">
                <div className="bg-white rounded-[28px] p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100/90 space-y-4 mb-2">
                  {/* Cabeçalho: Título + Subtítulo + Badge */}
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
                        {secaoAfetada}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium">
                        Registrada por {nomeInspetor} em {dataFormatada}
                      </p>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      <PillTag cor={corPill} className="scale-90 sm:scale-100 origin-right">
                        {labelPill}
                      </PillTag>
                    </div>
                  </div>

                  {/* Bloco: Problema Relatado */}
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      PROBLEMA RELATADO
                    </p>
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {descricaoEvidencia}
                    </p>
                  </div>

                  {/* Imagem de Evidência com Borderglass & Cantos Arredondados */}
                  {temFotoReal && (
                    <div className="space-y-2 pt-0.5">
                      <div 
                        onClick={() => setFotoExpandida(fotoUrl)}
                        className="relative overflow-hidden rounded-xl border border-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5 cursor-pointer hover:opacity-98 transition-all group"
                      >
                        <img
                          src={fotoUrl}
                          alt="Evidência da Não Conformidade"
                          className="w-full h-auto max-h-[180px] sm:max-h-[220px] object-cover group-hover:scale-[1.01] transition-transform duration-300 rounded-xl"
                        />
                        {/* Overlay de Borda de Vidro Ultra-Subtil & Delicada */}
                        <div className="absolute inset-0 rounded-xl pointer-events-none border border-white/70 shadow-[inset_0_1px_8px_rgba(255,255,255,0.4)] ring-1 ring-inset ring-white/40" />
                      </div>

                      {/* Informação de quem tirou e quando (Embaixo da imagem) */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium px-0.5 pt-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0c-.693.044-1.336.438-1.736 1.039l-.822 1.316Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                          </svg>
                          <span className="truncate">Registrada por <strong className="text-gray-700 font-semibold">{nomeInspetor}</strong></span>
                        </div>
                        <span className="text-gray-450 font-semibold shrink-0">{dataFormatada}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Histórico de Inspeções (Colapsável) ── */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => setHistoricoAberto(!historicoAberto)}
          className="w-full flex items-center justify-between px-1 cursor-pointer select-none py-1 group"
        >
          <div className="flex items-center gap-2">
            <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wider uppercase group-hover:text-gray-600 transition-colors">
              Histórico de Inspeções
            </p>
            <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {historicoFiltrado.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${historicoAberto ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </button>

        {historicoAberto && (
          <div className="animate-[fadeIn_0.2s_ease-out] space-y-2.5">
            {historicoFiltrado.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 divide-y divide-gray-100/80 overflow-hidden">
                {historicoFiltrado.map((ins) => {
                  let corPill: 'verde' | 'laranja' | 'vermelho' = 'verde'
                  let labelPill = 'Pronto'

                  if (ins.resultado === 'critico') {
                    corPill = 'vermelho'
                    labelPill = 'Crítico'
                  } else if (ins.resultado === 'importante' || ins.resultado === 'informativo') {
                    corPill = 'laranja'
                    labelPill = 'Importante'
                  }

                  const iconBgClass =
                    corPill === 'vermelho' ? 'bg-gradient-to-b from-[#F45F63] to-[#EA3A3A]' :
                      corPill === 'laranja' ? 'bg-gradient-to-b from-[#FF9E3D] to-[#F78725]' :
                        'bg-gradient-to-b from-[#54D362] to-[#31B44A]'

                  return (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => router.push(`/inspetor/checklist/${ativoPrincipal.id}?execId=${ins.id}`)}
                      className="w-full flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Status Badge Icon */}
                        <div className={`w-8 h-8 rounded-full ${iconBgClass} flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-white`}>
                          {corPill === 'verde' && (
                            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                              <path
                                fill="#0AB01E"
                                d="M12 2a2 2 0 0 1 1.414.586l.828.828a2 2 0 0 0 1.414.586h1.172a2 2 0 0 1 2 2v1.172a2 2 0 0 0 .586 1.414l.828.828A2 2 0 0 1 21 10.828v1.172a2 2 0 0 1-.586 1.414l-.828.828a2 2 0 0 0-.586 1.414v1.172a2 2 0 0 1-2 2h-1.172a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 10.828 21h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6 19h-1.172a2 2 0 0 1-2-2v-1.172a2 2 0 0 0-.586-1.414l-.828.828A2 2 0 0 1 3 12v-1.172a2 2 0 0 1 .586-1.414l.828-.828A2 2 0 0 0 5 7.172V6a2 2 0 0 1 2-2h1.172a2 2 0 0 0 1.414-.586l.828-.828A2 2 0 0 1 12 2z"
                              />
                              <path
                                stroke="#54D362"
                                strokeWidth="2.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.5 12.5l2.5 2.5 4.5-5"
                              />
                            </svg>
                          )}
                          {corPill === 'vermelho' && (
                            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" fill="#EA1517" />
                              <path
                                stroke="#F45F63"
                                strokeWidth="2.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 9l6 6m0-6l-6 6"
                              />
                            </svg>
                          )}
                          {corPill === 'laranja' && (
                            <svg className="w-4.5 h-4.5 text-[#F86201]" viewBox="0 0 24 24" fill="currentColor">
                              <path fillRule="evenodd" clipRule="evenodd" d="M10.788 3.21c.548-.96 1.876-.96 2.424 0l8.23 14.403c.532.931-.14 2.087-1.212 2.087H3.77c-1.072 0-1.744-1.156-1.212-2.087L10.788 3.21zM12 8a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 0012 8zm0 8a1 1 0 100-2 1 1 0 000 2z" />
                            </svg>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-gray-900 tracking-tight leading-tight">
                              Ronda: {ins.variante}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 font-medium leading-none">
                            Inspetor: <span className="text-gray-900 font-semibold">{ins.usuario}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            Realizada em {ins.dataHora}
                          </p>
                        </div>
                      </div>

                      {/* Apenas seta do lado direito */}
                      <div className="flex items-center shrink-0 ml-1">
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100/80 text-xs font-semibold">
                Nenhuma inspeção encontrada {dataFiltro ? 'para este dia' : 'no histórico'}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Lightbox para foto expandida */}
      {fotoExpandida && (
        <div 
          onClick={() => setFotoExpandida(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full flex items-center justify-center">
            <img
              src={fotoExpandida}
              alt="Evidência Ampliada"
              className="max-w-full max-h-[85vh] rounded-[24px] object-contain shadow-2xl border border-white/10"
            />
            <button
              type="button"
              onClick={() => setFotoExpandida(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm transition-all"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
