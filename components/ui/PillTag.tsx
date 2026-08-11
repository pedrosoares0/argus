import React from 'react'

type CorPill =
  | 'azul'
  | 'roxo'
  | 'verde'
  | 'laranja'
  | 'vermelho'
  | 'cinza'

interface PillTagProps {
  children: React.ReactNode
  cor?: CorPill
  className?: string
}

const configPill: Record<CorPill, { bg: string; iconBg: string; icon: React.ReactNode }> = {
  verde: {
    bg: 'bg-gradient-to-b from-[#54D362] to-[#31B44A] text-white shadow-[0_3px_10px_rgba(49,180,74,0.25)]',
    iconBg: 'w-5 h-5 flex items-center justify-center',
    icon: (
      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
        {/* Selo Florado / Scalloped Seal Dark Green */}
        <path
          fill="#0AB01E"
          d="M12 2a2 2 0 0 1 1.414.586l.828.828a2 2 0 0 0 1.414.586h1.172a2 2 0 0 1 2 2v1.172a2 2 0 0 0 .586 1.414l.828.828A2 2 0 0 1 21 10.828v1.172a2 2 0 0 1-.586 1.414l-.828.828a2 2 0 0 0-.586 1.414v1.172a2 2 0 0 1-2 2h-1.172a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 10.828 21h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 6 19h-1.172a2 2 0 0 1-2-2v-1.172a2 2 0 0 0-.586-1.414l-.828-.828A2 2 0 0 1 3 12v-1.172a2 2 0 0 1 .586-1.414l.828-.828A2 2 0 0 0 5 7.172V6a2 2 0 0 1 2-2h1.172a2 2 0 0 0 1.414-.586l.828-.828A2 2 0 0 1 12 2z"
        />
        {/* Checkmark Verde Claro */}
        <path
          stroke="#54D362"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.5 12.5l2.5 2.5 4.5-5"
        />
      </svg>
    )
  },
  vermelho: {
    bg: 'bg-gradient-to-b from-[#F45F63] to-[#EA3A3A] text-white shadow-[0_3px_10px_rgba(234,58,58,0.25)]',
    iconBg: 'w-5 h-5 flex items-center justify-center',
    icon: (
      <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
        {/* Círculo Vermelho Escuro */}
        <circle cx="12" cy="12" r="10" fill="#EA1517" />
        {/* X Vermelho Claro */}
        <path
          stroke="#F45F63"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 9l6 6m0-6l-6 6"
        />
      </svg>
    )
  },
  laranja: {
    bg: 'bg-gradient-to-b from-[#FF9E3D] to-[#F78725] text-white shadow-[0_3px_10px_rgba(247,135,37,0.25)]',
    iconBg: 'w-5 h-5 flex items-center justify-center',
    icon: (
      <svg className="w-4.5 h-4.5 text-[#F86201]" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M10.788 3.21c.548-.96 1.876-.96 2.424 0l8.23 14.403c.532.931-.14 2.087-1.212 2.087H3.77c-1.072 0-1.744-1.156-1.212-2.087L10.788 3.21zM12 8a.75.75 0 00-.75.75v4.5a.75.75 0 001.5 0v-4.5A.75.75 0 0012 8zm0 8a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
    )
  },
  azul: {
    bg: 'bg-gradient-to-b from-[#007AFF] to-[#005EC4] text-white shadow-[0_3px_10px_rgba(0,122,255,0.2)]',
    iconBg: 'w-5 h-5 flex items-center justify-center',
    icon: (
      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  },
  roxo: {
    bg: 'bg-[#5856D6] text-white shadow-[0_3px_10px_rgba(88,86,214,0.2)]',
    iconBg: 'w-5 h-5 flex items-center justify-center',
    icon: (
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
    )
  },
  cinza: {
    bg: 'bg-[#8E8E93] text-white shadow-[0_3px_10px_rgba(142,142,147,0.15)]',
    iconBg: 'w-5 h-5 flex items-center justify-center',
    icon: (
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
    )
  }
}

export function PillTag({
  children,
  cor = 'roxo',
  className = '',
}: PillTagProps) {
  const cfg = configPill[cor] || configPill.roxo
  
  return (
    <span
      style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}
      className={[
        'inline-flex items-center justify-center gap-1.5',
        'rounded-full',
        'pl-1.5 pr-3.5 py-1',
        'text-[13px] tracking-tight capitalize',
        'select-none transition-all duration-200 border border-white/10',
        cfg.bg,
        className,
      ].join(' ')}
    >
      <div className={['shrink-0', cfg.iconBg].join(' ')}>
        {cfg.icon}
      </div>
      <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800 }} className="leading-none mt-0.5">{children}</span>
    </span>
  )
}
