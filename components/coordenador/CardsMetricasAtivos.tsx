'use client'

import React from 'react'
import type { StatusAtivo } from '@/lib/supabase/types'

export type FiltroStatusAtivo = 'todos' | StatusAtivo

export interface ContadoresAtivos {
  total: number
  operacional: number
  operacional_com_restricoes: number
  indisponivelOuManutencao: number
  taxaConformidade: number
  totalSalas?: number
}

interface CardsMetricasAtivosProps {
  contadores: ContadoresAtivos
  filtroStatus?: FiltroStatusAtivo
  aoSelecionarFiltro?: (status: FiltroStatusAtivo) => void
  salaSelecionada?: string
  aoLimparFiltros?: () => void
  clicavel?: boolean
}

export function CardsMetricasAtivos({
  contadores,
  filtroStatus = 'todos',
  aoSelecionarFiltro,
  salaSelecionada = 'todas',
  aoLimparFiltros,
  clicavel = true,
}: CardsMetricasAtivosProps) {
  const totalSalasExibidas = contadores.totalSalas !== undefined ? contadores.totalSalas : 3

  const handleClick = (tipo: FiltroStatusAtivo | 'salas') => {
    if (!clicavel || !aoSelecionarFiltro) return

    if (tipo === 'salas') {
      if (aoLimparFiltros) {
        aoLimparFiltros()
      } else {
        aoSelecionarFiltro('todos')
      }
      return
    }

    aoSelecionarFiltro(filtroStatus === tipo ? 'todos' : tipo)
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* CARD 1: OPERACIONAIS (Verde Conforme #54D362 → #31B44A) */}
      <div
        onClick={() => handleClick('operacional')}
        style={{
          fontFamily: "'Nunito', sans-serif",
          background: 'radial-gradient(130% 130% at 30% 20%, #54D362 0%, #31B44A 50%, #209935 100%)',
          boxShadow:
            'inset 0 4px 14px rgba(255, 255, 255, 0.95), inset 0 -4px 10px rgba(0, 0, 0, 0.1), inset 4px 0 12px rgba(255, 255, 255, 0.75), inset -4px 0 12px rgba(255, 255, 255, 0.75), 0 12px 32px rgba(49, 180, 74, 0.3)',
        }}
        className={`relative overflow-hidden rounded-[28px] px-4.5 py-4 transition-all duration-300 select-none flex flex-col justify-between min-h-[120px] border-0 ${
          clicavel ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
        } ${filtroStatus === 'operacional' ? 'ring-4 ring-emerald-300 ring-offset-2' : ''}`}
      >
        {/* Camada de brilho e inner shadow superior intenso */}
        <div className="absolute top-0 inset-x-0 h-3/5 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-[28px] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/95 drop-shadow-xs">
            Operacionais
          </span>
          {/* Selo Florado do Badge Conforme */}
          <div className="w-7 h-7 flex items-center justify-center">
            <svg className="w-6 h-6 drop-shadow-xs" viewBox="0 0 24 24" fill="none">
              <path
                fill="rgba(255,255,255,0.4)"
                d="M12 2a2 2 0 0 1 1.414.586l.828.828a2 2 0 0 0 1.414.586h1.172a2 2 0 0 1 2 2v1.172a2 2 0 0 0 .586 1.414l.828.828A2 2 0 0 1 21 10.828v1.172a2 2 0 0 1-.586 1.414l-.828.828a2 2 0 0 0-.586 1.414v1.172a2 2 0 0 1-2 2h-1.172a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 10.828 21h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6 19h-1.172a2 2 0 0 1-2-2v-1.172a2 2 0 0 0-.586-1.414l-.828-.828A2 2 0 0 1 3 12v-1.172a2 2 0 0 1 .586-1.414l.828-.828A2 2 0 0 0 5 7.172V6a2 2 0 0 1 2-2h1.172a2 2 0 0 0 1.414-.586l.828-.828A2 2 0 0 1 12 2z"
              />
              <path
                stroke="white"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.5 12.5l2.5 2.5 4.5-5"
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-baseline gap-1">
            <span
              style={{ fontFamily: "'Nunito', sans-serif" }}
              className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none text-white drop-shadow-sm"
            >
              {contadores.operacional}
            </span>
            <span className="text-[11px] font-black text-white/70">/ {contadores.total}</span>
          </div>
        </div>

        <div className="relative z-10 text-[10.5px] text-white/95">
          <span className="font-extrabold drop-shadow-2xs">
            {contadores.taxaConformidade}% · Prontos para uso
          </span>
        </div>
      </div>

      {/* CARD 2: RESTRIÇÕES (Laranja Importante #FF9E3D → #F78725) */}
      <div
        onClick={() => handleClick('operacional_com_restricoes')}
        style={{
          fontFamily: "'Nunito', sans-serif",
          background: 'radial-gradient(130% 130% at 30% 20%, #FF9E3D 0%, #F78725 50%, #DD6B10 100%)',
          boxShadow:
            'inset 0 4px 14px rgba(255, 255, 255, 0.95), inset 0 -4px 10px rgba(0, 0, 0, 0.1), inset 4px 0 12px rgba(255, 255, 255, 0.75), inset -4px 0 12px rgba(255, 255, 255, 0.75), 0 12px 32px rgba(247, 135, 37, 0.3)',
        }}
        className={`relative overflow-hidden rounded-[28px] px-4.5 py-4 transition-all duration-300 select-none flex flex-col justify-between min-h-[120px] border-0 ${
          clicavel ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
        } ${filtroStatus === 'operacional_com_restricoes' ? 'ring-4 ring-orange-300 ring-offset-2' : ''}`}
      >
        <div className="absolute top-0 inset-x-0 h-3/5 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-[28px] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/95 drop-shadow-xs">
            Restrições
          </span>
          {/* Triângulo de Alerta do Badge Importante */}
          <div className="w-7 h-7 flex items-center justify-center">
            <svg className="w-5.5 h-5.5 drop-shadow-xs" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10.788 3.21c.548-.96 1.876-.96 2.424 0l8.23 14.403c.532.931-.14 2.087-1.212 2.087H3.77c-1.072 0-1.744-1.156-1.212-2.087L10.788 3.21zM12 8a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 0012 8zm0 8a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10">
          <span
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none text-white drop-shadow-sm"
          >
            {contadores.operacional_com_restricoes}
          </span>
        </div>

        <div className="relative z-10 text-[10.5px] text-white/95">
          <span className="font-extrabold drop-shadow-2xs">Requer atenção</span>
        </div>
      </div>

      {/* CARD 3: INDISPONÍVEIS (Vermelho Crítico #F45F63 → #EA3A3A) */}
      <div
        onClick={() => handleClick('indisponivel')}
        style={{
          fontFamily: "'Nunito', sans-serif",
          background: 'radial-gradient(130% 130% at 30% 20%, #F45F63 0%, #EA3A3A 50%, #C82020 100%)',
          boxShadow:
            'inset 0 4px 14px rgba(255, 255, 255, 0.95), inset 0 -4px 10px rgba(0, 0, 0, 0.1), inset 4px 0 12px rgba(255, 255, 255, 0.75), inset -4px 0 12px rgba(255, 255, 255, 0.75), 0 12px 32px rgba(234, 58, 58, 0.3)',
        }}
        className={`relative overflow-hidden rounded-[28px] px-4.5 py-4 transition-all duration-300 select-none flex flex-col justify-between min-h-[120px] border-0 ${
          clicavel ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
        } ${filtroStatus === 'indisponivel' ? 'ring-4 ring-rose-300 ring-offset-2' : ''}`}
      >
        <div className="absolute top-0 inset-x-0 h-3/5 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-[28px] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/95 drop-shadow-xs">
            Indisponíveis
          </span>
          {/* Círculo X do Badge Crítico */}
          <div className="w-7 h-7 flex items-center justify-center">
            <svg className="w-5.5 h-5.5 drop-shadow-xs" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.35)" />
              <path stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6m0-6l-6 6" />
            </svg>
          </div>
        </div>

        <div className="relative z-10">
          <span
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none text-white drop-shadow-sm"
          >
            {contadores.indisponivelOuManutencao}
          </span>
        </div>

        <div className="relative z-10 text-[10.5px] text-white/95">
          <span className="font-extrabold drop-shadow-2xs">Crítico</span>
        </div>
      </div>

      {/* CARD 4: SALAS (Azul Primário #528BFF → #246BFD) */}
      <div
        onClick={() => handleClick('salas')}
        style={{
          fontFamily: "'Nunito', sans-serif",
          background: 'radial-gradient(130% 130% at 30% 20%, #528BFF 0%, #246BFD 50%, #1253F6 100%)',
          boxShadow:
            'inset 0 4px 14px rgba(255, 255, 255, 0.95), inset 0 -4px 10px rgba(0, 0, 0, 0.1), inset 4px 0 12px rgba(255, 255, 255, 0.75), inset -4px 0 12px rgba(255, 255, 255, 0.75), 0 12px 32px rgba(36, 107, 253, 0.3)',
        }}
        className={`relative overflow-hidden rounded-[28px] px-4.5 py-4 transition-all duration-300 select-none flex flex-col justify-between min-h-[120px] border-0 ${
          clicavel ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
        } ${filtroStatus === 'todos' && salaSelecionada === 'todas' ? 'ring-4 ring-blue-300 ring-offset-2' : ''}`}
      >
        <div className="absolute top-0 inset-x-0 h-3/5 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-[28px] pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-white/95 drop-shadow-xs">
            Salas
          </span>
          <div className="w-7 h-7 rounded-full bg-white/25 backdrop-blur-md border border-white/45 flex items-center justify-center text-white shadow-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21"
              />
            </svg>
          </div>
        </div>

        <div className="relative z-10">
          <span
            style={{ fontFamily: "'Nunito', sans-serif" }}
            className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none text-white drop-shadow-sm"
          >
            {totalSalasExibidas}
          </span>
        </div>

        <div className="relative z-10 text-[10.5px] text-white/95">
          <span className="font-extrabold drop-shadow-2xs">Mapeadas</span>
        </div>
      </div>
    </div>
  )
}
