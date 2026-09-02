'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { PillTag } from '@/components/ui/PillTag'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { dadosCache } from '@/lib/cache/dadosCache'
import { SETORES_LABELS, TIPOS_NC_LABELS, SETORES_CORES } from '@/lib/roteamentoNC'
import type { StatusNaoConformidade, CriticidadeItem, SetorTecnico, TipoNaoConformidade } from '@/lib/supabase/types'

const CRITICIDADE_ORDEM: Record<CriticidadeItem, number> = {
  critico: 0,
  importante: 1,
  informativo: 2,
}

const STATUS_CORES: Record<StatusNaoConformidade, 'azul' | 'laranja' | 'verde' | 'vermelho' | 'cinza'> = {
  aberta: 'vermelho',
  em_analise: 'azul',
  em_correcao: 'laranja',
  aguardando_validacao: 'verde',
  encerrada: 'cinza',
  correcao_recusada: 'vermelho',
}

const STATUS_LABELS: Record<StatusNaoConformidade, string> = {
  aberta: 'Aberta',
  em_analise: 'Em Resolução',
  em_correcao: 'Em Correção',
  aguardando_validacao: 'Aguardando Validação',
  encerrada: 'Encerrada',
  correcao_recusada: 'Correção Recusada',
}

export default function FilaNCs() {
  const router = useRouter()
  const cacheKey = 'engenharia_ncs_lista'
  const [ncs, setNcs] = useState<any[]>(() => dadosCache.get<any[]>(cacheKey) || [])
  const [termoBusca, setTermoBusca] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'minhas' | 'sem_responsavel' | 'aguardando' | 'todas'>('pendentes')
  const [usuario, setUsuario] = useState({ id: '', nome: '', setor: null as SetorTecnico | null })
  const [carregando, setCarregando] = useState(() => !dadosCache.get(cacheKey))

  useEffect(() => {
    async function carregarDados() {
      if (!dadosCache.get(cacheKey)) {
        setCarregando(true)
      }
      try {
        const supabase = criarClienteSupabase() as any
        
        let currentUser = null
        const stored = (localStorage.getItem('primus_usuario_atual') || localStorage.getItem('argus_usuario_atual'))
        if (stored) {
          try {
            currentUser = JSON.parse(stored)
          } catch (e) {
            console.error(e)
          }
        }
        
        if (!currentUser) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('usuarios')
              .select('id, nome, perfil, hospital_id')
              .eq('id', user.id)
              .single()
            if (profile) {
              currentUser = profile
            }
          }
        }

        if (currentUser) {
          const setorUsuario = currentUser.setor || (currentUser.perfil === 'engenharia_clinica' ? 'engenharia_clinica' : null)
          setUsuario({ id: currentUser.id, nome: currentUser.nome, setor: setorUsuario as SetorTecnico | null })
          
          let hospitalId = currentUser.hospital_id
          if (!hospitalId) {
            hospitalId = 'e632822a-0000-0000-0000-000000000001'
          }

          // Executar busca de usuários e NCs em PARALELO (Promise.all)
          const [usuariosRes, ncsRes] = await Promise.all([
            supabase
              .from('usuarios')
              .select('id, nome')
              .eq('hospital_id', hospitalId),
            supabase
              .from('nao_conformidades')
              .select('*, ativos(*, categorias_ativos(*), locais(*, centros_cirurgicos(*, unidades(*)))), itens_execucao_checklist(*)')
              .eq('hospital_id', hospitalId)
          ])

          const usuariosData = usuariosRes.data
          const ncsData = ncsRes.data
          
          const usuariosMapa = new Map()
          if (usuariosData) {
            usuariosData.forEach((u: any) => usuariosMapa.set(u.id, u.nome))
          }

          if (ncsData) {
            const formatadas = ncsData.map((nc: any) => {
              const localAtivo = nc.ativos?.locais || {}
              const centroCirurgico = localAtivo.centros_cirurgicos || {}
              const unidade = centroCirurgico.unidades || {}
              const itemExec = nc.itens_execucao_checklist || {}

              return {
                id: nc.id,
                numero_unico: nc.numero_unico || `NC-${nc.criado_em ? new Date(nc.criado_em).getFullYear() : '2026'}-${nc.id.substring(0, 4).toUpperCase()}`,
                descricao: itemExec.evidencia_texto || 'Não conformidade registrada no checklist.',
                criticidade: nc.criticidade,
                status: nc.status,
                prazo: nc.prazo,
                created_at: nc.criado_em,
                ativo: nc.ativos ? {
                  id: nc.ativos.id,
                  nome: nc.ativos.nome,
                  categoria: nc.ativos.categorias_ativos?.nome || 'Equipamento',
                  status: nc.ativos.status,
                  codigo_qr: nc.ativos.codigo_qr,
                  patrimonio: nc.ativos.patrimonio,
                } : null,
                local: {
                  nome: localAtivo.nome || 'Sala',
                  unidade: unidade.nome || 'Unidade',
                  centro_cirurgico: centroCirurgico.nome || 'Centro Cirúrgico',
                  hospital: 'Hospital'
                },
                responsavel_nome: usuariosMapa.get(nc.responsavel_id) || null,
                responsavel_id: nc.responsavel_id,
                tipo: nc.tipo || 'equipamento',
                setor_responsavel: nc.setor_responsavel || null,
              }
            })
            setNcs(formatadas)
            dadosCache.set(cacheKey, formatadas)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregarDados()
  }, [cacheKey])

  // Função para calcular tempo decorrido
  function calcularTempoDesdeAbertura(dataCriacao: string) {
    const criada = new Date(dataCriacao)
    const agora = new Date()
    const diffMs = agora.getTime() - criada.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMins / 60)
    const diffDias = Math.floor(diffHoras / 24)

    if (diffMins < 60) {
      return `Há ${diffMins} min`
    } else if (diffHoras < 24) {
      return `Há ${diffHoras} h`
    } else {
      return `Há ${diffDias} d`
    }
  }

  // Filtragem e Ordenação
  const ncsFiltradas = ncs
    .filter((nc) => {
      // 1. Filtro por Busca
      const termo = termoBusca.toLowerCase()
      const matchBusca =
        nc.numero_unico.toLowerCase().includes(termo) ||
        (nc.ativo?.nome ?? '').toLowerCase().includes(termo) ||
        nc.local.nome.toLowerCase().includes(termo) ||
        nc.local.centro_cirurgico.toLowerCase().includes(termo) ||
        nc.descricao.toLowerCase().includes(termo)

      if (!matchBusca) return false

      // 2. Filtro por Aba/Filtro Perfil
      switch (abaAtiva) {
        case 'pendentes':
          // Aberta, Em análise, Em correção ou Correção Recusada, pertencentes ao usuário ou sem responsável
          return (
            (nc.status === 'aberta' || nc.status === 'em_analise' || nc.status === 'em_correcao' || nc.status === 'correcao_recusada') &&
            (nc.responsavel_id === null || nc.responsavel_id === usuario.id)
          )
        case 'minhas':
          // Sob responsabilidade do usuário e não encerradas
          return nc.responsavel_id === usuario.id && nc.status !== 'encerrada'
        case 'sem_responsavel':
          // Sem nenhum responsável e não encerradas
          return nc.responsavel_id === null && nc.status !== 'encerrada'
        case 'aguardando':
          // Aguardando validação do Coordenador
          return nc.status === 'aguardando_validacao'
        case 'todas':
        default:
          return true
      }
    })
    .sort((a, b) => {
      // 1. Criticidade primeiro (Crítico -> Importante -> Informativo)
      const pesoA = CRITICIDADE_ORDEM[a.criticidade as CriticidadeItem] ?? 99
      const pesoB = CRITICIDADE_ORDEM[b.criticidade as CriticidadeItem] ?? 99
      if (pesoA !== pesoB) return pesoA - pesoB

      // 2. Prazos menores (mais próximos) primeiro
      const prazoA = a.prazo ? new Date(a.prazo).getTime() : Infinity
      const prazoB = b.prazo ? new Date(b.prazo).getTime() : Infinity
      return prazoA - prazoB
    })

  return (
    <div className="px-5 pt-3 pb-24 space-y-5">
      {/* Título de Boas Vindas */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Painel de Atendimento
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Fila de Não Conformidades{usuario.setor ? ` — ${SETORES_LABELS[usuario.setor]}` : ' da Engenharia Clínica'}
        </p>
      </div>

      {/* Seletor de Abas (Visual Apple) */}
      <div className="bg-[#F1F3F6] p-1 rounded-full flex gap-1 overflow-x-auto scrollbar-none shrink-0 select-none">
        {[
          { id: 'pendentes', label: 'Pendentes' },
          { id: 'minhas', label: 'Minhas' },
          { id: 'sem_responsavel', label: 'Sem Resp.' },
          { id: 'aguardando', label: 'Validando' },
          { id: 'todas', label: 'Todas' },
        ].map((tab) => {
          const ativa = abaAtiva === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id as any)}
              className={[
                'flex-1 text-center py-2 px-3 text-[11px] font-bold tracking-tight rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95',
                ativa
                  ? 'bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                  : 'text-gray-500 hover:text-slate-800',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Barra de Busca */}
      <BarraBusca
        placeholder="Buscar por NC, ativo ou local..."
        valor={termoBusca}
        aoMudar={setTermoBusca}
      />

      {/* Contador de Itens */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Não Conformidades ({ncsFiltradas.length})
        </span>
      </div>

      {/* Lista de NCs */}
      {carregando ? (
        <div className="text-center py-12 text-sm text-gray-400 font-semibold animate-pulse">
          Carregando não conformidades...
        </div>
      ) : ncsFiltradas.length > 0 ? (
        <div className="space-y-3.5">
          {ncsFiltradas.map((nc, idx) => {
            const corCriticidade =
              nc.criticidade === 'critico'
                ? 'vermelho'
                : nc.criticidade === 'importante'
                ? 'laranja'
                : 'azul'

            const corStatus = STATUS_CORES[nc.status as StatusNaoConformidade]
            const labelStatus = STATUS_LABELS[nc.status as StatusNaoConformidade]

            return (
              <div
                key={nc.id}
                onClick={() => router.push(`/nao-conformidades/${nc.id}`)}
                className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100 hover:border-gray-200/80 transition-all cursor-pointer active:scale-[0.99] select-none"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="space-y-3">
                  {/* Cabeçalho do Card (NC Num + Criticidade + Tempo) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#246BFD] bg-[#246BFD]/5 px-2.5 py-1 rounded-full border border-[#246BFD]/10">
                        {nc.numero_unico}
                      </span>
                      <PillTag cor={corCriticidade}>
                        {nc.criticidade === 'critico' ? 'Crítico' : nc.criticidade === 'importante' ? 'Importante' : 'Informativo'}
                      </PillTag>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {calcularTempoDesdeAbertura(nc.created_at)}
                    </span>
                  </div>

                  {/* Informações Principais (Ativo e Localização) */}
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-900 leading-snug tracking-tight">
                      {nc.ativo?.nome || nc.item_execucao.item_congelado || 'Equipamento não especificado'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1 font-normal">
                      <span>{nc.local.unidade}</span>
                      <span>·</span>
                      <span className="font-medium text-gray-500">{nc.local.nome}</span>
                    </div>
                  </div>

                  {/* Descrição curta */}
                  <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">
                    {nc.descricao}
                  </p>

                  {/* Pill de Tipo/Setor */}
                  {nc.tipo && nc.tipo !== 'equipamento' && (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        nc.setor_responsavel && SETORES_CORES[nc.setor_responsavel as SetorTecnico]
                          ? `${SETORES_CORES[nc.setor_responsavel as SetorTecnico].bg} ${SETORES_CORES[nc.setor_responsavel as SetorTecnico].text} ${SETORES_CORES[nc.setor_responsavel as SetorTecnico].border}`
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {TIPOS_NC_LABELS[nc.tipo as TipoNaoConformidade] || nc.tipo}
                      </span>
                    </div>
                  )}

                  {/* Rodapé do Card (Responsável + Status) */}
                  <div className="h-px bg-gray-100 pt-1" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold flex items-center justify-center text-gray-500">
                        {nc.responsavel_nome ? nc.responsavel_nome.substring(0, 2).toUpperCase() : 'EC'}
                      </div>
                      <span className="text-[11px] font-medium text-gray-500">
                        {nc.responsavel_nome || 'Sem responsável'}
                      </span>
                    </div>
                    <PillTag cor={corStatus}>
                      {labelStatus}
                    </PillTag>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Estado Vazio */
        <div className="py-12 px-6 bg-white rounded-[28px] border border-gray-100/80 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900">
              Nenhuma não conformidade pendente
            </h3>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
              Excelente! Todos os ativos estão operacionais ou já foram encaminhados para validação.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
