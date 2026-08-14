'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { dadosCache } from '@/lib/cache/dadosCache'
import { PillTag } from '@/components/ui/PillTag'
import { Avatar } from '@/components/ui/Avatar'

export default function PaginaHistoricoInspecoes() {
  const router = useRouter()
  const [filtro, setFiltro] = useState<'todas' | 'conforme' | 'com_nc'>('todas')
  const cacheKey = 'inspetor_historico_inspecoes'
  const [inspecoes, setInspecoes] = useState<any[]>(() => dadosCache.get<any[]>(cacheKey) || [])
  const [carregando, setCarregando] = useState(() => !dadosCache.get(cacheKey))
  const [usuario, setUsuario] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('argus_usuario_atual')
        if (stored) return JSON.parse(stored)
      } catch (e) {
        console.error(e)
      }
    }
    return null
  })

  useEffect(() => {
    async function carregarDados() {
      if (!dadosCache.get(cacheKey)) {
        setCarregando(true)
      }
      try {
        const supabase = criarClienteSupabase() as any
        
        let profile = usuario
        if (!profile?.id) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: userProfile } = await supabase
              .from('usuarios')
              .select('*')
              .eq('id', user.id)
              .single()
            if (userProfile) {
              profile = userProfile
              setUsuario(userProfile)
            }
          }
        }

        if (profile?.id) {
          // Buscar execuções com joins
          const { data: execsData, error: execsError } = await supabase
            .from('execucoes_checklist')
            .select('*, ativos(*, locais(*)), modelos_checklist(nome_variante)')
            .eq('usuario_id', profile.id)
            .eq('status', 'concluida')
            .order('finalizado_em', { ascending: false })

          if (execsError) throw execsError

          if (execsData && execsData.length > 0) {
            const execsIds = execsData.map((e: any) => e.id)
            
            const { data: itemsData } = await supabase
              .from('itens_execucao_checklist')
              .select('execucao_id, resposta, criticidade')
              .in('execucao_id', execsIds)

            const execsNcMapa = new Map()
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
            }

            const formatadas = execsData.map((exec: any) => {
              const criticidadeNc = execsNcMapa.get(exec.id)
              const resultado = criticidadeNc || 'conforme'

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
                ativoId: exec.ativo_id,
                ativo: exec.ativos?.nome || 'Equipamento',
                local: (exec.ativos?.locais?.nome && exec.ativos.locais.nome !== 'Sala 01') ? exec.ativos.locais.nome : '',
                variante: exec.modelos_checklist?.nome_variante || 'Checklist',
                dataHora: formatador.format(dataInspecao),
                resultado
              }
            })

            setInspecoes(formatadas)
            dadosCache.set(cacheKey, formatadas)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar inspeções:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregarDados()
  }, [cacheKey])

  const filtrados = inspecoes.filter((ins) => {
    if (filtro === 'todas') return true
    if (filtro === 'conforme') return ins.resultado === 'conforme'
    return ins.resultado !== 'conforme'
  })

  const nomeExibido = usuario?.nome || 'Usuário'
  const cargoExibido = usuario?.perfil === 'inspetor' ? 'Inspetor(a) de Prontidão' : 'Colaborador(a)'
  const iniciais = nomeExibido.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="px-4 sm:px-5 pt-3 space-y-4 sm:space-y-6">
      {/* ── Perfil do Usuário Sleek ── */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0">
            <Avatar size="md">
              <Avatar.Image
                alt={nomeExibido}
                src={
                  usuario?.perfil === 'engenharia_clinica' || usuario?.perfil === 'engenharia' ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg' :
                  usuario?.perfil === 'coordenador' ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg' :
                  usuario?.perfil === 'gestor' ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg' :
                  'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg'
                }
              />
              <Avatar.Fallback>{iniciais}</Avatar.Fallback>
            </Avatar>
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-[15px] font-bold text-gray-900 leading-tight">{nomeExibido}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{cargoExibido}</p>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="text-right shrink-0">
          <p className="text-sm sm:text-base font-extrabold text-gray-900 leading-none">{inspecoes.length}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Inspeções</p>
        </div>
      </div>

      {/* ── Filtros Segmentados (Visual Apple) ── */}
      <div className="bg-[#F1F3F6] rounded-full p-1 flex gap-1 select-none">
        {(['todas', 'conforme', 'com_nc'] as const).map((opt) => {
          const labels = { todas: 'Todas', conforme: 'Conformes', com_nc: 'Com NC' }
          const ativo = filtro === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setFiltro(opt)}
              className={[
                'flex-1 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-bold transition-all duration-300 ease-out cursor-pointer active:scale-[0.95]',
                ativo
                  ? 'bg-white text-slate-800 shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                  : 'text-gray-500 hover:text-slate-800',
              ].join(' ')}
            >
              {labels[opt]}
            </button>
          )
        })}
      </div>

      {/* ── Lista de Inspeções (Ultra Clean) ── */}
      <div className="space-y-2">
        <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">
          Minhas Inspeções ({filtrados.length})
        </p>

        {carregando && inspecoes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 divide-y divide-gray-100/80 overflow-hidden animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="w-full flex items-center justify-between py-3.5 px-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-2/5 bg-gray-200 rounded" />
                    <div className="h-3 w-1/3 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtrados.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 divide-y divide-gray-100/80 overflow-hidden">
            {filtrados.map((ins) => {
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
                  onClick={() => router.push(`/inspetor/checklist/${ins.ativoId}?execId=${ins.id}`)}
                  className="w-full flex items-center justify-between py-3 px-4 hover:bg-slate-50/50 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Status Badge Icon — Identical to PillTag inner icon */}
                    <div className={`w-8 h-8 rounded-full ${iconBgClass} flex items-center justify-center shrink-0 shadow-sm mt-0.5 text-white`}>
                      {corPill === 'verde' && (
                        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
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
                          {ins.ativo}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 font-medium leading-none">
                        Ronda: <span className="text-gray-900 font-semibold">{ins.variante}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {ins.local ? `${ins.local} · ` : ''}Realizada em {ins.dataHora}
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
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100/80">
            Nenhuma inspeção encontrada.
          </div>
        )}
      </div>
    </div>
  )
}
