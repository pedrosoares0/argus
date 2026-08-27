'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { PillTag } from '@/components/ui/PillTag'
import { AvatarPerfil } from '@/components/ui/Avatar'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { dadosCache } from '@/lib/cache/dadosCache'
import { SETORES_LABELS, TIPOS_NC_LABELS, SETORES_CORES, verificarTecnicoAtivo } from '@/lib/roteamentoNC'
import type { StatusNaoConformidade, CriticidadeItem, SetorTecnico, TipoNaoConformidade } from '@/lib/supabase/types'

const CRITICIDADE_ORDEM: Record<CriticidadeItem, number> = {
  critico: 0,
  importante: 1,
  informativo: 2,
}

interface FilaValidacaoNCsProps {
  hospitalId: string
  usuarioId: string
}

export function FilaValidacaoNCs({ hospitalId, usuarioId }: FilaValidacaoNCsProps) {
  const router = useRouter()
  const cacheKey = `coordenador_ncs_${hospitalId}`
  const [ncs, setNcs] = useState<any[]>(() => dadosCache.get<any[]>(cacheKey) || [])
  const [termoBusca, setTermoBusca] = useState('')
  const [abaAtiva, setAbaAtiva] = useState<'abertas' | 'aguardando' | 'encerradas'>('abertas')
  const [carregando, setCarregando] = useState(() => !dadosCache.get(cacheKey))

  useEffect(() => {
    async function carregarDados() {
      try {
        const supabase = criarClienteSupabase() as any

        // Helper para formatar nome
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

        // Executar busca de usuários e NCs em PARALELO (Promise.all)
        const [usuariosRes, ncsRes] = await Promise.all([
          supabase
            .from('usuarios')
            .select('id, nome, email, perfil'),
          supabase
            .from('nao_conformidades')
            .select('*, ativos(*, categorias_ativos(*), locais(*, centros_cirurgicos(*, unidades(*)))), itens_execucao_checklist(*, execucoes_checklist(usuario_id, usuarios(id, nome, email)))')
            .eq('hospital_id', hospitalId)
        ])

        const usuariosData = usuariosRes.data
        const ncsData = ncsRes.data

        const usuariosMapa = new Map()
        if (usuariosData) {
          usuariosData.forEach((u: any) => usuariosMapa.set(u.id, formatarNome(u)))
        }

        if (ncsData) {
          const formatadas = ncsData.map((nc: any) => {
            const localAtivo = nc.ativos?.locais || {}
            const centroCirurgico = localAtivo.centros_cirurgicos || {}
            const unidade = centroCirurgico.unidades || {}
            const itemExec = nc.itens_execucao_checklist || {}
            const execChecklist = itemExec.execucoes_checklist || {}
            const inspetorId = execChecklist?.usuario_id
            const inspetorNome = usuariosMapa.get(inspetorId) || (execChecklist.usuarios ? formatarNome(execChecklist.usuarios) : 'Inspetor')
            const responsavelNome = usuariosMapa.get(nc.responsavel_id) || null

            return {
              id: nc.id,
              numero_unico: nc.numero_unico || `NC-${nc.criado_em ? new Date(nc.criado_em).getFullYear() : '2026'}-${nc.id.substring(0, 4).toUpperCase()}`,
              descricao: itemExec.evidencia_texto || (typeof itemExec.item_congelado === 'string' ? itemExec.item_congelado : itemExec.item_congelado?.descricao) || 'Não conformidade registrada no checklist.',
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
                nome: localAtivo.nome || 'Sala 01',
                unidade: unidade.nome || 'Unidade de Internação',
                centro_cirurgico: centroCirurgico.nome || 'Centro Cirúrgico',
                hospital: 'Hospital'
              },
              responsavel_nome: responsavelNome,
              inspetor_nome: inspetorNome,
              tipo: nc.tipo || 'equipamento',
              setor_responsavel: nc.setor_responsavel || null,
            }
          })
          setNcs(formatadas)
          dadosCache.set(cacheKey, formatadas)
        }
      } catch (err) {
        console.error('Erro ao carregar NCs:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregarDados()
  }, [hospitalId, cacheKey])

  function calcularTempoDesdeAbertura(dataCriacao: string) {
    const criada = new Date(dataCriacao)
    const agora = new Date()
    const diffMs = agora.getTime() - criada.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMins / 60)
    const diffDias = Math.floor(diffHoras / 24)

    if (diffMins < 60) return `Há ${diffMins} min`
    if (diffHoras < 24) return `Há ${diffHoras} h`
    return `Há ${diffDias} d`
  }

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

  const ncsFiltradas = ncs
    .filter((nc) => {
      const termo = termoBusca.toLowerCase()
      const matchBusca =
        nc.numero_unico.toLowerCase().includes(termo) ||
        (nc.ativo?.nome ?? '').toLowerCase().includes(termo) ||
        nc.local.nome.toLowerCase().includes(termo) ||
        nc.local.centro_cirurgico.toLowerCase().includes(termo) ||
        nc.descricao.toLowerCase().includes(termo)

      if (!matchBusca) return false

      switch (abaAtiva) {
        case 'abertas':
          return nc.status !== 'encerrada' && nc.status !== 'aguardando_validacao'
        case 'aguardando':
          return nc.status === 'aguardando_validacao'
        case 'encerradas':
          return nc.status === 'encerrada'
        default:
          return true
      }
    })
    .sort((a, b) => {
      const pesoA = CRITICIDADE_ORDEM[a.criticidade as CriticidadeItem] ?? 99
      const pesoB = CRITICIDADE_ORDEM[b.criticidade as CriticidadeItem] ?? 99
      if (pesoA !== pesoB) return pesoA - pesoB
      const prazoA = a.prazo ? new Date(a.prazo).getTime() : Infinity
      const prazoB = b.prazo ? new Date(b.prazo).getTime() : Infinity
      return prazoA - prazoB
    })

  const totalAbertas = ncs.filter((nc) => nc.status !== 'encerrada' && nc.status !== 'aguardando_validacao').length
  const totalAguardando = ncs.filter((nc) => nc.status === 'aguardando_validacao').length
  const totalEncerradas = ncs.filter((nc) => nc.status === 'encerrada').length

  return (
    <div className="space-y-4">
      {/* Contador resumo */}
      <div className="flex gap-2">
        <div className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Abertas</span>
            <div className="w-6.5 h-6.5 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>
          <p className="text-xl font-black font-nunito text-gray-900 mt-1">{totalAbertas}</p>
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
          <p className="text-xl font-black font-nunito text-gray-900 mt-1">{totalAguardando}</p>
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
          <p className="text-xl font-black font-nunito text-gray-900 mt-1">{totalEncerradas}</p>
        </div>
      </div>

      {/* Seletor de Abas */}
      <div className="bg-[#F1F3F6] p-1 rounded-full flex gap-1 overflow-x-auto scrollbar-none shrink-0 select-none">
        {[
          { id: 'abertas', label: 'Abertas' },
          { id: 'aguardando', label: 'Aguardando Validação' },
          { id: 'encerradas', label: 'Encerradas' },
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
      {carregando && ncs.length === 0 ? (
        <div className="space-y-3.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-24 bg-gray-200 rounded-full" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
                <div className="h-3 w-1/3 bg-gray-200 rounded" />
              </div>
              <div className="h-3 w-3/4 bg-gray-100 rounded" />
              <div className="h-px bg-gray-100 pt-1" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-200" />
                  <div className="h-3 w-28 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : ncsFiltradas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {ncsFiltradas.map((nc, idx) => {
            const corCriticidade =
              nc.criticidade === 'critico'
                ? 'vermelho'
                : nc.criticidade === 'importante'
                ? 'laranja'
                : 'azul'

            const tempoRestante = calcularTempoRestante(nc.prazo)
            const vencido = tempoRestante === 'Vencido'

            const nomeExibicaoResponsavel = nc.responsavel_nome
            const nomeExibicaoInspetor = nc.inspetor_nome
            const iniciaisExibicao = (nomeExibicaoResponsavel || nomeExibicaoInspetor || 'US')
              .replace(/^(Enf\.|Eng\.|Coord\.)\s*/i, '')
              .split(' ')
              .filter((p: string) => p.length > 0)
              .map((p: string) => p[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()

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
                      {nc.ativo?.nome || 'Equipamento'}
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

                  {/* Pill de Tipo/Setor + indicador sem técnico */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {nc.setor_responsavel && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        SETORES_CORES[nc.setor_responsavel as SetorTecnico]
                          ? `${SETORES_CORES[nc.setor_responsavel as SetorTecnico].bg} ${SETORES_CORES[nc.setor_responsavel as SetorTecnico].text} ${SETORES_CORES[nc.setor_responsavel as SetorTecnico].border}`
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {SETORES_LABELS[nc.setor_responsavel as SetorTecnico] || nc.setor_responsavel}
                      </span>
                    )}
                    {nc.setor_responsavel && !verificarTecnicoAtivo(nc.setor_responsavel as SetorTecnico) && nc.status !== 'encerrada' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 inline-flex items-center gap-1">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        Sem técnico
                      </span>
                    )}
                  </div>

                  {/* Prazo */}
                  {tempoRestante && nc.status !== 'encerrada' && (
                    <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${vencido ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {tempoRestante}
                    </div>
                  )}

                  {/* Rodapé do Card com Nome do Responsável / Inspetor */}
                  <div className="h-px bg-gray-100 pt-1" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarPerfil
                        perfil={nomeExibicaoResponsavel ? 'engenharia' : 'inspetor'}
                        nome={nomeExibicaoResponsavel || nomeExibicaoInspetor}
                        tamanho="xs"
                      />
                      <span className="text-[11px] text-gray-500 truncate">
                        {nomeExibicaoResponsavel ? (
                          <>Resp: <span className="font-bold text-gray-700">{nomeExibicaoResponsavel}</span></>
                        ) : (
                          <>Aberto por <span className="font-bold text-gray-700">{nomeExibicaoInspetor}</span></>
                        )}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
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
              {abaAtiva === 'abertas'
                ? 'Nenhuma NC aberta'
                : abaAtiva === 'aguardando'
                ? 'Nenhuma NC aguardando validação'
                : 'Nenhuma NC encerrada'}
            </h3>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
              {abaAtiva === 'aguardando'
                ? 'Excelente! Todas as correções foram validadas ou estão em andamento na Engenharia Clínica.'
                : abaAtiva === 'abertas'
                ? 'Ótimo! Não há não conformidades abertas no momento.'
                : 'Nenhuma NC encerrada no momento.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
