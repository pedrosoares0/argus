'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarPerfil } from '@/components/ui/Avatar'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { dadosCache } from '@/lib/cache/dadosCache'
import { TODOS_SETORES, SETORES_LABELS, SETORES_CORES, verificarTecnicoAtivo } from '@/lib/roteamentoNC'
import type { SetorTecnico } from '@/lib/supabase/types'

type PeriodoFiltro = '7d' | '15d' | '30d'

interface PainelDashboardProps {
  hospitalId: string
}

interface InspetorRanking {
  usuarioId: string
  nome: string
  perfil: string
  avatarUrl?: string
  totalRondas: number
  totalConformes: number
  totalNaoConformes: number
}

interface DadosDashboard {
  // Rondas
  rondasNoPeriodo: number
  rondasSemNcNoPeriodo: number
  // NCs
  ncsAbertasNoPeriodo: number
  ncsEncerradasNoPeriodo: number
  totalNcsAbertas: number
  // Itens inspecionados
  totalItensConformes: number
  totalItens: number
  // Ranking de ativos
  rankingAtivos: {
    ativoId: string
    nomeAtivo: string
    categoria: string
    localNome: string
    centroCirurgicoNome: string
    quantidadeNcs: number
  }[]
  // Ranking de inspetores
  rankingInspetores: InspetorRanking[]
  // Tempo médio de resolução (ms)
  tempoMedioResolucaoMs: number | null
  tempoMedioAnteriorMs: number | null
  // NCs por criticidade
  ncsPorCriticidade: { critico: number; importante: number; informativo: number }
  // Rondas por dia
  rondasPorDia: { data: string; diaSemana: string; diaNumero: string; quantidade: number }[]
  // Rondas recentes
  rondasRecentes: {
    id: string
    inspetorNome: string
    nomeAtivo: string
    localNome: string
    centroCirurgicoNome: string
    dataHora: string
    status: string
  }[]
}

const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatarDataChaveLocal(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function obterDataInicio(periodo: PeriodoFiltro): Date {
  const agora = new Date()
  const dias = periodo === '7d' ? 7 : periodo === '15d' ? 15 : 30
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - (dias - 1), 0, 0, 0, 0)
  return d
}

function formatarDuracao(ms: number): string {
  if (ms <= 0) return '0min'
  const horas = Math.floor(ms / 3600000)
  const minutos = Math.floor((ms % 3600000) / 60000)
  if (horas >= 24) {
    const dias = Math.floor(horas / 24)
    const horasRestantes = horas % 24
    return `${dias}d ${horasRestantes}h`
  }
  if (horas > 0) return `${horas}h ${minutos}min`
  return `${minutos}min`
}

function gerarDiasNoPeriodo(periodo: PeriodoFiltro): { data: string; diaSemana: string; diaNumero: string }[] {
  const dias = periodo === '7d' ? 7 : periodo === '15d' ? 15 : 30
  const resultado: { data: string; diaSemana: string; diaNumero: string }[] = []
  const agora = new Date()
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i)
    resultado.push({
      data: formatarDataChaveLocal(d),
      diaSemana: DIAS_SEMANA_CURTO[d.getDay()],
      diaNumero: String(d.getDate()).padStart(2, '0'),
    })
  }
  return resultado
}

/**
 * Anel de Progresso Circular Moderno & Limpo (Apple Health Style)
 */
