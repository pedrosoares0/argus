'use client'

import { useState } from 'react'
import { PillTag } from '@/components/ui/PillTag'

interface InspecaoHistorico {
  id: string
  ativo: string
  local: string
  tipo: string
  dataHora: string
  status: 'conforme' | 'com_nc' | 'incompleta'
  detalheStatus: string
  secoesRespondidas: number
  totalSecoes: number
  categoriaLocal: 'UTI' | 'PRONTO' | 'CENTRO_C'
}

const HISTORICO_MOCK: InspecaoHistorico[] = [
  {
    id: 'ins-1',
    ativo: 'Carrinho UTI-A',
    local: 'UTI Adulto - Bloco A',
    tipo: 'Carrinho de Parada · Completo',
    dataHora: 'Hoje às 10:15',
    status: 'com_nc',
    detalheStatus: '1 Não Conformidade',
    secoesRespondidas: 9,
    totalSecoes: 9,
    categoriaLocal: 'UTI',
  },
  {
    id: 'ins-2',
    ativo: 'Monitor Multiparamétrico #1',
    local: 'Sala 01 · Centro Cirúrgico A',
    tipo: 'Checklist de Segurança',
    dataHora: 'Ontem às 14:30',
    status: 'conforme',
    detalheStatus: 'Totalmente conforme',
    secoesRespondidas: 5,
    totalSecoes: 5,
    categoriaLocal: 'CENTRO_C',
  },
  {
    id: 'ins-3',
    ativo: 'Carrinho Pronto-B',
    local: 'Pronto Socorro · Sala Vermelha',
    tipo: 'Carrinho de Parada · Plantão',
    dataHora: '03/08 às 07:15',
    status: 'conforme',
    detalheStatus: 'Totalmente conforme',
    secoesRespondidas: 3,
    totalSecoes: 3,
    categoriaLocal: 'PRONTO',
  },
  {
    id: 'ins-4',
    ativo: 'Aparelho de Anestesia #1',
    local: 'Sala 02 · Centro Cirúrgico A',
    tipo: 'Checklist de Segurança',
    dataHora: '02/08 às 19:40',
    status: 'com_nc',
    detalheStatus: '2 Não Conformidades',
    secoesRespondidas: 8,
    totalSecoes: 8,
    categoriaLocal: 'CENTRO_C',
  },
  {
    id: 'ins-5',
    ativo: 'Carrinho UTI-B',
    local: 'UTI Coronariana',
    tipo: 'Carrinho de Parada · Completo',
    dataHora: '01/08 às 11:20',
    status: 'conforme',
    detalheStatus: 'Totalmente conforme',
    secoesRespondidas: 9,
    totalSecoes: 9,
    categoriaLocal: 'UTI',
  },
]

export default function PaginaHistoricoInspecoes() {
  const [filtro, setFiltro] = useState<'todas' | 'conforme' | 'com_nc'>('todas')

  const usuario = {
    nome: 'Enf. Pedro Soares',
    cargo: 'Inspetor de Prontidão',
    avatar: 'PS',
  }

  const filtrados = HISTORICO_MOCK.filter((ins) => {
    if (filtro === 'todas') return true
    return ins.status === filtro
  })

  return (
    <div className="px-5 pt-4 space-y-6">
      {/* ── Perfil do Usuário Sleek ── */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 flex items-center justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#246BFD] to-[#1253f6] flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_12px_rgba(36,107,253,0.15)] shrink-0">
            {usuario.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-gray-900 leading-tight">{usuario.nome}</p>
            <p className="text-[12px] text-gray-400 font-medium mt-0.5">{usuario.cargo}</p>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="text-right shrink-0">
          <p className="text-[16px] font-extrabold text-gray-900 leading-none">{HISTORICO_MOCK.length}</p>
          <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Inspeções</p>
        </div>
      </div>

      {/* ── Filtros Segmentados (iOS Style) ── */}
      <div className="bg-gray-200/60 rounded-full p-1 flex gap-1">
        {(['todas', 'conforme', 'com_nc'] as const).map((opt) => {
          const labels = { todas: 'Todas', conforme: 'Conformes', com_nc: 'Com NC' }
          const ativo = filtro === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setFiltro(opt)}
              className={[
                'flex-1 py-2 rounded-full text-[13px] font-bold transition-all duration-200 cursor-pointer',
                ativo
                  ? 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              {labels[opt]}
            </button>
          )
        })}
      </div>

      {/* ── Lista de Inspeções (iOS Settings-style) ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">
          Minhas Inspeções ({filtrados.length})
        </p>

        {filtrados.length > 0 ? (
          <div className="bg-white rounded-[24px] shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 divide-y divide-gray-100/80 overflow-hidden">
            {filtrados.map((ins) => {
              const corTag = ins.categoriaLocal === 'UTI'
                ? 'roxo'
                : ins.categoriaLocal === 'PRONTO'
                  ? 'azul'
                  : 'verde'

              const dot = ins.status === 'conforme' ? 'bg-emerald-500' : 'bg-red-500'

              const statusBadgeColors = ins.status === 'conforme'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-100'

              return (
                <div
                  key={ins.id}
                  className="flex items-center justify-between py-4 px-5 hover:bg-gray-50/40 transition-colors"
                >
                  {/* Informações da Inspeção */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Status Indicator */}
                    <span className={`w-2 h-2 rounded-full ${dot} shrink-0 mt-2`} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-bold text-gray-900 truncate">
                          {ins.ativo}
                        </span>
                        <PillTag cor={corTag}>
                          {ins.categoriaLocal === 'UTI' ? 'UTI' : ins.categoriaLocal === 'PRONTO' ? 'PRONTO' : 'C. CIRÚRGICO'}
                        </PillTag>
                      </div>
                      <p className="text-[12px] text-gray-400 mt-0.5">
                        {ins.local} · {ins.dataHora}
                      </p>
                      <p className="text-[11px] text-gray-500 font-semibold mt-1">
                        {ins.detalheStatus} · <span className="text-gray-400">{ins.secoesRespondidas}/{ins.totalSecoes} seções</span>
                      </p>
                    </div>
                  </div>

                  {/* Badges de Status e Chevron */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${statusBadgeColors}`}>
                      {ins.status === 'conforme' ? 'Conforme' : 'Com NC'}
                    </span>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
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
