'use client'

import { useState, useEffect, useMemo } from 'react'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { dadosCache } from '@/lib/cache/dadosCache'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { QRCodeAtivo } from '@/components/ui/QRCodeAtivo'
import { PillTag } from '@/components/ui/PillTag'
import type { StatusAtivo } from '@/lib/supabase/types'

interface GestaoAtivosProps {
  hospitalId: string
}

const STATUS_ATIVO_MAPA: Record<
  StatusAtivo,
  { label: string; dot: string; bg: string; text: string; border: string; pillCor: 'verde' | 'laranja' | 'vermelho' | 'azul' | 'cinza' }
> = {
  operacional: {
    label: 'Operacional',
    dot: 'bg-[#31B44A] shadow-[0_0_8px_rgba(49,180,74,0.7)]',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    border: 'border-emerald-500/20',
    pillCor: 'verde',
  },
  operacional_com_restricoes: {
    label: 'Com restrições',
    dot: 'bg-[#F78725] shadow-[0_0_8px_rgba(247,135,37,0.7)]',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700',
    border: 'border-amber-500/20',
    pillCor: 'laranja',
  },
  indisponivel: {
    label: 'Indisponível',
    dot: 'bg-[#EA3A3A] shadow-[0_0_8px_rgba(234,58,58,0.7)]',
    bg: 'bg-rose-500/10',
    text: 'text-rose-700',
    border: 'border-rose-500/20',
    pillCor: 'vermelho',
  },
  em_manutencao: {
    label: 'Em manutenção',
    dot: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.7)]',
    bg: 'bg-sky-500/10',
    text: 'text-sky-700',
    border: 'border-sky-500/20',
    pillCor: 'azul',
  },
}

type FiltroStatus = 'todos' | StatusAtivo

interface SalaAgrupada {
  id: string
  nome: string
  centroCirurgicoNome: string
  ativos: any[]
}

// Helpers para ícones visuais (mesmos utilizados no inspetor)
const obterIconeEquipamento = (nome: string, categoria?: string) => {
  const n = `${nome || ''} ${categoria || ''}`.toLowerCase()
  if (n.includes('anestesia')) return '/icon-anestesia.webp'
  if (n.includes('parada') || n.includes('carrinho')) return '/icon-carrinho.webp'
  if (n.includes('bisturi')) return '/icon-bisturi.webp'
  if (n.includes('aspirador')) return '/icon-aspiradorCirurgico.webp'
  if (n.includes('bomba') || n.includes('infus')) return encodeURI('/icon-bombaInfusão.webp')
  if (n.includes('foco')) return '/icon-focoCirurgico.webp'
  if (n.includes('gases') || n.includes('gas')) return '/icon-gasesMedicinais.webp'
  if (n.includes('mesa')) return '/icon-mesaCirurgica.webp'
  if (n.includes('monitor')) return '/icon-monitorMulti.webp'
  return '/icon-carrinho.webp'
}

const obterIconeSala = (nome: string) => {
  const n = (nome || '').toLowerCase()
  if (n.includes('1') || n.includes('01')) return '/icon-sala1.webp'
  if (n.includes('3') || n.includes('03')) return '/icon-sala3.webp'
  if (n.includes('4') || n.includes('04')) return '/icon-sala4.webp'
  return '/icon-sala1.webp'
}

// Verifica se um ativo é compartilhado (Carrinho de Parada atende as 3 salas)
const isAtivoCompartilhado = (nome: string) => {
  const n = (nome || '').toLowerCase()
  return n.includes('parada') || n.includes('carrinho de parada')
}

// Derivar status da sala a partir dos ativos (mesma lógica do inspetor)
const derivarStatusSala = (ativos: any[]): { label: string; cor: 'verde' | 'laranja' | 'vermelho' | 'azul' | 'cinza' } => {
  const temIndisponivel = ativos.some(
    (a) => a.status === 'indisponivel' || a.status === 'em_manutencao'
  )
  const temRestricao = ativos.some((a) => a.status === 'operacional_com_restricoes')
  const todosOperacionais = ativos.every((a) => a.status === 'operacional')

  if (temIndisponivel) return { label: 'Crítico', cor: 'vermelho' }
  if (temRestricao) return { label: 'Com restrição', cor: 'laranja' }
  if (todosOperacionais && ativos.length > 0) return { label: 'Conforme', cor: 'verde' }
  return { label: 'Pendente', cor: 'azul' }
}

