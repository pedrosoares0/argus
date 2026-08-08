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
              .select('*, ativos(*, locais(*))')
              .eq('hospital_id', profile.hospital_id)
              .eq('status', 'concluida')
              .order('finalizado_em', { ascending: false })

            if (execsError) throw execsError

            if (execsData && execsData.length > 0) {
              const execsIds = execsData.map((e: any) => e.id)
              
              // Buscar todos os itens associados para saber se tem NC
              const { data: itemsData } = await supabase
                .from('itens_execucao_checklist')
                .select('execucao_id, resposta')
                .in('execucao_id', execsIds)

              const itemsMapa = new Map()
              if (itemsData) {
                itemsData.forEach((it: any) => {
                  const arr = itemsMapa.get(it.execucao_id) || []
                  arr.push(it)
                  itemsMapa.set(it.execucao_id, arr)
                })
              }

              const formatadas = execsData.map((exec: any) => {
                const execItems = itemsMapa.get(exec.id) || []
                const temNc = execItems.some((it: any) => it.resposta === 'nao_conforme')
                const totalItems = execItems.length
                
                let status: 'conforme' | 'com_nc' = 'conforme'
                let detalheStatus = 'Conforme'
                if (temNc) {
                  status = 'com_nc'
                  const countNc = execItems.filter((it: any) => it.resposta === 'nao_conforme').length
                  detalheStatus = `${countNc} NC${countNc > 1 ? 's' : ''}`
                }

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
                  ativo: exec.ativos?.nome || 'Equipamento',
                  local: exec.ativos?.locais?.nome || 'Sala',
                  tipo: 'Checklist',
                  dataHora: formatador.format(dataInspecao),
                  status,
                  detalheStatus,
                  secoesRespondidas: totalItems,
                  totalSecoes: totalItems
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
    return ins.status === filtro
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
              const dot = ins.status === 'conforme' ? 'bg-emerald-500' : 'bg-red-500'
              const textColors = ins.status === 'conforme' ? 'text-emerald-600' : 'text-red-500'

              return (
                <button
                  key={ins.id}
                  type="button"
                  onClick={() => router.push(`/inspetor/checklist/${ins.ativoId}?execId=${ins.id}`)}
                  className="w-full flex items-center justify-between py-4 px-5 hover:bg-gray-50/40 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Status Dot */}
                    <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />

                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-gray-900 leading-tight">
                        {ins.ativo}
                      </p>
                      <p className="text-[12px] text-gray-400 mt-1">
                        {ins.local} · {ins.dataHora}
                      </p>
                    </div>
                  </div>

                  {/* Status do lado direito */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-[13px] font-bold ${textColors}`}>
                      {ins.detalheStatus}
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
