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
    detalheStatus: '1 Não Conformidade registrada',
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
    detalheStatus: '2 Não Conformidades registradas',
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
      {/* ── Perfil do Usuário / Resumo ── */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#246BFD] to-[#1253f6] flex items-center justify-center text-white font-bold text-base shadow-[0_4px_12px_rgba(36,107,253,0.25)] shrink-0">
          {usuario.avatar}
        </div>
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-gray-900 leading-tight">{usuario.nome}</p>
          <p className="text-[12px] text-gray-400 font-medium mt-0.5">{usuario.cargo}</p>
        </div>
      </div>

      {/* ── Estatísticas do Inspetor ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[20px] p-4 border border-gray-100/80 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block">
            Realizadas (Total)
          </span>
          <span className="text-2xl font-bold text-gray-900 mt-1 block">
            {HISTORICO_MOCK.length}
          </span>
        </div>
        <div className="bg-white rounded-[20px] p-4 border border-gray-100/80 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block">
            Com Conformidade
          </span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">
            {HISTORICO_MOCK.filter((i) => i.status === 'conforme').length}
          </span>
        </div>
      </div>

      {/* ── Filtros Segmentados (iOS Style) ── */}
      <div className="bg-gray-100 rounded-full p-1 flex gap-1">
        {(['todas', 'conforme', 'com_nc'] as const).map((opt) => {
          const labels = { todas: 'Todas', conforme: 'Conformes', com_nc: 'Com NC' }
          const ativo = filtro === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setFiltro(opt)}
              className={[
                'flex-1 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200 cursor-pointer',
                ativo
                  ? 'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                  : 'text-gray-500 hover:text-gray-900',
              ].join(' ')}
            >
              {labels[opt]}
            </button>
          )
        })}
      </div>

      {/* ── Histórico de Inspeções ── */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">
          Minhas Inspeções ({filtrados.length})
        </p>

        {filtrados.length > 0 ? (
          <div className="space-y-3">
            {filtrados.map((ins) => {
              const corTag = ins.categoriaLocal === 'UTI'
                ? 'roxo'
                : ins.categoriaLocal === 'PRONTO'
                  ? 'azul'
                  : 'verde'

              const statusColors = ins.status === 'conforme'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'

              return (
                <div
                  key={ins.id}
                  className="bg-white rounded-[24px] p-5 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 space-y-3.5 hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <PillTag cor={corTag}>
                          {ins.categoriaLocal === 'UTI' ? 'UTI' : ins.categoriaLocal === 'PRONTO' ? 'PRONTO' : 'C. CIRÚRGICO'}
                        </PillTag>
                        <span className="text-[11px] font-medium text-gray-400">
                          {ins.dataHora}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                        {ins.ativo}
                      </h3>
                      <p className="text-[12px] text-gray-500">
                        {ins.local}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Status & Progresso */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusColors}`}>
                        {ins.status === 'conforme' ? 'Conforme' : 'Com Não Conf.'}
                      </span>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {ins.detalheStatus}
                      </span>
                    </div>

                    <span className="text-[12px] font-bold text-gray-700 tabular-nums">
                      {ins.secoesRespondidas}/{ins.totalSecoes} seções
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[24px] p-8 text-center text-gray-400 border border-gray-100/80">
            Nenhuma inspeção encontrada para o filtro selecionado.
          </div>
        )}
      </div>
    </div>
  )
}