// SVG ícones de status miniatura (sem texto, apenas o selo visual do PillTag)
const StatusIconeMini = ({ status }: { status: StatusAtivo }) => {
  switch (status) {
    case 'operacional':
      return (
        <div className="w-5 h-5 shrink-0" title="Operacional">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path
              fill="#0AB01E"
              d="M12 2a2 2 0 0 1 1.414.586l.828.828a2 2 0 0 0 1.414.586h1.172a2 2 0 0 1 2 2v1.172a2 2 0 0 0 .586 1.414l.828.828A2 2 0 0 1 21 10.828v1.172a2 2 0 0 1-.586 1.414l-.828.828a2 2 0 0 0-.586 1.414v1.172a2 2 0 0 1-2 2h-1.172a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 10.828 21h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6 19h-1.172a2 2 0 0 1-2-2v-1.172a2 2 0 0 0-.586-1.414l-.828-.828A2 2 0 0 1 3 12v-1.172a2 2 0 0 1 .586-1.414l.828-.828A2 2 0 0 0 5 7.172V6a2 2 0 0 1 2-2h1.172a2 2 0 0 0 1.414-.586l.828-.828A2 2 0 0 1 12 2z"
            />
            <path
              stroke="#54D362"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.5 12.5l2.5 2.5 4.5-5"
            />
          </svg>
        </div>
      )
    case 'operacional_com_restricoes':
      return (
        <div className="w-5 h-5 shrink-0" title="Com restrições">
          <svg className="w-5 h-5 text-[#F86201]" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M10.788 3.21c.548-.96 1.876-.96 2.424 0l8.23 14.403c.532.931-.14 2.087-1.212 2.087H3.77c-1.072 0-1.744-1.156-1.212-2.087L10.788 3.21zM12 8a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 0012 8zm0 8a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
        </div>
      )
    case 'indisponivel':
      return (
        <div className="w-5 h-5 shrink-0" title="Indisponível">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#EA1517" />
            <path
              stroke="#F45F63"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 9l6 6m0-6l-6 6"
            />
          </svg>
        </div>
      )
    case 'em_manutencao':
      return (
        <div className="w-5 h-5 shrink-0" title="Em manutenção">
          <svg className="w-5 h-5 text-sky-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
      )
    default:
      return null
  }
}

