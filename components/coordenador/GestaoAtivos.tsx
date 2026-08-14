'use client'

import { useState, useEffect } from 'react'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { QRCodeAtivo } from '@/components/ui/QRCodeAtivo'
import type { StatusAtivo } from '@/lib/supabase/types'

interface GestaoAtivosProps {
  hospitalId: string
}

const STATUS_ATIVO_MAPA: Record<StatusAtivo, { label: string; dot: string; cor: string }> = {
  operacional: { label: 'Operacional', dot: 'bg-emerald-500', cor: 'text-emerald-600' },
  operacional_com_restricoes: { label: 'Com restrições', dot: 'bg-amber-500', cor: 'text-amber-600' },
  indisponivel: { label: 'Indisponível', dot: 'bg-red-500', cor: 'text-red-600' },
  em_manutencao: { label: 'Em manutenção', dot: 'bg-sky-500', cor: 'text-sky-600' },
}

type FiltroStatus = 'todos' | StatusAtivo

export function GestaoAtivos({ hospitalId }: GestaoAtivosProps) {
  const [ativos, setAtivos] = useState<any[]>([])
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarAtivos() {
      setCarregando(true)
      try {
        const supabase = criarClienteSupabase() as any

        const { data: ativosData } = await supabase
          .from('ativos')
          .select('*, locais(*, centros_cirurgicos(*)), categorias_ativos(*)')
          .eq('hospital_id', hospitalId)
          .order('nome', { ascending: true })

        if (ativosData) setAtivos(ativosData)
      } catch (err) {
        console.error('Erro ao carregar ativos:', err)
      } finally {
        setCarregando(false)
      }
    }

    carregarAtivos()
  }, [hospitalId])

  // Contadores por status
  const contadores = {
    todos: ativos.length,
    operacional: ativos.filter((a) => a.status === 'operacional').length,
    operacional_com_restricoes: ativos.filter((a) => a.status === 'operacional_com_restricoes').length,
    indisponivel: ativos.filter((a) => a.status === 'indisponivel').length,
    em_manutencao: ativos.filter((a) => a.status === 'em_manutencao').length,
  }

  const ativosFiltrados = ativos.filter((ativo) => {
    // Filtro por status
    if (filtroStatus !== 'todos' && ativo.status !== filtroStatus) return false

    // Filtro por busca
    const termo = termoBusca.toLowerCase()
    if (!termo) return true
    return (
      ativo.nome.toLowerCase().includes(termo) ||
      (ativo.patrimonio ?? '').toLowerCase().includes(termo) ||
      (ativo.codigo_qr ?? '').toLowerCase().includes(termo) ||
      (ativo.categorias_ativos?.nome ?? '').toLowerCase().includes(termo) ||
      (ativo.locais?.nome ?? '').toLowerCase().includes(termo)
    )
  })

  if (carregando) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-white rounded-[24px] p-5 border border-gray-100/80 animate-pulse space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/6" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Contadores de status */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {(
          [
            { id: 'todos', label: 'Todos', dot: 'bg-gray-400' },
            { id: 'operacional', label: 'Operacional', dot: 'bg-emerald-500' },
            { id: 'em_manutencao', label: 'Manutenção', dot: 'bg-sky-500' },
            { id: 'indisponivel', label: 'Indisponível', dot: 'bg-red-500' },
          ] as { id: FiltroStatus; label: string; dot: string }[]
        ).map((opt) => {
          const ativo = filtroStatus === opt.id
          const count = contadores[opt.id as keyof typeof contadores] || 0
          return (
            <button
              key={opt.id}
              onClick={() => setFiltroStatus(opt.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer active:scale-95 shrink-0',
                ativo
                  ? 'bg-white text-gray-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100'
                  : 'bg-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
              {opt.label}
              <span className={`text-[9px] font-extrabold ${ativo ? 'text-[#7C3AED]' : 'text-gray-400'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Barra de Busca */}
      <BarraBusca
        placeholder="Buscar por nome, patrimônio, QR ou sala..."
        valor={termoBusca}
        aoMudar={setTermoBusca}
      />

      {/* Contagem */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Ativos ({ativosFiltrados.length})
        </span>
      </div>

      {/* Lista de Ativos */}
      {ativosFiltrados.length > 0 ? (
        <div className="space-y-3">
          {ativosFiltrados.map((ativo) => {
            const configStatus = STATUS_ATIVO_MAPA[ativo.status as StatusAtivo] || {
              label: ativo.status,
              dot: 'bg-gray-400',
              cor: 'text-gray-500',
            }
            const isCarrinho = ativo.nome?.toLowerCase().includes('carrinho') || ativo.categorias_ativos?.nome?.toLowerCase().includes('carrinho')
            const nomeLocal = ativo.locais?.nome || 'Sem localização'
            const nomeSetor = ativo.locais?.centros_cirurgicos?.nome || 'Centro Cirúrgico'

            return (
              <div
                key={ativo.id}
                className="bg-white rounded-[24px] p-4 shadow-[var(--shadow-card)] border border-gray-100 transition-all select-none"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isCarrinho && (
                        <div className="relative w-9 h-9 rounded-[10px] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100/30">
                          <img
                            src="/icon-carrinho.webp"
                            alt="Carrinho de Parada"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-extrabold text-gray-900 leading-snug tracking-tight truncate">
                          {ativo.nome}
                        </h3>
                        <p className="text-[10px] text-gray-400 font-medium truncate">
                          {nomeLocal} · {nomeSetor}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${configStatus.dot}`} />
                      <span className={`text-[10px] font-bold ${configStatus.cor}`}>
                        {configStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50/50 rounded-xl p-2.5 border border-gray-100">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Categoria</span>
                      <p className="text-[11px] font-bold text-gray-700 truncate">
                        {ativo.categorias_ativos?.nome || 'Não definida'}
                      </p>
                    </div>
                    <div className="space-y-0.5 border-l border-gray-200 pl-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Patrimônio</span>
                      <p className="text-[11px] font-mono font-bold text-gray-700 truncate">
                        {ativo.patrimonio || '—'}
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[10px] text-gray-400 font-semibold">
                      QR: <span className="font-mono">{ativo.codigo_qr || '—'}</span>
                    </p>
                    <QRCodeAtivo
                      ativoId={ativo.id}
                      localId={ativo.local_id}
                      nomeAtivo={ativo.nome}
                      codigoQr={ativo.codigo_qr}
                      patrimonio={ativo.patrimonio}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-12 px-6 bg-white rounded-[28px] border border-gray-100/80 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#7C3AED]/5 flex items-center justify-center text-[#7C3AED]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900">Nenhum ativo encontrado</h3>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
              {termoBusca
                ? 'Nenhum resultado para os termos da busca.'
                : 'Nenhum ativo cadastrado com o filtro selecionado.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
