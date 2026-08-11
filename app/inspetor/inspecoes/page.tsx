'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { criarClienteSupabase } from '@/lib/supabase/client'

export default function PaginaHistoricoInspecoes() {
  const router = useRouter()
  const [filtro, setFiltro] = useState<'todas' | 'conforme' | 'com_nc'>('todas')
  const [inspecoes, setInspecoes] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [usuario, setUsuario] = useState<any>(null)

  useEffect(() => {
    async function carregarDados() {
      try {
        const supabase = criarClienteSupabase() as any
        
        // 1. Obter usuário logado
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .single()
          setUsuario(profile)
          
          if (profile) {
            // 2. Buscar as execuções de checklist do hospital
            const { data: execsData, error: execsError } = await supabase
              .from('execucoes_checklist')
              .select('*, ativos(*, locais(*)), modelos_checklist(nome_variante)')
              .eq('hospital_id', profile.hospital_id)
              .eq('status', 'concluida')
              .order('finalizado_em', { ascending: false })

            if (execsError) throw execsError

            if (execsData && execsData.length > 0) {
              const execsIds = execsData.map((e: any) => e.id)
              
              // Buscar todos os itens associados para saber se tem NC e criticidade
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
                  local: exec.ativos?.locais?.nome || 'Sala',
                  variante: exec.modelos_checklist?.nome_variante || 'Checklist',
                  dataHora: formatador.format(dataInspecao),
                  resultado
                }
              })

              setInspecoes(formatadas)
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar inspeções:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregarDados()
  }, [])

  const filtrados = inspecoes.filter((ins) => {
    if (filtro === 'todas') return true
    if (filtro === 'conforme') return ins.resultado === 'conforme'
    return ins.resultado !== 'conforme'
  })

  const nomeExibido = usuario?.nome || 'Usuário'
  const cargoExibido = usuario?.perfil === 'inspetor' ? 'Inspetor(a) de Prontidão' : 'Colaborador(a)'
  const iniciais = nomeExibido.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="px-5 pt-4 space-y-6">
      {/* ── Perfil do Usuário Sleek ── */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#246BFD] to-[#1253f6] flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_rgba(36,107,253,0.15)] shrink-0">
            {iniciais}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-gray-900 leading-tight">{nomeExibido}</p>
            <p className="text-[12px] text-gray-400 font-medium mt-0.5">{cargoExibido}</p>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="text-right shrink-0">
          <p className="text-[16px] font-extrabold text-gray-900 leading-none">{inspecoes.length}</p>
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
                'flex-1 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ease-out cursor-pointer active:scale-[0.95]',
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
        <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">
          Minhas Inspeções ({filtrados.length})
        </p>

        {carregando ? (
          <div className="text-center py-8 text-sm text-gray-400 font-semibold animate-pulse">
            Carregando histórico...
          </div>
        ) : filtrados.length > 0 ? (
          <div className="bg-white rounded-[24px] shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 divide-y divide-gray-100/80 overflow-hidden">
            {filtrados.map((ins) => {
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
                  onClick={() => router.push(`/inspetor/checklist/${ins.ativoId}?execId=${ins.id}`)}
                  className="w-full flex items-center justify-between py-4 px-5 hover:bg-slate-50/50 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Status Badge Icon */}
                    <div className={`w-8 h-8 rounded-full ${cfg.iconBg} flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                      {cfg.icon}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p className="text-[14px] font-bold text-gray-900 tracking-tight">
                        {ins.ativo}
                      </p>
                      <p className="text-[12px] text-gray-600 font-medium leading-none">
                        Ronda: <span className="text-gray-900 font-semibold">{ins.variante}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {ins.local} · Realizada em {ins.dataHora}
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
          <div className="bg-white rounded-[24px] p-8 text-center text-gray-400 border border-gray-100/80">
            Nenhuma inspeção encontrada.
          </div>
        )}
      </div>
    </div>
  )
}