export function GestaoAtivos({ hospitalId }: GestaoAtivosProps) {
  const cacheKey = `coordenador_ativos_${hospitalId}`
  const [ativosUnicos, setAtivosUnicos] = useState<any[]>(() => dadosCache.get<any[]>(`${cacheKey}_unicos`) || [])
  const [salas, setSalas] = useState<SalaAgrupada[]>(() => dadosCache.get<SalaAgrupada[]>(`${cacheKey}_salas`) || [])
  const [termoBusca, setTermoBusca] = useState('')
  const [salaSelecionada, setSalaSelecionada] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [carregando, setCarregando] = useState(() => !dadosCache.get(`${cacheKey}_salas`))
  const [salasExpandidas, setSalasExpandidas] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function carregarDados() {
      if (!dadosCache.get(`${cacheKey}_salas`)) {
        setCarregando(true)
      }
      try {
        const supabase = criarClienteSupabase() as any

        // 1. Buscar salas e sala_ativos (M:N) em paralelo
        const [locaisRes, salaAtivosRes, ativosRes] = await Promise.all([
          supabase
            .from('locais')
            .select('*, centros_cirurgicos(*)')
            .eq('tipo', 'sala')
            .in('nome', ['Sala 01', 'Sala 03', 'Sala 04'])
            .order('nome', { ascending: true }),
          supabase
            .from('sala_ativos')
            .select('local_id, compartilhado, ativos(*, categorias_ativos(*))'),
          supabase
            .from('ativos')
            .select('*, locais(*, centros_cirurgicos(*)), categorias_ativos(*)')
            .eq('hospital_id', hospitalId)
            .order('nome', { ascending: true })
        ])

        const locaisData = locaisRes.data || []
        const salaAtivosData = salaAtivosRes.data || []
        const todosAtivosData = (ativosRes.data || []).filter((a: any) => {
          const nomeLocal = (a.locais?.nome || '').toLowerCase()
          return !nomeLocal.includes('sala 02') && !nomeLocal.includes('sala 2')
        })

        setAtivosUnicos(todosAtivosData)
        dadosCache.set(`${cacheKey}_unicos`, todosAtivosData)

        if (locaisData.length > 0 && salaAtivosData.length > 0) {
          // Montar agrupamento com base na tabela oficial sala_ativos (M:N)
          const salasFormatadas: SalaAgrupada[] = locaisData.map((local: any) => {
            const vinculosDestaSala = salaAtivosData.filter((sa: any) => sa.local_id === local.id && sa.ativos)
            const ativosDestaSala = vinculosDestaSala.map((sa: any) => ({
              ...sa.ativos,
              compartilhado: sa.compartilhado,
            }))

            // Ordenar: primeiro Anestesia, depois Parada, depois alfabético
            ativosDestaSala.sort((a: any, b: any) => {
              if (a.nome.toLowerCase().includes('anestesia')) return -1
              if (b.nome.toLowerCase().includes('anestesia')) return 1
              if (a.nome.toLowerCase().includes('parada')) return -1
              if (b.nome.toLowerCase().includes('parada')) return 1
              return a.nome.localeCompare(b.nome)
            })

            return {
              id: local.id,
              nome: local.nome,
              centroCirurgicoNome: local.centros_cirurgicos?.nome || 'Centro Cirúrgico Principal',
              ativos: ativosDestaSala,
            }
          })

          setSalas(salasFormatadas)
          dadosCache.set(`${cacheKey}_salas`, salasFormatadas)
        } else if (todosAtivosData.length > 0) {
          // Fallback caso sala_ativos não esteja populado
          const mapa = new Map<string, SalaAgrupada>()
          todosAtivosData.forEach((ativo: any) => {
            const localId = ativo.locais?.id || ativo.local_id || 'sem_sala'
            const nomeLocal = ativo.locais?.nome || 'Sem Sala'
            const nomeCC = ativo.locais?.centros_cirurgicos?.nome || 'Centro Cirúrgico Principal'

            if (!mapa.has(localId)) {
              mapa.set(localId, {
                id: localId,
                nome: nomeLocal,
                centroCirurgicoNome: nomeCC,
                ativos: [],
              })
            }
            mapa.get(localId)!.ativos.push(ativo)
          })
          const fallbackSalas = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome))
          setSalas(fallbackSalas)
          dadosCache.set(`${cacheKey}_salas`, fallbackSalas)
        }
      } catch (err) {
        console.error('Erro ao carregar ativos:', err)
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [hospitalId, cacheKey])

  // Contadores globais baseados nos ativos únicos
  const contadores = useMemo(() => {
    const total = ativosUnicos.length
    const operacional = ativosUnicos.filter((a) => a.status === 'operacional').length
    const operacional_com_restricoes = ativosUnicos.filter((a) => a.status === 'operacional_com_restricoes').length
    const indisponivelOuManutencao = ativosUnicos.filter(
      (a) => a.status === 'indisponivel' || a.status === 'em_manutencao'
    ).length
    const taxaConformidade = total > 0 ? Math.round((operacional / total) * 100) : 100

    return {
      total,
      operacional,
      operacional_com_restricoes,
      indisponivelOuManutencao,
      taxaConformidade,
    }
  }, [ativosUnicos])

  const todasSalas = salas

  // Filtragem
  const salasFiltradas = useMemo(() => {
    const termo = termoBusca.trim().toLowerCase()

    return todasSalas
      .map((sala) => {
        if (salaSelecionada !== 'todas' && sala.id !== salaSelecionada) {
          return null
        }

        const ativosCorrespondentes = sala.ativos.filter((ativo) => {
          if (filtroStatus !== 'todos') {
            if (filtroStatus === 'indisponivel' && (ativo.status === 'indisponivel' || ativo.status === 'em_manutencao')) {
              // ok
            } else if (ativo.status !== filtroStatus) {
              return false
            }
          }

          if (!termo) return true

          const matchNome = ativo.nome?.toLowerCase().includes(termo)
          const matchPatrimonio = (ativo.patrimonio ?? '').toLowerCase().includes(termo)
          const matchQr = (ativo.codigo_qr ?? '').toLowerCase().includes(termo)
          const matchCategoria = (ativo.categorias_ativos?.nome ?? '').toLowerCase().includes(termo)
          const matchSala = sala.nome.toLowerCase().includes(termo)
          const matchCC = sala.centroCirurgicoNome.toLowerCase().includes(termo)

          return matchNome || matchPatrimonio || matchQr || matchCategoria || matchSala || matchCC
        })

        if (ativosCorrespondentes.length === 0 && termo) {
          return null
        }

        return {
          ...sala,
          ativos: ativosCorrespondentes,
        }
      })
      .filter(Boolean) as SalaAgrupada[]
  }, [todasSalas, salaSelecionada, filtroStatus, termoBusca])

  const alternarExpansaoSala = (salaId: string) => {
    setSalasExpandidas((prev) => ({
      ...prev,
      [salaId]: !prev[salaId],
    }))
  }

  const isSalaAberta = (salaId: string) => {
    if (termoBusca.trim().length > 0) {
      return true
    }
    return Boolean(salasExpandidas[salaId])
  }

  if (carregando) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="grid grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-white/70 rounded-[28px] border border-white/80 shadow-xs" />
          ))}
        </div>
        <div className="h-12 bg-white/70 rounded-full border border-white/80" />
        <div className="h-48 bg-white/70 rounded-[28px] border border-white/80" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ================================================================
          4 CARDS — Cores vividas, inner shadow nos 4 lados, ícones dos badges, font Nunito
          ================================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* CARD 1: OPERACIONAIS (Verde Conforme #54D362 → #31B44A) */}
        <div
          onClick={() => setFiltroStatus(filtroStatus === 'operacional' ? 'todos' : 'operacional')}
          style={{
            fontFamily: "'Nunito', sans-serif",
            background: 'radial-gradient(130% 130% at 30% 20%, #54D362 0%, #31B44A 50%, #209935 100%)',
            boxShadow: 'inset 0 3px 10px rgba(255, 255, 255, 0.7), inset 0 -3px 8px rgba(0, 0, 0, 0.08), inset 3px 0 8px rgba(255, 255, 255, 0.4), inset -3px 0 8px rgba(255, 255, 255, 0.4), 0 10px 28px rgba(49, 180, 74, 0.28)',
          }}
          className={`relative overflow-hidden rounded-[28px] px-4.5 py-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] select-none flex flex-col justify-between min-h-[120px] border-0 ${
            filtroStatus === 'operacional' ? 'ring-4 ring-emerald-300 ring-offset-2' : ''
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[28px] pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/90 drop-shadow-xs">
              Operacionais
            </span>
            {/* Selo Florado do Badge Conforme */}
            <div className="w-7 h-7 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path fill="rgba(255,255,255,0.35)" d="M12 2a2 2 0 0 1 1.414.586l.828.828a2 2 0 0 0 1.414.586h1.172a2 2 0 0 1 2 2v1.172a2 2 0 0 0 .586 1.414l.828.828A2 2 0 0 1 21 10.828v1.172a2 2 0 0 1-.586 1.414l-.828.828a2 2 0 0 0-.586 1.414v1.172a2 2 0 0 1-2 2h-1.172a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 10.828 21h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6 19h-1.172a2 2 0 0 1-2-2v-1.172a2 2 0 0 0-.586-1.414l-.828-.828A2 2 0 0 1 3 12v-1.172a2 2 0 0 1 .586-1.414l.828-.828A2 2 0 0 0 5 7.172V6a2 2 0 0 1 2-2h1.172a2 2 0 0 0 1.414-.586l.828-.828A2 2 0 0 1 12 2z" />
                <path stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.5 2.5 4.5-5" />
              </svg>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <span style={{ fontFamily: "'Nunito', sans-serif" }} className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none text-white drop-shadow-sm">
                {contadores.operacional}
              </span>
              <span className="text-[11px] font-extrabold text-white/65">/ {contadores.total}</span>
            </div>
          </div>

          <div className="relative z-10 text-[10.5px] text-white/90">
            <span className="font-extrabold drop-shadow-2xs">
              {contadores.taxaConformidade}% · Prontos para uso
            </span>
          </div>
        </div>

        {/* CARD 2: RESTRIÇÕES (Laranja Importante #FF9E3D → #F78725) */}
        <div
          onClick={() =>
            setFiltroStatus(filtroStatus === 'operacional_com_restricoes' ? 'todos' : 'operacional_com_restricoes')
          }
          style={{
            fontFamily: "'Nunito', sans-serif",
            background: 'radial-gradient(130% 130% at 30% 20%, #FF9E3D 0%, #F78725 50%, #DD6B10 100%)',
            boxShadow: 'inset 0 3px 10px rgba(255, 255, 255, 0.7), inset 0 -3px 8px rgba(0, 0, 0, 0.08), inset 3px 0 8px rgba(255, 255, 255, 0.4), inset -3px 0 8px rgba(255, 255, 255, 0.4), 0 10px 28px rgba(247, 135, 37, 0.28)',
          }}
          className={`relative overflow-hidden rounded-[28px] px-4.5 py-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] select-none flex flex-col justify-between min-h-[120px] border-0 ${
            filtroStatus === 'operacional_com_restricoes' ? 'ring-4 ring-orange-300 ring-offset-2' : ''
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[28px] pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/90 drop-shadow-xs">
              Restrições
            </span>
            {/* Triângulo de Alerta do Badge Importante */}
            <div className="w-7 h-7 flex items-center justify-center">
              <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)">
                <path fillRule="evenodd" clipRule="evenodd" d="M10.788 3.21c.548-.96 1.876-.96 2.424 0l8.23 14.403c.532.931-.14 2.087-1.212 2.087H3.77c-1.072 0-1.744-1.156-1.212-2.087L10.788 3.21zM12 8a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 0012 8zm0 8a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
            </div>
          </div>

          <div className="relative z-10">
            <span style={{ fontFamily: "'Nunito', sans-serif" }} className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none text-white drop-shadow-sm">
              {contadores.operacional_com_restricoes}
            </span>
          </div>

          <div className="relative z-10 text-[10.5px] text-white/90">
            <span className="font-extrabold drop-shadow-2xs">Requer atenção</span>
          </div>
        </div>

        {/* CARD 3: INDISPONÍVEIS (Vermelho Crítico #F45F63 → #EA3A3A) */}
        <div
          onClick={() => setFiltroStatus(filtroStatus === 'indisponivel' ? 'todos' : 'indisponivel')}
          style={{
            fontFamily: "'Nunito', sans-serif",
            background: 'radial-gradient(130% 130% at 30% 20%, #F45F63 0%, #EA3A3A 50%, #C82020 100%)',
            boxShadow: 'inset 0 3px 10px rgba(255, 255, 255, 0.7), inset 0 -3px 8px rgba(0, 0, 0, 0.08), inset 3px 0 8px rgba(255, 255, 255, 0.4), inset -3px 0 8px rgba(255, 255, 255, 0.4), 0 10px 28px rgba(234, 58, 58, 0.28)',
          }}
          className={`relative overflow-hidden rounded-[28px] px-4.5 py-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] select-none flex flex-col justify-between min-h-[120px] border-0 ${
            filtroStatus === 'indisponivel' ? 'ring-4 ring-rose-300 ring-offset-2' : ''
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[28px] pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/90 drop-shadow-xs">
              Indisponíveis
            </span>
            {/* Círculo X do Badge Crítico */}
            <div className="w-7 h-7 flex items-center justify-center">
              <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.3)" />
                <path stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6m0-6l-6 6" />
              </svg>
            </div>
          </div>

          <div className="relative z-10">
            <span style={{ fontFamily: "'Nunito', sans-serif" }} className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none text-white drop-shadow-sm">
              {contadores.indisponivelOuManutencao}
            </span>
          </div>

          <div className="relative z-10 text-[10.5px] text-white/90">
            <span className="font-extrabold drop-shadow-2xs">Crítico</span>
          </div>
        </div>

        {/* CARD 4: SALAS (Azul Primário #528BFF → #246BFD) */}
        <div
          onClick={() => {
            setFiltroStatus('todos')
            setSalaSelecionada('todas')
          }}
          style={{
            fontFamily: "'Nunito', sans-serif",
            background: 'radial-gradient(130% 130% at 30% 20%, #528BFF 0%, #246BFD 50%, #1253F6 100%)',
            boxShadow: 'inset 0 3px 10px rgba(255, 255, 255, 0.7), inset 0 -3px 8px rgba(0, 0, 0, 0.08), inset 3px 0 8px rgba(255, 255, 255, 0.4), inset -3px 0 8px rgba(255, 255, 255, 0.4), 0 10px 28px rgba(36, 107, 253, 0.28)',
          }}
          className={`relative overflow-hidden rounded-[28px] px-4.5 py-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] select-none flex flex-col justify-between min-h-[120px] border-0 ${
            filtroStatus === 'todos' && salaSelecionada === 'todas' ? 'ring-4 ring-blue-300 ring-offset-2' : ''
          }`}
        >
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[28px] pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/90 drop-shadow-xs">
              Salas
            </span>
            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/35 flex items-center justify-center text-white shadow-xs">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
          </div>

          <div className="relative z-10">
            <span style={{ fontFamily: "'Nunito', sans-serif" }} className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none text-white drop-shadow-sm">
              {todasSalas.length}
            </span>
          </div>

          <div className="relative z-10 text-[10.5px] text-white/90">
            <span className="font-extrabold drop-shadow-2xs">Mapeadas</span>
          </div>
        </div>

      </div>

      {/* ================================================================
          BUSCA & SELETOR DE SALAS
          ================================================================ */}
      <div className="space-y-3.5">
        <BarraBusca
          placeholder="Buscar equipamento, patrimônio, QR code ou sala..."
          valor={termoBusca}
          aoMudar={setTermoBusca}
        />

        {/* Filtros em Pílula das Salas */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 pt-0.5">
          <button
            type="button"
            onClick={() => setSalaSelecionada('todas')}
            style={{
              boxShadow: salaSelecionada === 'todas'
                ? '0 4px 16px rgba(15, 23, 42, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                : 'inset 0 1.5px 3px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.02)',
            }}
            className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 active:scale-95 ${
              salaSelecionada === 'todas'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/70'
            }`}
          >
            Todas as Salas ({todasSalas.length})
          </button>

          {todasSalas.map((sala) => {
            const isAtivo = salaSelecionada === sala.id
            return (
              <button
                key={sala.id}
                type="button"
                onClick={() => setSalaSelecionada(isAtivo ? 'todas' : sala.id)}
                style={{
                  boxShadow: isAtivo
                    ? '0 4px 16px rgba(15, 23, 42, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                    : 'inset 0 1.5px 3px rgba(255, 255, 255, 0.9), 0 2px 8px rgba(0, 0, 0, 0.02)',
                }}
                className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 active:scale-95 flex items-center gap-2 ${
                  isAtivo
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/70'
                }`}
              >
                <span>{sala.nome}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isAtivo ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {sala.ativos.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ================================================================
          LISTA DE SALAS E ATIVOS
          ================================================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Equipamentos Alocados por Sala</h3>
            <span className="text-[11px] font-bold text-slate-400">
              ({salasFiltradas.reduce((acc, s) => acc + s.ativos.length, 0)} no total)
            </span>
          </div>

          {filtroStatus !== 'todos' && (
            <button
              type="button"
              onClick={() => setFiltroStatus('todos')}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs"
            >
              Filtro ativo: <span className="text-slate-900">{STATUS_ATIVO_MAPA[filtroStatus]?.label}</span>
              <span className="text-xs ml-1">✕</span>
            </button>
          )}
        </div>

        {salasFiltradas.length > 0 ? (
          <div className="space-y-4">
            {salasFiltradas.map((sala) => {
              const aberta = isSalaAberta(sala.id)
              const totalAtivosSala = sala.ativos.length
              const iconeSalaUrl = obterIconeSala(sala.nome)
              const statusSala = derivarStatusSala(sala.ativos)

              return (
                <div
                  key={sala.id}
                  style={{
                    boxShadow: 'inset 0 1.5px 3px rgba(255, 255, 255, 0.95), 0 8px 30px rgba(0, 0, 0, 0.025)',
                  }}
                  className="rounded-[28px] bg-white border border-slate-100/90 overflow-hidden transition-all duration-300 hover:border-slate-200"
                >
                  {/* Cabeçalho da Sala */}
                  <div
                    onClick={() => alternarExpansaoSala(sala.id)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Ícone da Sala — maior */}
                      <div
                        style={{
                          boxShadow: 'inset 0 1.5px 3px rgba(255, 255, 255, 0.9), 0 4px 12px rgba(0, 0, 0, 0.04)',
                        }}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-[20px] overflow-hidden bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0"
                      >
                        <img
                          src={iconeSalaUrl}
                          alt={sala.nome}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-[16px] font-black text-slate-900 tracking-tight truncate">
                            {sala.nome}
                          </h4>
                          {/* Badge de Status da Sala (como no inspetor) */}
                          <PillTag cor={statusSala.cor} className="scale-[0.82] origin-left">
                            {statusSala.label}
                          </PillTag>
                        </div>
                        <p className="text-[11.5px] text-slate-400 font-medium truncate mt-0.5">
                          {sala.centroCirurgicoNome} · {totalAtivosSala} {totalAtivosSala === 1 ? 'ativo' : 'ativos'}
                        </p>
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="w-8.5 h-8.5 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-500 hover:bg-slate-200/80 transition-colors shrink-0">
                      <svg
                        className={`w-4 h-4 transition-transform duration-300 ${aberta ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </div>

                  {/* Conteúdo Expansível: Lista de Ativos — cada ativo em seu próprio card */}
                  {aberta && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-slate-100/80">
                      {sala.ativos.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 font-medium">
                          Nenhum ativo nesta sala com os filtros aplicados.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sala.ativos.map((ativo) => {
                            const iconeAtivoUrl = obterIconeEquipamento(ativo.nome, ativo.categorias_ativos?.nome)
                            const compartilhado = isAtivoCompartilhado(ativo.nome)

                            return (
                              <div
                                key={ativo.id}
                                style={{
                                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.85), 0 2px 8px rgba(0, 0, 0, 0.03)',
                                }}
                                className="flex items-center justify-between gap-2.5 bg-slate-50/70 rounded-2xl px-3.5 py-3 border border-slate-100/80 transition-colors hover:bg-slate-50"
                              >
                                {/* Info do Ativo com Imagem 3D Real */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    style={{
                                      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 2px 6px rgba(0, 0, 0, 0.04)',
                                    }}
                                    className="relative w-10 h-10 rounded-[14px] overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-200/50"
                                  >
                                    <img
                                      src={iconeAtivoUrl}
                                      alt={ativo.nome || 'Equipamento'}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h5 className="text-[13px] font-black text-slate-900 truncate">
                                        {ativo.nome}
                                      </h5>
                                      {compartilhado && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 inline-flex items-center whitespace-nowrap">
                                          Salas 1, 3 e 4
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-medium mt-0.5">
                                      <span className="text-slate-500 font-bold">
                                        {ativo.categorias_ativos?.nome || 'Equipamento'}
                                      </span>
                                      {ativo.patrimonio && (
                                        <>
                                          <span>·</span>
                                          <span className="font-mono text-slate-400 font-bold">Pat: {ativo.patrimonio}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Ícone de Status (redondo) + QRCode — lado a lado */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Ícone de status redondo */}
                                  <div className="w-7 h-7 rounded-full bg-white border border-slate-200/60 flex items-center justify-center shadow-2xs">
                                    <StatusIconeMini status={ativo.status as StatusAtivo} />
                                  </div>

                                  {/* Botão QR Code */}
                                  <QRCodeAtivo
                                    ativoId={ativo.id}
                                    localId={ativo.local_id}
                                    nomeAtivo={ativo.nome}
                                    codigoQr={ativo.codigo_qr}
                                    patrimonio={ativo.patrimonio}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              boxShadow: 'inset 0 1.5px 3px rgba(255, 255, 255, 0.95), 0 8px 30px rgba(0, 0, 0, 0.025)',
            }}
            className="py-12 px-6 bg-white rounded-[28px] border border-slate-100 text-center space-y-3"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Nenhum ativo ou sala encontrada</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Tente redefinir os filtros ou buscar por outros termos como nome da sala ou código de patrimônio.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
