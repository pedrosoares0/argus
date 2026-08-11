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
    bg: 'bg-[#34C759] text-white shadow-[0_3px_10px_rgba(52,199,89,0.2)]',
    iconBg: 'bg-[#248A3D] rounded-full w-5 h-5 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={4.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    )
  },
  vermelho: {
    bg: 'bg-[#FF3B30] text-white shadow-[0_3px_10px_rgba(255,59,48,0.2)]',
    iconBg: 'bg-[#B81D18] rounded-full w-5 h-5 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={4.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
  laranja: {
    bg: 'bg-[#FF9500] text-white shadow-[0_3px_10px_rgba(255,149,0,0.2)]',
    iconBg: 'w-5 h-5 flex items-center justify-center',
    icon: (
      <svg className="w-5 h-5 text-[#D97706]" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M9.442 3.842c1.077-1.782 3.639-1.782 4.716 0l7.25 12.002c1.107 1.832-.208 4.156-2.358 4.156H4.95c-2.15 0-3.465-2.324-2.358-4.156l7.25-12.002zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1 1 0 100-2 1 1 0 000 2z" />
      </svg>
    )
  },
  azul: {
    bg: 'bg-[#007AFF] text-white shadow-[0_3px_10px_rgba(0,122,255,0.2)]',
    iconBg: 'bg-[#005EC4] rounded-full w-5 h-5 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  },
  roxo: {
    bg: 'bg-[#5856D6] text-white shadow-[0_3px_10px_rgba(88,86,214,0.2)]',
    iconBg: 'bg-[#3F3D99] rounded-full w-5 h-5 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]',
    icon: (
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
    )
  },
  cinza: {
    bg: 'bg-[#8E8E93] text-white shadow-[0_3px_10px_rgba(142,142,147,0.15)]',
    iconBg: 'bg-[#636366] rounded-full w-5 h-5 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]',
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
      className={[
        'inline-flex items-center justify-center gap-1.5',
        'rounded-full',
        'pl-1.5 pr-3 py-1',
        'text-[12px] font-extrabold tracking-wider uppercase',
        'select-none transition-all duration-200 border border-white/10',
        cfg.bg,
        className,
      ].join(' ')}
    >
      <div className={['shrink-0', cfg.iconBg].join(' ')}>
        {cfg.icon}
      </div>
      <span className="leading-none mt-0.5">{children}</span>
    </span>
  )
}
