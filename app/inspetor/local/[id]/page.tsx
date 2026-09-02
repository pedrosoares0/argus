'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { PillTag } from '@/components/ui/PillTag'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { dadosCache } from '@/lib/cache/dadosCache'

interface AtivoSalaFormatado {
  id: string
  nome: string
  categoriaNome: string
  codigoQr: string
  patrimonio: string | null
  compartilhado: boolean
  statusAtivo: string
  inspecionadoHoje: boolean
  ultimaInspecaoTexto: string
  resultadoUltima: 'conforme' | 'critico' | 'importante' | 'pendente'
  ultimaExecId?: string
}

export default function PaginaLocal() {
  const router = useRouter()
  const params = useParams()
  const localId = params.id as string

  const cacheKey = `inspetor_local_${localId}`
  const cacheData = dadosCache.get<any>(cacheKey)

  const [local, setLocal] = useState<any>(() => cacheData?.local || null)
  const [ativos, setAtivos] = useState<AtivoSalaFormatado[]>(() => cacheData?.ativos || [])
  const [ncs, setNcs] = useState<any[]>(() => cacheData?.ncs || [])
  const [historico, setHistorico] = useState<any[]>(() => cacheData?.historico || [])
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [ncAbertaExpandida, setNcAbertaExpandida] = useState(true)
  const [carregando, setCarregando] = useState(() => !cacheData)
  const [erro, setErro] = useState<string | null>(null)
  const [fotoExpandida, setFotoExpandida] = useState<{ url: string; autorNome?: string; autorPerfil?: string } | string | null>(null)

  function formatarPerfil(perfil?: string | null) {
    if (!perfil) return 'Inspetor'
    const p = perfil.toLowerCase()
    if (p === 'inspetor') return 'Inspetor'
    if (p === 'coordenador') return 'Coordenador'
    if (p === 'engenharia') return 'Engenharia Clínica'
    if (p === 'tecnico') return 'Técnico'
    return perfil.charAt(0).toUpperCase() + perfil.slice(1)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setFotoExpandida(null)
    }
    if (fotoExpandida) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [fotoExpandida])

  useEffect(() => {
    async function carregarDadosSala() {
      try {
        const supabase = criarClienteSupabase() as any

        // 1. Buscar local e ativos vinculados via sala_ativos
        const [localRes, salaAtivosRes] = await Promise.all([
          supabase
            .from('locais')
            .select('*, centros_cirurgicos(*)')
            .eq('id', localId)
            .single(),
          supabase
            .from('sala_ativos')
            .select('compartilhado, ativos(*, categorias_ativos(*))')
            .eq('local_id', localId)
        ])

        if (localRes.error) {
          console.error(localRes.error)
          setErro(`Erro ao carregar sala: ${localRes.error.message}`)
          return
        }

        const localData = localRes.data
        if (!localData) {
          setErro('Sala não encontrada.')
          return
        }

        const localFormatado = {
          id: localData.id,
          nome: localData.nome,
          setor: localData.centros_cirurgicos?.nome || 'Centro Cirúrgico',
          status: localData.status,
        }
        setLocal(localFormatado)

        // Extrair ativos vinculados
        const salaAtivosData = salaAtivosRes.data || []
        const ativosBrutos = salaAtivosData
          .filter((sa: any) => sa.ativos)
          .map((sa: any) => ({ ...sa.ativos, compartilhado: sa.compartilhado }))

        if (ativosBrutos.length === 0) {
          setAtivos([])
          setHistorico([])
          setNcs([])
          setCarregando(false)
          return
        }

        const ativosIds = ativosBrutos.map((a: any) => a.id)

        // 2. Buscar execuções e Não Conformidades de todos os ativos da sala
        const [execsRes, ncsRes] = await Promise.all([
          supabase
            .from('execucoes_checklist')
            .select('*, usuarios(nome, perfil), modelos_checklist(nome_variante)')
            .in('ativo_id', ativosIds)
            .eq('status', 'concluida')
            .order('finalizado_em', { ascending: false })
            .limit(30),
          supabase
            .from('nao_conformidades')
            .select('*, ativos(nome), itens_execucao_checklist(*, execucoes_checklist(*, usuarios(nome, perfil)))')
            .in('ativo_id', ativosIds)
            .neq('status', 'encerrada')
            .order('criado_em', { ascending: false })
        ])

        const execsData = execsRes.data || []
        const ncsDataRaw = ncsRes.data || []

        const ncsData = ncsDataRaw.map((nc: any) => {
          const itemExec = Array.isArray(nc.itens_execucao_checklist)
            ? nc.itens_execucao_checklist[0] || {}
            : nc.itens_execucao_checklist || {}
          const execucao = Array.isArray(itemExec.execucoes_checklist)
            ? itemExec.execucoes_checklist[0] || {}
            : itemExec.execucoes_checklist || {}
          const autorUsuario = Array.isArray(execucao.usuarios)
            ? execucao.usuarios[0] || {}
            : execucao.usuarios || {}

          let autorNome = autorUsuario?.nome
          let autorPerfil = autorUsuario?.perfil

          if (!autorNome && itemExec.execucao_id) {
            const matchingExec = execsData.find((e: any) => e.id === itemExec.execucao_id)
            if (matchingExec?.usuarios) {
              autorNome = matchingExec.usuarios.nome
              autorPerfil = matchingExec.usuarios.perfil
            }
          }

          return {
            ...nc,
            autorNome: autorNome || 'Inspetor',
            autorPerfil: formatarPerfil(autorPerfil)
          }
        })

        setNcs(ncsData)

        // 3. Buscar criticidade das execuções
        const execsIds = execsData.map((e: any) => e.id)
        let itemsData: any[] = []
        if (execsIds.length > 0) {
          const { data: itensRes } = await supabase
            .from('itens_execucao_checklist')
            .select('execucao_id, resposta, criticidade')
            .in('execucao_id', execsIds.slice(0, 30))

          if (itensRes) itemsData = itensRes
        }

        const execsNcMapa = new Map<string, string>()
        itemsData.forEach((it: any) => {
          if (it.resposta === 'nao_conforme') {
            const current = execsNcMapa.get(it.execucao_id)
            if (!current || it.criticidade === 'critico' || (it.criticidade === 'importante' && current !== 'critico')) {
              execsNcMapa.set(it.execucao_id, it.criticidade)
            }
          }
        })

        // Calcular hoje (00:00:00) para verificar o que foi inspecionado HOJE
        const inicioHoje = new Date()
        inicioHoje.setHours(0, 0, 0, 0)

        const ativosFormatados: AtivoSalaFormatado[] = ativosBrutos.map((a: any) => {
          const execsDoAtivo = execsData.filter((e: any) => e.ativo_id === a.id)
          const ultimaExec = execsDoAtivo[0]

          let inspecionadoHoje = false
          let textoInspecao = 'Pendente de inspeção hoje'
          let resultado: 'conforme' | 'critico' | 'importante' | 'pendente' = 'pendente'

          if (ultimaExec) {
            const dataExec = new Date(ultimaExec.finalizado_em || ultimaExec.iniciado_em)
            const horaMin = dataExec.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            const diaMes = dataExec.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            const nomeInsp = ultimaExec.usuarios?.nome?.split(' ')[0] || 'Inspetor'

            if (dataExec >= inicioHoje) {
              inspecionadoHoje = true
              const critNc = execsNcMapa.get(ultimaExec.id)
              if (critNc === 'critico') resultado = 'critico'
              else if (critNc === 'importante') resultado = 'importante'
              else resultado = 'conforme'

              textoInspecao = `Insp. por ${nomeInsp} hoje às ${horaMin}`
            } else {
              textoInspecao = `Última em ${diaMes} às ${horaMin} (${nomeInsp})`
            }
          }

          return {
            id: a.id,
            nome: a.nome,
            categoriaNome: a.categorias_ativos?.nome || 'Equipamento',
            codigoQr: a.codigo_qr,
            patrimonio: a.patrimonio,
            compartilhado: !!a.compartilhado,
            statusAtivo: a.status,
            inspecionadoHoje,
            ultimaInspecaoTexto: textoInspecao,
            resultadoUltima: resultado,
            ultimaExecId: ultimaExec?.id,
          }
        })

        // Ordenar: primeiro Carrinho de Anestesia, Carrinho de Parada, depois por nome
        ativosFormatados.sort((a, b) => {
          if (a.nome.toLowerCase().includes('anestesia')) return -1
          if (b.nome.toLowerCase().includes('anestesia')) return 1
          if (a.nome.toLowerCase().includes('parada')) return -1
          if (b.nome.toLowerCase().includes('parada')) return 1
          return a.nome.localeCompare(b.nome)
        })

        setAtivos(ativosFormatados)

        // Formatar histórico geral da sala
        const historicoGeral = execsData.map((exec: any) => {
          const ativoAssociado = ativosBrutos.find((a: any) => a.id === exec.ativo_id)
          const criticidadeNc = execsNcMapa.get(exec.id)
          const dataInspecao = new Date(exec.finalizado_em || exec.iniciado_em)
          const formatador = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })

          return {
            id: exec.id,
            ativoId: exec.ativo_id,
            ativoNome: ativoAssociado?.nome || 'Equipamento',
            variante: exec.modelos_checklist?.nome_variante || 'Checklist',
            usuario: exec.usuarios?.nome || 'Inspetor',
            dataHora: formatador.format(dataInspecao),
            resultado: criticidadeNc || 'conforme'
          }
        })
        setHistorico(historicoGeral)

        dadosCache.set(cacheKey, {
          local: localFormatado,
          ativos: ativosFormatados,
          ncs: ncsData,
          historico: historicoGeral,
        })

        // Pré-carregar em background as rotas do checklist de cada equipamento da sala
        ativosFormatados.forEach((a) => {
          router.prefetch(`/inspetor/checklist/${a.id}`)
        })
      } catch (err: any) {
        console.error(err)
        setErro(`Erro de conexão: ${err.message || err}`)
      } finally {
        setCarregando(false)
      }
    }

    if (localId) {
      carregarDadosSala()
    }
  }, [localId, cacheKey])

  if (erro) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F4F6FA] p-6 space-y-4">
        <p className="text-sm font-semibold text-red-500 text-center">{erro}</p>
        <Link href="/inspetor" className="text-xs font-bold text-[#246BFD] underline">
          Voltar para Salas
        </Link>
      </div>
    )
  }

  // Cálculos de prontidão da sala
  const totalAtivos = ativos.length
  const totalInspecionadosHoje = ativos.filter(a => a.inspecionadoHoje).length
  const progressoPercent = totalAtivos > 0 ? Math.round((totalInspecionadosHoje / totalAtivos) * 100) : 0
  const temNcCritica = ncs.some(nc => nc.criticidade === 'critico')
  const temNcImportante = ncs.some(nc => nc.criticidade === 'importante')

  let statusSalaLabel = 'Pendente hoje'
  let statusSalaCor: 'verde' | 'laranja' | 'vermelho' | 'azul' | 'cinza' = 'azul'

  if (temNcCritica) {
    statusSalaLabel = 'Crítico'
    statusSalaCor = 'vermelho'
  } else if (temNcImportante) {
    statusSalaLabel = 'Com restrição'
    statusSalaCor = 'laranja'
  } else if (totalInspecionadosHoje === totalAtivos && totalAtivos > 0) {
    statusSalaLabel = 'Pronta (9/9)'
    statusSalaCor = 'verde'
  } else if (totalInspecionadosHoje > 0) {
    statusSalaLabel = `Vistoriando (${totalInspecionadosHoje}/${totalAtivos})`
    statusSalaCor = 'cinza'
  } else {
    statusSalaLabel = `Pendente (0/${totalAtivos || 9})`
    statusSalaCor = 'azul'
  }

  // Helper para ícones visuais dos equipamentos
  const obterIconeEquipamento = (nome: string) => {
    const n = (nome || '').toLowerCase()
    if (n.includes('anestesia')) return '/icon-anestesia.webp'
    if (n.includes('parada') || n.includes('carrinho')) return '/icon-carrinho.webp'
    if (n.includes('bisturi')) return '/icon-bisturi.webp'
    if (n.includes('aspirador')) return '/icon-aspiradorCirurgico.webp'
    if (n.includes('bomba') || n.includes('infus')) return encodeURI('/icon-bombaInfusão.webp')
    if (n.includes('foco')) return '/icon-focoCirurgico.webp'
    if (n.includes('gases') || n.includes('gas')) return '/icon-gasesMedicinais.webp'
    if (n.includes('mesa')) return '/icon-mesaCirurgica.webp'
    if (n.includes('monitor')) return '/icon-monitorMulti.webp'
    return null
  }

  // Helper para ícones das salas
  const obterIconeSala = (nome: string) => {
    const n = (nome || '').toLowerCase()
    if (n.includes('1') || n.includes('01')) return '/icon-sala1.webp'
    if (n.includes('3') || n.includes('03')) return '/icon-sala3.webp'
    if (n.includes('4') || n.includes('04')) return '/icon-sala4.webp'
    return null
  }

  return (
    <div className="px-4 sm:px-5 pt-3 pb-12 space-y-4 sm:space-y-5">
      {/* Botão Voltar */}
      <Link
        href="/inspetor"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-600 hover:text-black transition-colors -ml-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Salas Cirúrgicas
      </Link>

      {/* ── Card Principal: Resumo da Sala ── */}
      <div className="bg-white rounded-[28px] p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-gray-100/80 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {obterIconeSala(local?.nome) ? (
              <div className="relative w-12 h-12 rounded-[16px] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100/40 shadow-xs">
                <img
                  src={obterIconeSala(local?.nome)!}
                  alt={local?.nome || 'Sala'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_1.5px_4px_rgba(255,255,255,0.9)]" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#246BFD]/12 to-[#246BFD]/4 flex items-center justify-center shrink-0 border border-[#246BFD]/15">
                <svg className="w-6 h-6 text-[#246BFD]" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                </svg>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
                {local?.nome || 'Carregando sala...'}
              </h1>
              <p className="text-xs text-gray-500 font-semibold">{local?.setor || 'Centro Cirúrgico'}</p>
            </div>
          </div>

          <PillTag cor={statusSalaCor} className="scale-90 sm:scale-100 origin-right">
            {statusSalaLabel}
          </PillTag>
        </div>

        {/* Barra de Progresso da Ronda de Hoje */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-500">Equipamentos inspecionados hoje</span>
            <span className="text-gray-900 font-bold tabular-nums">
              {totalInspecionadosHoje} de {totalAtivos} ({progressoPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                progressoPercent === 100 ? 'bg-emerald-500' : 'bg-[#246BFD]'
              }`}
              style={{ width: `${progressoPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Seção de Não Conformidades Abertas (se houver) ── */}
      {ncs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Pendências ativas nesta sala ({ncs.length})
            </p>
          </div>
          <div className="space-y-2">
            {ncs.map((nc) => {
              const itemExec = Array.isArray(nc.itens_execucao_checklist)
                ? nc.itens_execucao_checklist[0] || {}
                : nc.itens_execucao_checklist || {}
              const desc = itemExec.evidencia_texto || nc.descricao || 'Problema não conforme relatado.'
              const cor = nc.criticidade === 'critico' ? 'vermelho' : 'laranja'
              const fotoUrl = nc.evidencia_url || itemExec.evidencia_url || null
              const nomeAtivo = nc.ativos?.nome || ativos.find(a => a.id === nc.ativo_id)?.nome
              const autorNome = nc.autorNome || 'Inspetor'
              const autorPerfil = nc.autorPerfil || 'Inspetor'

              return (
                <div
                  key={nc.id}
                  className="bg-red-50/70 rounded-[20px] p-3.5 space-y-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/nao-conformidades/${nc.id}`}
                          className="text-xs font-bold text-slate-900 hover:text-[#246BFD] transition-colors"
                        >
                          {nc.numero_unico || 'Não Conformidade'}
                        </Link>
                        {nomeAtivo && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-white/80 border border-slate-200/60 px-1.5 py-0.5 rounded-md truncate max-w-[180px]">
                            {nomeAtivo}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-red-500 font-medium mt-0.5 leading-snug">{desc}</p>
                    </div>
                    <PillTag cor={cor} className="scale-75 origin-top-right shrink-0">
                      {nc.criticidade === 'critico' ? 'Crítico' : 'Importante'}
                    </PillTag>
                  </div>

                  {/* Evidência Fotográfica */}
                  {fotoUrl && (
                    <div className="pt-1">
                      <p className="text-[9px] font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                        Evidência Fotográfica
                      </p>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setFotoExpandida({ url: fotoUrl, autorNome, autorPerfil })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setFotoExpandida({ url: fotoUrl, autorNome, autorPerfil })
                          }
                        }}
                        className="relative group cursor-zoom-in overflow-hidden rounded-xl border border-gray-200/60 bg-black/5 active:scale-[0.98] transition-all max-w-xs shadow-2xs"
                      >
                        <img
                          src={fotoUrl}
                          alt="Evidência da não conformidade"
                          className="rounded-xl max-h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="bg-white/95 backdrop-blur-md text-gray-900 font-bold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 scale-95 group-hover:scale-100 transition-transform">
                            <svg className="w-3.5 h-3.5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                            </svg>
                            Ampliar foto
                          </span>
                        </div>
                        {/* Mobile badge */}
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg shadow-sm group-hover:opacity-0 transition-opacity flex items-center gap-1 text-[10px] font-medium">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                          </svg>
                          Ampliar
                        </div>
                      </div>

                      {/* Autor discreto embaixo da imagem */}
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-1.5 px-0.5">
                        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                        </svg>
                        <span className="truncate">
                          Foto registrada por <strong className="text-gray-700 font-semibold">{autorNome}</strong> · <span className="text-gray-500">{autorPerfil}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Lista de Ativos da Sala para Inspeção ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Equipamentos da Sala ({totalAtivos})
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Toque para inspecionar
          </span>
        </div>

        {carregando && ativos.length === 0 ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-[24px] p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100/80 animate-pulse flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[16px] bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 bg-gray-200 rounded" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : ativos.length === 0 ? (
          <div className="bg-white rounded-[24px] p-8 text-center text-gray-400 border border-gray-100 text-xs font-semibold">
            Nenhum equipamento vinculado a esta sala.
          </div>
        ) : (
          ativos.map((ativo, i) => {
            const iconeImg = obterIconeEquipamento(ativo.nome)

            let badgeCor: 'verde' | 'vermelho' | 'laranja' | 'azul' = 'azul'
            let badgeLabel = 'Pendente'

            if (ativo.inspecionadoHoje) {
              if (ativo.resultadoUltima === 'critico') {
                badgeCor = 'vermelho'
                badgeLabel = 'Crítico'
              } else if (ativo.resultadoUltima === 'importante') {
                badgeCor = 'laranja'
                badgeLabel = 'Com restrição'
              } else {
                badgeCor = 'verde'
                badgeLabel = 'Conforme'
              }
            }

            return (
              <Link
                key={ativo.id}
                href={`/inspetor/checklist/${ativo.id}`}
                prefetch={true}
                className="block bg-white rounded-[24px] p-3.5 sm:p-4 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-gray-100/90 hover:border-gray-300 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Ícone + Informações */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {iconeImg ? (
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100/40">
                        <img src={iconeImg} alt={ativo.nome} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_1.5px_4px_rgba(255,255,255,0.9)]" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/60 text-slate-600">
                        <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.076.93-.043 1.378" />
                        </svg>
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                          {ativo.nome}
                        </h3>
                        {ativo.compartilhado && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 inline-flex items-center whitespace-nowrap">
                            Salas 1, 3 e 4
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className={[
                          'w-2 h-2 rounded-full shrink-0',
                          badgeCor === 'verde' ? 'bg-[#31B44A]' :
                          badgeCor === 'vermelho' ? 'bg-red-500' :
                          badgeCor === 'laranja' ? 'bg-amber-500' : 'bg-slate-300'
                        ].join(' ')} />
                        <span className="truncate font-medium">{ativo.ultimaInspecaoTexto}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badge de Status e Ação */}
                  <div className="flex items-center gap-2 shrink-0">
                    <PillTag cor={badgeCor} className="scale-85 origin-right">
                      {badgeLabel}
                    </PillTag>

                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-700">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* ── Histórico Recente de Inspeções da Sala ── */}
      {historico.length > 0 && (
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => setHistoricoAberto(!historicoAberto)}
            className="w-full flex items-center justify-between px-1 py-1 cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase group-hover:text-gray-600 transition-colors">
                Histórico Recente da Sala
              </p>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {historico.length}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${historicoAberto ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {historicoAberto && (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden animate-fadeIn">
              {historico.slice(0, 10).map((ins) => (
                <Link
                  key={ins.id}
                  href={`/inspetor/checklist/${ins.ativoId}?execId=${ins.id}`}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 truncate">{ins.ativoNome}</p>
                    <p className="text-[11px] text-slate-400">
                      Insp. por {ins.usuario} em {ins.dataHora}
                    </p>
                  </div>
                  <PillTag
                    cor={ins.resultado === 'critico' ? 'vermelho' : ins.resultado === 'importante' ? 'laranja' : 'verde'}
                    className="scale-75 origin-right"
                  >
                    {ins.resultado === 'conforme' ? 'Conforme' : 'Com NC'}
                  </PillTag>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL ZOOM FOTO (Apple Lightbox Style) ── */}
      {fotoExpandida && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] select-none"
          onClick={() => setFotoExpandida(null)}
        >
          {/* Header Controls */}
          <div 
            className="w-full max-w-md sm:max-w-lg flex items-center justify-between py-2 text-white mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">
                Evidência Fotográfica
              </span>
            </div>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-md cursor-pointer border border-white/20"
              onClick={() => setFotoExpandida(null)}
              aria-label="Fechar visualização"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Foto Expandida */}
          <div 
            className="relative max-w-md sm:max-w-lg w-full flex items-center justify-center overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/15 bg-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={typeof fotoExpandida === 'string' ? fotoExpandida : fotoExpandida.url}
              alt="Evidência ampliada"
              className="w-full max-h-[75vh] object-contain select-none"
            />
          </div>

          {/* Legenda/Autor discreto */}
          <div className="flex flex-col items-center gap-1.5 mt-3 text-center">
            {typeof fotoExpandida !== 'string' && fotoExpandida.autorNome && (
              <div className="flex items-center gap-1.5 text-xs text-white/90 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 shadow-sm">
                <svg className="w-3.5 h-3.5 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                <span>
                  Foto por <strong className="text-white font-semibold">{fotoExpandida.autorNome}</strong> · <span className="text-white/80">{fotoExpandida.autorPerfil}</span>
                </span>
              </div>
            )}
            <p className="text-[10.5px] font-medium text-white/50 tracking-wide">
              Toque em qualquer lugar fora da foto para fechar
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