function AnelCircular3D({
  porcentagem,
  gradienteId,
  corInicio,
  corFim,
  tamanho = 74,
  espessura = 6,
}: {
  porcentagem: number | null
  gradienteId: string
  corInicio: string
  corFim: string
  tamanho?: number
  espessura?: number
}) {
  const pct = porcentagem !== null ? Math.min(Math.max(porcentagem, 0), 100) : 0
  const raio = (tamanho - espessura) / 2
  const circunferencia = 2 * Math.PI * raio
  const offset = circunferencia - (pct / 100) * circunferencia

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="rotate-[-90deg] overflow-visible">
        <defs>
          <linearGradient id={gradienteId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={corInicio} />
            <stop offset="100%" stopColor={corFim} />
          </linearGradient>
        </defs>

        {/* Trilha de Fundo Suave */}
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke="#F1F5F9"
          strokeWidth={espessura}
          fill="transparent"
        />

        {/* Arco de Progresso com Gradiente */}
        {porcentagem !== null && (
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            stroke={`url(#${gradienteId})`}
            strokeWidth={espessura}
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        )}
      </svg>

      {/* Porcentagem Centralizada */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[14px] font-black font-nunito text-slate-800 tracking-tight leading-none">
          {porcentagem !== null ? `${porcentagem}%` : '—'}
        </span>
      </div>
    </div>
  )
}

/**
 * Coluna Individual do Pódio Monocromático (Clean Apple Style)
 */
function ColunaPodio({
  posicao,
  inspetor,
  alturaPilar,
}: {
  posicao: 1 | 2 | 3
  inspetor?: InspetorRanking
  alturaPilar: string
}) {
  if (!inspetor) {
    return (
      <div className="flex flex-col items-center opacity-30">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 border border-dashed border-gray-300 mb-2 flex items-center justify-center text-[10px] text-gray-400 font-bold">
          —
        </div>
        <div className={`w-full ${alturaPilar} rounded-t-2xl bg-slate-100 border border-slate-200 flex items-center justify-center`}>
          <span className="text-xl font-black text-slate-300">{posicao}</span>
        </div>
      </div>
    )
  }

  const nomeCompleto = inspetor.nome && inspetor.nome.trim() ? inspetor.nome : 'Inspetor'
  const primeiroNome = nomeCompleto
    .replace(/^(Enf\.|Coord\.|Eng\.|Dr\.|Dra\.)\s*/i, '')
    .split(' ')[0] || nomeCompleto

  const nomeLimpo = nomeCompleto.replace(/^(Enf\.|Coord\.|Eng\.|Dr\.|Dra\.)\s*/i, '')
  const iniciais = nomeLimpo && nomeLimpo !== 'Inspetor'
    ? nomeLimpo
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
    : 'IN'

  const avatarUrl =
    inspetor.avatarUrl ||
    (inspetor.perfil === 'engenharia_clinica' || inspetor.perfil === 'engenharia'
      ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg'
      : inspetor.perfil === 'coordenador'
        ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg'
        : inspetor.perfil === 'gestor'
          ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg'
          : 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg')

  return (
    <div className="flex flex-col items-center text-center">
      {/* Bloco Superior: Avatar Oficial + Nome + Métricas */}
      <div className="flex flex-col items-center mb-2.5 space-y-1 w-full">
        {/* Avatar Oficial por Perfil */}
        <AvatarPerfil perfil={inspetor.perfil} nome={inspetor.nome} tamanho="lg" />

        {/* Nome do Inspetor */}
        <p className="text-[11.5px] font-black text-gray-900 truncate max-w-[85px] leading-tight pt-0.5">
          {primeiroNome}
        </p>

        {/* Quantidade de Rondas em Cinza (Sem fundo) */}
        <span className="text-[10px] font-bold font-nunito text-gray-400">
          {inspetor.totalRondas} ronda{inspetor.totalRondas !== 1 ? 's' : ''}
        </span>

        {/* Indicadores Conformes (✓ verde) e NCs (✕ vermelho) sem badge no fundo */}
        <div className="flex items-center justify-center gap-2 pt-0.5 font-nunito">
          {/* Check Verde: Conformes */}
          <span className="inline-flex items-center gap-0.5 text-[10px] font-black font-nunito text-emerald-600">
            <span className="text-[11px]">✓</span>
            <span>{inspetor.totalConformes}</span>
          </span>

          {/* X Vermelho: NCs */}
          <span className="inline-flex items-center gap-0.5 text-[10px] font-black font-nunito text-red-500">
            <span className="text-[11px]">✕</span>
            <span>{inspetor.totalNaoConformes}</span>
          </span>
        </div>
      </div>

      {/* Pilar Físico do Pódio Monocromático (Uma única cor clean para os 3) */}
      <div className={`w-full ${alturaPilar} rounded-t-2xl bg-gradient-to-b from-slate-100 to-slate-200/80 border border-slate-200/90 flex flex-col justify-between overflow-hidden shadow-xs`}>
        {/* Topo do Bloco (Lid) */}
        <div className="w-full h-3 bg-slate-200/70 border-b border-slate-200/90" />

        {/* Face Frontal com Apenas o Número Limpo */}
        <div className="flex-1 flex items-center justify-center pb-1">
          <span className="text-2xl font-black font-nunito leading-none text-slate-600">
            {posicao}
          </span>
        </div>
      </div>
    </div>
  )
}

export function PainelDashboard({ hospitalId }: PainelDashboardProps) {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('7d')
  const cacheKey = `coordenador_dashboard_v3_${hospitalId}_${periodo}`
  const [dados, setDados] = useState<DadosDashboard | null>(() => dadosCache.get<DadosDashboard>(cacheKey))
  const [carregando, setCarregando] = useState(() => !dadosCache.get(cacheKey))

  useEffect(() => {
    async function carregarDados() {
      if (!dadosCache.get(cacheKey)) {
        setCarregando(true)
      }
      try {
        const supabase = criarClienteSupabase() as any
        const dataInicio = obterDataInicio(periodo)
        const dataInicioISO = dataInicio.toISOString()

        // Período anterior para comparação do tempo de resolução
        const diasPeriodo = periodo === '7d' ? 7 : periodo === '15d' ? 15 : 30
        const dataInicioAnterior = new Date(dataInicio.getTime() - diasPeriodo * 24 * 60 * 60 * 1000)
        const dataInicioAnteriorISO = dataInicioAnterior.toISOString()

        // Helper robusto para formatar nome
        const formatarNome = (u: any): string => {
          if (!u) return 'Inspetor'
          const nomeCandidato = u.nome || u.full_name || u.name
          if (nomeCandidato && typeof nomeCandidato === 'string' && nomeCandidato.trim() && nomeCandidato.trim() !== 'Inspetor') {
            return nomeCandidato.trim()
          }
          if (u.email && typeof u.email === 'string') {
            const parte = u.email.split('@')[0]
            const partes = parte.split(/[\._\-]/).filter(Boolean)
            if (partes.length > 0) {
              return partes.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
            }
            return parte
          }
          return 'Inspetor'
        }

        // Executar TODAS as queries em PARALELO simultâneo com Promise.all
        const [
          execsRes,
          usuariosRes,
          ncsAbertasRes,
          ncsEncerradasPeriodoRes,
          ncsEncerradasAnteriorRes,
          totalNcsAbertasRes,
          ncsParaRankingRes,
          ncsTodasPeriodoRes,
        ] = await Promise.all([
          supabase
            .from('execucoes_checklist')
            .select('id, finalizado_em, iniciado_em, usuario_id, status, ativo_id, ativos(nome, local_id, locais(nome, centros_cirurgicos(nome)))')
            .eq('status', 'concluida'),
          supabase
            .from('usuarios')
            .select('*'),
          supabase
            .from('nao_conformidades')
            .select('id', { count: 'exact' })
            .eq('hospital_id', hospitalId)
            .gte('criado_em', dataInicioISO),
          supabase
            .from('nao_conformidades')
            .select('id, criado_em, atualizado_em, status')
            .eq('hospital_id', hospitalId)
            .eq('status', 'encerrada')
            .gte('criado_em', dataInicioISO),
          supabase
            .from('nao_conformidades')
            .select('id, criado_em, atualizado_em, status')
            .eq('hospital_id', hospitalId)
            .eq('status', 'encerrada')
            .gte('criado_em', dataInicioAnteriorISO)
            .lt('criado_em', dataInicioISO),
          supabase
            .from('nao_conformidades')
            .select('id', { count: 'exact' })
            .eq('hospital_id', hospitalId)
            .neq('status', 'encerrada'),
          supabase
            .from('nao_conformidades')
            .select('id, ativo_id, criticidade, ativos(id, nome, categorias_ativos(nome), locais(nome, centros_cirurgicos(nome)))')
            .eq('hospital_id', hospitalId)
            .gte('criado_em', dataInicioISO),
          supabase
            .from('nao_conformidades')
            .select('id, criticidade')
            .eq('hospital_id', hospitalId)
            .gte('criado_em', dataInicioISO),
        ])

        const mapaUsuarios = new Map<string, { nome: string; perfil: string; avatarUrl?: string }>()
        let todasExecucoes: any[] = execsRes.data || []

        // Mapear usuários das execuções
        todasExecucoes.forEach((r: any) => {
          if (r.usuarios && r.usuario_id) {
            mapaUsuarios.set(r.usuario_id, {
              nome: formatarNome(r.usuarios),
              perfil: r.usuarios.perfil || 'inspetor',
              avatarUrl: r.usuarios.avatar_url,
            })
          }
        })

        // Mapear tabela de usuários
        if (usuariosRes.data && usuariosRes.data.length > 0) {
          usuariosRes.data.forEach((u: any) => {
            const info = {
              nome: formatarNome(u),
              perfil: u.perfil || 'inspetor',
              avatarUrl: u.avatar_url,
            }
            if (u.id) mapaUsuarios.set(u.id, info)
            if (u.auth_user_id) mapaUsuarios.set(u.auth_user_id, info)
          })
        }

        const rondasData = todasExecucoes.filter((r: any) => {
          const dataRonda = r.finalizado_em || r.iniciado_em
          if (!dataRonda) return false
          return new Date(dataRonda).getTime() >= dataInicio.getTime()
        })

        const ncsAbertasPeriodoData = ncsAbertasRes.data || []
        const ncsAbertasCount = ncsAbertasRes.count ?? ncsAbertasPeriodoData.length
        const ncsEncerradasPeriodo = ncsEncerradasPeriodoRes.data || []
        const ncsEncerradasAnterior = ncsEncerradasAnteriorRes.data || []
        const totalNcsAbertas = totalNcsAbertasRes.count ?? 0
        const ncsParaRanking = ncsParaRankingRes.data || []
        const ncsTodasPeriodo = ncsTodasPeriodoRes.data || []

        // Itens de execução do período e cálculo de conformidades
        let totalItensConformes = 0
        let totalItens = 0
        let rondasSemNcNoPeriodo = 0
        let itensPeriodoData: any[] = []

        if (rondasData.length > 0) {
          const execIds = rondasData.map((e: any) => e.id)
          const { data: itensPeriodo } = await supabase
            .from('itens_execucao_checklist')
            .select('id, execucao_id, resposta')
            .in('execucao_id', execIds)

          if (itensPeriodo) {
            itensPeriodoData = itensPeriodo
            totalItens = itensPeriodo.length
            totalItensConformes = itensPeriodo.filter((i: any) => i.resposta === 'conforme').length

            // Identificar quais execuções tiveram qualquer Não Conformidade
            const execucoesComNc = new Set(
              itensPeriodo
                .filter((i: any) => i.resposta === 'nao_conforme')
                .map((i: any) => i.execucao_id)
            )
            rondasSemNcNoPeriodo = rondasData.filter((r: any) => !execucoesComNc.has(r.id)).length
          }
        }

        // Ranking de Inspetores mais ativos no período
        const mapaInspetores = new Map<string, InspetorRanking>()
        rondasData.forEach((r: any) => {
          const uId = r.usuario_id
          if (!uId) return
          if (!mapaInspetores.has(uId)) {
            const uInfo = mapaUsuarios.get(uId)
            const nomeInsp = uInfo?.nome || (r.usuarios ? formatarNome(r.usuarios) : null) || 'Inspetor'
            mapaInspetores.set(uId, {
              usuarioId: uId,
              nome: nomeInsp,
              perfil: uInfo?.perfil || r.usuarios?.perfil || 'inspetor',
              avatarUrl: uInfo?.avatarUrl || r.usuarios?.avatar_url,
              totalRondas: 0,
              totalConformes: 0,
              totalNaoConformes: 0,
            })
          }
          mapaInspetores.get(uId)!.totalRondas++
        })

        if (itensPeriodoData.length > 0 && rondasData.length > 0) {
          const mapaExecucaoParaUsuario = new Map<string, string>()
          rondasData.forEach((r: any) => mapaExecucaoParaUsuario.set(r.id, r.usuario_id))

          itensPeriodoData.forEach((item: any) => {
            const uId = mapaExecucaoParaUsuario.get(item.execucao_id)
            if (uId && mapaInspetores.has(uId)) {
              if (item.resposta === 'conforme') {
                mapaInspetores.get(uId)!.totalConformes++
              } else if (item.resposta === 'nao_conforme') {
                mapaInspetores.get(uId)!.totalNaoConformes++
              }
            }
          })
        }

        const rankingInspetores = Array.from(mapaInspetores.values())
          .sort((a, b) => b.totalRondas - a.totalRondas || b.totalConformes - a.totalConformes)
          .slice(0, 3)

        // 10. Rondas recentes (últimas 5)
        const rondasOrdenadas = [...(todasExecucoes || [])].sort((a: any, b: any) => {
          const dtA = new Date(a.finalizado_em || a.iniciado_em || 0).getTime()
          const dtB = new Date(b.finalizado_em || b.iniciado_em || 0).getTime()
          return dtB - dtA
        }).slice(0, 5)

        // --- Processar dados ---

        // Ranking de ativos com mais NCs
        const contagemPorAtivo = new Map<string, { nomeAtivo: string; categoria: string; localNome: string; centroCirurgicoNome: string; quantidade: number }>()
        if (ncsParaRanking) {
          ncsParaRanking.forEach((nc: any) => {
            if (!nc.ativo_id || !nc.ativos) return
            const atual = contagemPorAtivo.get(nc.ativo_id)
            if (atual) {
              atual.quantidade++
            } else {
              contagemPorAtivo.set(nc.ativo_id, {
                nomeAtivo: nc.ativos.nome || 'Ativo',
                categoria: nc.ativos.categorias_ativos?.nome || 'Equipamento',
                localNome: nc.ativos.locais?.nome || 'Sala',
                centroCirurgicoNome: nc.ativos.locais?.centros_cirurgicos?.nome || 'Centro Cirúrgico',
                quantidade: 1,
              })
            }
          })
        }
        const rankingAtivos = Array.from(contagemPorAtivo.entries())
          .map(([ativoId, info]) => ({ ativoId, ...info, quantidadeNcs: info.quantidade }))
          .sort((a, b) => b.quantidadeNcs - a.quantidadeNcs)
          .slice(0, 5)

        // Tempo médio de resolução real (a partir das NCs encerradas)
        let tempoMedioResolucaoMs: number | null = null
        if (ncsEncerradasPeriodo && ncsEncerradasPeriodo.length > 0) {
          const tempos = ncsEncerradasPeriodo
            .map((nc: any) => {
              const dtFim = new Date(nc.atualizado_em || nc.updated_at || nc.criado_em).getTime()
              const dtIni = new Date(nc.criado_em).getTime()
              return Math.max(dtFim - dtIni, 0)
            })
            .filter((t: number) => t > 0)

          if (tempos.length > 0) {
            tempoMedioResolucaoMs = Math.round(tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length)
          }
        }

        let tempoMedioAnteriorMs: number | null = null
        if (ncsEncerradasAnterior && ncsEncerradasAnterior.length > 0) {
          const temposAnt = ncsEncerradasAnterior
            .map((nc: any) => {
              const dtFim = new Date(nc.atualizado_em || nc.updated_at || nc.criado_em).getTime()
              const dtIni = new Date(nc.criado_em).getTime()
              return Math.max(dtFim - dtIni, 0)
            })
            .filter((t: number) => t > 0)

          if (temposAnt.length > 0) {
            tempoMedioAnteriorMs = Math.round(temposAnt.reduce((a: number, b: number) => a + b, 0) / temposAnt.length)
          }
        }

        // NCs por criticidade
        const ncsPorCriticidade = { critico: 0, importante: 0, informativo: 0 }
        if (ncsTodasPeriodo) {
          ncsTodasPeriodo.forEach((nc: any) => {
            if (nc.criticidade in ncsPorCriticidade) {
              ncsPorCriticidade[nc.criticidade as keyof typeof ncsPorCriticidade]++
            }
          })
        }

        // Rondas por dia (agrupamento pelo timezone local da data)
        const diasPeriodoArr = gerarDiasNoPeriodo(periodo)
        const contagemPorDia = new Map<string, number>()
        rondasData.forEach((r: any) => {
          const dataRonda = r.finalizado_em || r.iniciado_em
          if (dataRonda) {
            const chave = formatarDataChaveLocal(new Date(dataRonda))
            contagemPorDia.set(chave, (contagemPorDia.get(chave) || 0) + 1)
          }
        })
        const rondasPorDia = diasPeriodoArr.map((d) => ({
          ...d,
          quantidade: contagemPorDia.get(d.data) || 0,
        }))

        // Rondas recentes formatadas
        const rondasRecentesFormatadas = rondasOrdenadas.map((r: any) => {
          const uInfo = mapaUsuarios.get(r.usuario_id)
          const nomeInsp = uInfo?.nome || (r.usuarios ? formatarNome(r.usuarios) : null) || 'Inspetor'
          return {
            id: r.id,
            inspetorNome: nomeInsp,
            nomeAtivo: r.ativos?.nome || 'Ativo',
            localNome: r.ativos?.locais?.nome || 'Local',
            centroCirurgicoNome: r.ativos?.locais?.centros_cirurgicos?.nome || 'Centro Cirúrgico',
            dataHora: r.finalizado_em || r.iniciado_em,
            status: r.status,
          }
        })

        const resultadoCalculado = {
          rondasNoPeriodo: rondasData.length,
          rondasSemNcNoPeriodo,
          ncsAbertasNoPeriodo: ncsAbertasCount || ncsAbertasPeriodoData?.length || 0,
          ncsEncerradasNoPeriodo: ncsEncerradasPeriodo?.length || 0,
          totalNcsAbertas: totalNcsAbertas || 0,
          totalItensConformes,
          totalItens,
          rankingAtivos,
          rankingInspetores,
          tempoMedioResolucaoMs,
          tempoMedioAnteriorMs,
          ncsPorCriticidade,
          rondasPorDia,
          rondasRecentes: rondasRecentesFormatadas,
        }

        setDados(resultadoCalculado)
        dadosCache.set(cacheKey, resultadoCalculado)
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
      } finally {
        setCarregando(false)
      }
    }

    carregarDados()
  }, [hospitalId, periodo, cacheKey])

  // Taxa de itens aprovados (Opção 3)
  const taxaItensAprovados = useMemo(() => {
    if (!dados || dados.totalItens === 0) return null
    return Math.round((dados.totalItensConformes / dados.totalItens) * 100)
  }, [dados])

  // Taxa de rondas sem falhas (Opção 2)
  const taxaRondasSemFalhas = useMemo(() => {
    if (!dados || dados.rondasNoPeriodo === 0) return null
    return Math.round((dados.rondasSemNcNoPeriodo / dados.rondasNoPeriodo) * 100)
  }, [dados])

  // Taxa de controle não-crítico
  const taxaNaoCritica = useMemo(() => {
    if (!dados || dados.ncsAbertasNoPeriodo === 0) return 100
    const criticas = dados.ncsPorCriticidade.critico
    const naoCriticas = Math.max(dados.ncsAbertasNoPeriodo - criticas, 0)
    return Math.round((naoCriticas / dados.ncsAbertasNoPeriodo) * 100)
  }, [dados])

  const labelPeriodo = periodo === '7d' ? '7 dias' : periodo === '15d' ? '15 dias' : '30 dias'

  const maxRondasDia = useMemo(() => {
    if (!dados) return 1
    const max = Math.max(...dados.rondasPorDia.map((d) => d.quantidade), 1)
    return max
  }, [dados])

  // Tendência do tempo de resolução
  const tendenciaResolucao = useMemo(() => {
    if (!dados || dados.tempoMedioResolucaoMs === null || dados.tempoMedioAnteriorMs === null) return null
    if (dados.tempoMedioAnteriorMs === 0) return null
    const diff = dados.tempoMedioResolucaoMs - dados.tempoMedioAnteriorMs
    if (Math.abs(diff) < 60000) return 'estavel'
    return diff > 0 ? 'piorou' : 'melhorou'
  }, [dados])

  if (carregando) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="bg-white rounded-[24px] p-5 border border-gray-100/80 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="py-12 px-6 bg-white rounded-[28px] border border-gray-100/80 text-center space-y-4">
        <p className="text-sm text-gray-500 font-semibold">Erro ao carregar dados do dashboard.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtro Temporal */}
      <div className="bg-[#F1F3F6] p-1 rounded-full flex gap-1 select-none">
        {([
          { id: '7d', label: '7 dias' },
          { id: '15d', label: '15 dias' },
          { id: '30d', label: '30 dias' },
        ] as { id: PeriodoFiltro; label: string }[]).map((opt) => {
          const ativo = periodo === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setPeriodo(opt.id)}
              className={[
                'flex-1 text-center py-2 px-3 text-[11px] font-bold tracking-tight rounded-full transition-all duration-200 cursor-pointer active:scale-95',
                ativo
                  ? 'bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                  : 'text-gray-500 hover:text-slate-800',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          PAINEL DE ANÉIS LIMPO & MODERNO (APPLE HEALTH STYLE)
         ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[24px] p-5 border border-slate-100/90 shadow-[var(--shadow-card)] space-y-4">
        {/* Cabeçalho Limpo */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
          <div>
            <h2 className="text-[13.5px] font-extrabold text-slate-900 tracking-tight leading-none">
              Indicadores de Prontidão
            </h2>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Desempenho operacional em {labelPeriodo}
            </p>
          </div>

          {/* Badges de Resumo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 font-bold font-nunito text-[10.5px] px-2.5 py-1 rounded-full border border-slate-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {dados.rondasNoPeriodo} rondas
            </span>
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 font-bold font-nunito text-[10.5px] px-2.5 py-1 rounded-full border border-rose-100/80">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {dados.ncsAbertasNoPeriodo} NCs
            </span>
          </div>
        </div>

        {/* Trio de Indicadores Circulares com Layout Limpo */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 pt-1">
          {/* Indicador 1: Rondas Conformes */}
          <div className="flex flex-col items-center text-center px-1">
            <AnelCircular3D
              porcentagem={taxaRondasSemFalhas}
              gradienteId="gradRondasOk"
              corInicio="#84CC16"
              corFim="#10B981"
              tamanho={72}
              espessura={6}
            />
            <h4 className="text-[11.5px] font-bold text-slate-800 mt-2 leading-tight">
              Rondas 100% OK
            </h4>
            <span className="text-[10px] font-black font-nunito text-emerald-600 mt-0.5">
              {dados.rondasSemNcNoPeriodo} de {dados.rondasNoPeriodo}
            </span>
          </div>

          {/* Indicador 2: Itens Aprovados */}
          <div className="flex flex-col items-center text-center px-1">
            <AnelCircular3D
              porcentagem={taxaItensAprovados}
              gradienteId="gradItensAprovados"
              corInicio="#38BDF8"
              corFim="#6366F1"
              tamanho={72}
              espessura={6}
            />
            <h4 className="text-[11.5px] font-bold text-slate-800 mt-2 leading-tight">
              Itens Aprovados
            </h4>
            <span className="text-[10px] font-black font-nunito text-indigo-600 mt-0.5">
              {dados.totalItensConformes} de {dados.totalItens}
            </span>
          </div>

          {/* Indicador 3: Não-Críticas */}
          <div className="flex flex-col items-center text-center px-1">
            <AnelCircular3D
              porcentagem={taxaNaoCritica}
              gradienteId="gradNaoCritico"
              corInicio="#FBBF24"
              corFim="#F97316"
              tamanho={72}
              espessura={6}
            />
            <h4 className="text-[11.5px] font-bold text-slate-800 mt-2 leading-tight">
              Não-Críticas
            </h4>
            <span className="text-[10px] font-black font-nunito text-amber-600 mt-0.5">
              {Math.max(dados.ncsAbertasNoPeriodo - dados.ncsPorCriticidade.critico, 0)} de {dados.ncsAbertasNoPeriodo}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          RANKING DE ATIVOS COM MAIS NCs (BARRA 3D SUAVE)
         ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-[14px] font-extrabold text-gray-900 tracking-tight leading-none">
                Ativos com Mais NCs
              </h3>
              <p className="text-[10px] text-gray-400 font-medium mt-1">
                Frequência de não conformidades por equipamento
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 shrink-0">
            {labelPeriodo}
          </span>
        </div>

        {dados.rankingAtivos.length > 0 ? (
          <div className="space-y-3.5">
            {dados.rankingAtivos.map((ativo, idx) => {
              const maxNcs = dados.rankingAtivos[0]?.quantidadeNcs || 1
              const proporcao = (ativo.quantidadeNcs / maxNcs) * 100

              return (
                <div
                  key={ativo.ativoId}
                  className="bg-gray-50/60 rounded-2xl p-3.5 border border-gray-100/80 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-gradient-to-b from-white to-gray-50 border border-gray-200/90 flex items-center justify-center text-[10px] font-black font-nunito text-gray-700 shrink-0 shadow-[0_1.5px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]">
                        {idx + 1}º
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate leading-tight">
                          {ativo.nomeAtivo}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                          {ativo.localNome} · {ativo.centroCirurgicoNome}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-black font-nunito text-red-600 bg-gradient-to-b from-red-50 to-red-100/70 border border-red-200/70 shadow-[0_1px_3px_rgba(220,38,38,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] px-2.5 py-1 rounded-full shrink-0">
                      {ativo.quantidadeNcs} NC{ativo.quantidadeNcs !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Barra de Proporção com Efeito 3D Suave */}
                  <div className="space-y-1">
                    <div className="w-full h-2.5 bg-gray-200/80 rounded-full overflow-hidden p-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] border border-gray-200/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-red-500 shadow-[0_1.5px_4px_rgba(239,68,68,0.35),inset_0_1px_0.5px_rgba(255,255,255,0.5)] transition-all duration-500"
                        style={{ width: `${Math.max(proporcao, 8)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <svg className="w-6 h-6 text-gray-300 mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px] text-gray-400 font-medium">
              Nenhuma não conformidade registrada em {labelPeriodo}.
            </p>
          </div>
        )}
      </div>

      {/* Tempo Médio de Resolução + NCs por Criticidade */}
      <div className="grid grid-cols-2 gap-2">
        {/* Tempo Médio */}
        <div className="bg-white rounded-[24px] p-4 border border-gray-100 shadow-[var(--shadow-card)]">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Tempo Médio</span>
          <p className="text-[9px] text-gray-400 font-medium -mt-0.5">de resolução</p>
          <p className="text-[20px] font-black font-nunito text-gray-900 mt-2 leading-none">
            {dados.tempoMedioResolucaoMs !== null ? formatarDuracao(dados.tempoMedioResolucaoMs) : '—'}
          </p>
          {tendenciaResolucao && (
            <div className={`mt-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold font-nunito px-1.5 py-0.5 rounded-full ${tendenciaResolucao === 'melhorou' ? 'bg-emerald-50 text-emerald-600' :
              tendenciaResolucao === 'piorou' ? 'bg-red-50 text-red-500' :
                'bg-gray-50 text-gray-400'
              }`}>
              {tendenciaResolucao === 'melhorou' ? '↓' : tendenciaResolucao === 'piorou' ? '↑' : '→'}
              {tendenciaResolucao === 'melhorou' ? ' Melhorou' : tendenciaResolucao === 'piorou' ? ' Piorou' : ' Estável'}
            </div>
          )}
        </div>

        {/* NCs por Criticidade */}
        <div className="bg-white rounded-[24px] p-4 border border-gray-100 shadow-[var(--shadow-card)]">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">NCs por Criticidade</span>
          <p className="text-[9px] text-gray-400 font-medium -mt-0.5">em {labelPeriodo}</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span className="text-[10px] text-gray-600 font-medium flex-1">Crítico</span>
              <span className="text-[11.5px] font-black font-nunito text-gray-900">{dados.ncsPorCriticidade.critico}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[10px] text-gray-600 font-medium flex-1">Importante</span>
              <span className="text-[11.5px] font-black font-nunito text-gray-900">{dados.ncsPorCriticidade.importante}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              <span className="text-[10px] text-gray-600 font-medium flex-1">Informativo</span>
              <span className="text-[11.5px] font-black font-nunito text-gray-900">{dados.ncsPorCriticidade.informativo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          ATIVIDADE DE RONDAS (RONDAS CONCLUÍDAS POR DIA)
         ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-extrabold text-gray-900 tracking-tight leading-none">
              Atividade de Rondas
            </h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">
              Rondas de inspeção concluídas por dia
            </p>
          </div>
          <span className="text-[10px] font-bold font-nunito text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 shrink-0">
            {dados.rondasNoPeriodo} concluída{dados.rondasNoPeriodo !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="pt-2 pb-1">
          <div className="flex items-end gap-1.5" style={{ height: '110px' }}>
            {dados.rondasPorDia.map((dia, idx) => {
              const altura = maxRondasDia > 0 ? (dia.quantidade / maxRondasDia) * 100 : 0
              const hojeLocal = formatarDataChaveLocal(new Date())
              const ehHoje = dia.data === hojeLocal
              const temRonda = dia.quantidade > 0
              const mostrarLabel = periodo === '7d' || idx % (periodo === '15d' ? 2 : 4) === 0

              return (
                <div
                  key={dia.data}
                  className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group"
                >
                  {/* Número de rondas */}
                  <span
                    className={`text-[9.5px] font-black font-nunito leading-none transition-colors ${temRonda ? 'text-gray-800 font-black' : 'text-transparent group-hover:text-gray-300'
                      }`}
                  >
                    {dia.quantidade}
                  </span>

                  {/* Barra 3D */}
                  <div className="w-full bg-gray-100/90 rounded-t-lg h-[70px] flex items-end overflow-hidden p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                    <div
                      className={`w-full rounded-md transition-all duration-500 ${ehHoje && temRonda
                        ? 'bg-gradient-to-t from-[#7C3AED] to-[#A78BFA] shadow-[0_2px_6px_rgba(124,58,237,0.4),inset_0_1px_0.5px_rgba(255,255,255,0.5)]'
                        : temRonda
                          ? 'bg-gradient-to-t from-blue-500 to-sky-400 shadow-[0_2px_5px_rgba(59,130,246,0.35),inset_0_1px_0.5px_rgba(255,255,255,0.5)]'
                          : 'bg-transparent'
                        }`}
                      style={{
                        height: temRonda ? `${Math.max(altura, 14)}%` : '0%',
                      }}
                    />
                  </div>

                  {/* Rótulo do dia */}
                  {mostrarLabel && (
                    <div className="flex flex-col items-center leading-none">
                      <span className={`text-[8px] font-bold ${ehHoje ? 'text-[#7C3AED]' : 'text-gray-400'}`}>
                        {dia.diaSemana}
                      </span>
                      <span className={`text-[7.5px] font-semibold mt-0.5 ${ehHoje ? 'text-[#7C3AED] font-black' : 'text-gray-300'}`}>
                        {dia.diaNumero}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PÓDIO LEADERBOARD DE INSPETORES (MONOCROMÁTICO APPLE)
         ══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-[28px] p-5 border border-gray-100 shadow-[var(--shadow-card)] space-y-4">
        {/* Header do Card */}
        <div className="flex items-center justify-between pb-1 border-b border-gray-100/80">
          <div>
            <h3 className="text-[14px] font-black text-gray-900 tracking-tight leading-none">
              Inspetores Mais Ativos
            </h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">
              Top 3 em rondas concluídas em {labelPeriodo}
            </p>
          </div>
          <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100 shrink-0">
            {labelPeriodo}
          </span>
        </div>

        {/* Bloco do Pódio Físico Monocromático (1º - 2º - 3º) */}
        {dados.rankingInspetores.length > 0 ? (
          <div className="pt-3 pb-1 space-y-3">
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
              {/* 1º Lugar (Esquerda - Mais Alto) */}
              <ColunaPodio
                posicao={1}
                inspetor={dados.rankingInspetores[0]}
                alturaPilar="h-[106px]"
              />

              {/* 2º Lugar (Centro - Altura Média) */}
              <ColunaPodio
                posicao={2}
                inspetor={dados.rankingInspetores[1]}
                alturaPilar="h-[76px]"
              />

              {/* 3º Lugar (Direita - Menor Altura) */}
              <ColunaPodio
                posicao={3}
                inspetor={dados.rankingInspetores[2]}
                alturaPilar="h-[56px]"
              />
            </div>

            {/* Legenda dos Indicadores em Uma Palavra */}
            <div className="flex items-center justify-center gap-3 pt-2.5 border-t border-gray-100/80 text-[10px] font-semibold text-gray-400 select-none">
              <span className="inline-flex items-center gap-1">
                <span className="text-[11px] font-black text-emerald-600">✓</span> Itens Conformes
              </span>
              <span className="text-gray-200">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="text-[11px] font-black text-red-500">✕</span> Itens Não Conformes
              </span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-[11px] text-gray-400 font-medium">
              Nenhuma ronda realizada em {labelPeriodo}.
            </p>
          </div>
        )}
      </div>

      {/* Rondas Recentes */}
      {dados.rondasRecentes.length > 0 && (
        <div className="bg-white rounded-[24px] p-5 border border-gray-100 shadow-[var(--shadow-card)]">
          <h3 className="text-[14px] font-extrabold text-gray-900 tracking-tight mb-3">Rondas Recentes</h3>
          <div className="space-y-3">
            {dados.rondasRecentes.map((ronda) => {
              const dataObj = ronda.dataHora ? new Date(ronda.dataHora) : null
              const hora = dataObj
                ? dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : ''
              const dia = dataObj
                ? dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                : ''

              return (
                <div key={ronda.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-extrabold text-blue-600 shrink-0">
                    {ronda.inspetorNome.replace(/^(Enf\.|Eng\.|Coord\.)\s*/i, '').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-900 truncate">{ronda.inspetorNome}</p>
                    <p className="text-[10px] text-gray-400 font-medium truncate">
                      {ronda.nomeAtivo} · {ronda.localNome}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold font-nunito text-gray-600">{hora}</p>
                    <p className="text-[9px] font-bold font-nunito text-gray-400">{dia}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cobertura de Setores Técnicos */}
      <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[var(--shadow-card)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-extrabold text-slate-900 tracking-tight">Cobertura por Setor Técnico</h3>
            <p className="text-[10.5px] text-slate-400 font-medium">Status de atendimento e roteamento de NCs</p>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-full">
            {TODOS_SETORES.length} Setores
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TODOS_SETORES.map((setor) => {
            const temTecnico = verificarTecnicoAtivo(setor as SetorTecnico)
            const style = SETORES_CORES[setor as SetorTecnico]

            return (
              <div
                key={setor}
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${temTecnico ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-orange-400'}`} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate">
                      {SETORES_LABELS[setor as SetorTecnico]}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {temTecnico ? 'Técnico ativo' : 'Assumido pela Coordenação'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${
                    temTecnico
                      ? `${style.bg} ${style.text} ${style.border}`
                      : 'bg-orange-50 text-orange-600 border-orange-200/80'
                  }`}
                >
                  {temTecnico ? 'Fluxo Direto' : 'Resolução Coord.'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
