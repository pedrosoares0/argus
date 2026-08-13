'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { PillTag } from '@/components/ui/PillTag'
import { criarClienteSupabase } from '@/lib/supabase/client'
import type { StatusNaoConformidade, CriticidadeItem } from '@/lib/supabase/types'

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
  em_analise: 'Em Análise',
  em_correcao: 'Em Correção',
  aguardando_validacao: 'Aguardando Validação',
  encerrada: 'Encerrada',
  correcao_recusada: 'Correção Recusada',
}

export default function FilaValidacao() {
  const router = useRouter()
  const [ncs, setNcs] = useState<any[]>([])
  const [termoBusca, setTermoBusca] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<'aguardando' | 'resolucao' | 'encerradas' | 'todas'>('aguardando')
  const [usuario, setUsuario] = useState({ id: '', nome: '' })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarDados() {
      try {
        const supabase = criarClienteSupabase() as any
        
        let currentUser = null
        const stored = localStorage.getItem('argus_usuario_atual')
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
          setUsuario({ id: currentUser.id, nome: currentUser.nome })
          
          let hospitalId = currentUser.hospital_id
          if (!hospitalId) {
            const { data: profile } = await supabase
              .from('usuarios')
              .select('hospital_id')
              .eq('id', currentUser.id)
              .single()
            if (profile) {
              hospitalId = profile.hospital_id
            }
          }
          
          if (!hospitalId) {
            hospitalId = 'e632822a-0000-0000-0000-000000000001'
          }

          // Buscar usuários para resolver o nome do responsável
          const { data: usuariosData } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('hospital_id', hospitalId)
          
          const usuariosMapa = new Map()
          if (usuariosData) {
            usuariosData.forEach((u: any) => usuariosMapa.set(u.id, u.nome))
          }

          // Buscar as NCs do banco real
          const { data: ncsData } = await supabase
            .from('nao_conformidades')
            .select('*, ativos(*, categorias_ativos(*), locais(*, centros_cirurgicos(*, unidades(*)))), itens_execucao_checklist(*)')
            .eq('hospital_id', hospitalId)

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
              }
            })
            setNcs(formatadas)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregarDados()
  }, [])

  // Calcula tempo desde abertura
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

  // Tempo restante do prazo
  function calcularTempoRestante(prazo: string | null) {
    if (!prazo) return null
    const agora = new Date()
    const limite = new Date(prazo)
    const diffMs = limite.getTime() - agora.getTime()
    if (diffMs <= 0) return 'Vencido'
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffMins = Math.floor((diffMs % 3600000) / 60000)
    if (diffHoras >= 24) return `${Math.floor(diffHoras / 24)}d ${diffHoras % 24}h restantes`
    if (diffHoras > 0) return `${diffHoras}h ${diffMins}min restantes`
    return `${diffMins}min restantes`
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

      // 2. Filtro por Aba
      switch (abaAtiva) {
        case 'aguardando':
          return nc.status === 'aguardando_validacao'
        case 'resolucao':
          return nc.status === 'aberta' || nc.status === 'em_andamento'
        case 'encerradas':
          return nc.status === 'encerrada'
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

  // Contagem rápida por aba
  const totalEmResolucao = ncs.filter((nc) => nc.status === 'aberta' || nc.status === 'em_andamento').length
  const totalAguardando = ncs.filter((nc) => nc.status === 'aguardando_validacao').length
  const totalEncerradas = ncs.filter((nc) => nc.status === 'encerrada').length

  return (
    <div className="px-5 pt-3 pb-24 space-y-5">
      {/* Título */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Validação de NCs
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Não conformidades aguardando sua validação
        </p>
      </div>

      {/* Atalho: QR Codes & Etiquetas */}
      <Link
        href="/coordenador/ativos"
        className="flex items-center gap-3.5 bg-white rounded-2xl p-3.5 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-[#7C3AED]/20 hover:shadow-[0_2px_12px_rgba(124,58,237,0.06)] transition-all group active:scale-[0.99] select-none"
      >
        <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/8 flex items-center justify-center shrink-0 group-hover:bg-[#7C3AED]/12 transition-colors">
          <svg className="w-5 h-5 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 8.25V4.875zM3.75 14.625c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125V18c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18v-3.375zM13.5 4.875c0-.621.504-1.125 1.125-1.125H18c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125h-3.375a1.125 1.125 0 01-1.125-1.125V4.875z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625v3.375c0 .621.504 1.125 1.125 1.125h1.5m0-5.625v5.625m0 0H18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-1.875m0 2.625V14.625" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-gray-900 tracking-tight">QR Codes & Etiquetas</h3>
          <p className="text-[11px] text-gray-400 font-medium">Gerar, visualizar e imprimir etiquetas dos ativos</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#7C3AED]/50 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>

      {/* Contador resumo */}
      <div className="flex gap-2">
        <div className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Em Resolução</span>
            <div className="w-6.5 h-6.5 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-extrabold text-gray-900 mt-1">{totalEmResolucao}</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Aguardando</span>
            <div className="w-6.5 h-6.5 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-extrabold text-gray-900 mt-1">{totalAguardando}</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Encerradas</span>
            <div className="w-6.5 h-6.5 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-extrabold text-gray-900 mt-1">{totalEncerradas}</p>
        </div>
      </div>

      {/* Seletor de Abas (Visual Apple) */}
      <div className="bg-[#F1F3F6] p-1 rounded-full flex gap-1 overflow-x-auto scrollbar-none shrink-0 select-none">
        {[
          { id: 'aguardando', label: 'Aguardando' },
          { id: 'resolucao', label: 'Em Resolução' },
          { id: 'encerradas', label: 'Encerradas' },
          { id: 'todas', label: 'Todas' },
        ].map((tab) => {
          const ativa = abaAtiva === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id as typeof abaAtiva)}
              className={[
                'flex-1 text-center py-2 px-2.5 text-[10px] font-bold tracking-tight rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95',
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
            const tempoRestante = calcularTempoRestante(nc.prazo)
            const vencido = tempoRestante === 'Vencido'

            return (
              <div
                key={nc.id}
                onClick={() => router.push(`/nao-conformidades/${nc.id}/validar`)}
                className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100 hover:border-gray-200/80 transition-all cursor-pointer active:scale-[0.99] select-none"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="space-y-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#7C3AED] bg-[#7C3AED]/5 px-2.5 py-1 rounded-full border border-[#7C3AED]/10">
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

                  {/* Informações Principais */}
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

                  {/* Prazo */}
                  {tempoRestante && nc.status !== 'encerrada' && (
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${vencido ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {tempoRestante}
                    </div>
                  )}

                  {/* Rodapé do Card */}
                  <div className="h-px bg-gray-100 pt-1" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gray-100 text-[10px] font-bold flex items-center justify-center text-gray-500">
                        {nc.responsavel_nome ? nc.responsavel_nome.substring(0, 2).toUpperCase() : '??'}
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
          <div className="mx-auto w-16 h-16 rounded-full bg-[#7C3AED]/5 flex items-center justify-center text-[#7C3AED]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900">
              {abaAtiva === 'aguardando'
                ? 'Nenhuma NC aguardando validação'
                : abaAtiva === 'encerradas'
                ? 'Nenhuma NC encerrada'
                : 'Nenhuma NC encontrada'}
            </h3>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
              {abaAtiva === 'aguardando'
                ? 'Excelente! Todas as correções foram validadas ou estão em andamento na Engenharia Clínica.'
                : 'Nenhum resultado para o filtro selecionado.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
