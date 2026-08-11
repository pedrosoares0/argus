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
    bg: 'bg-[#34C759] text-white shadow-[0_4px_12px_rgba(52,199,89,0.2)]',
    iconBg: 'bg-[#248A3D]',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={4.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    )
  },
  vermelho: {
    bg: 'bg-[#FF3B30] text-white shadow-[0_4px_12px_rgba(255,59,48,0.2)]',
    iconBg: 'bg-[#B81D18]',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={4.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
  laranja: {
    bg: 'bg-[#FF9500] text-white shadow-[0_4px_12px_rgba(255,149,0,0.2)]',
    iconBg: 'bg-[#C67300]',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    )
  },
  azul: {
    bg: 'bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.2)]',
    iconBg: 'bg-[#005EC4]',
    icon: (
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    )
  },
  roxo: {
    bg: 'bg-[#5856D6] text-white shadow-[0_4px_12px_rgba(88,86,214,0.2)]',
    iconBg: 'bg-[#3F3D99]',
    icon: (
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
    )
  },
  cinza: {
    bg: 'bg-[#8E8E93] text-white shadow-[0_4px_12px_rgba(142,142,147,0.15)]',
    iconBg: 'bg-[#636366]',
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
        'inline-flex items-center justify-center gap-2',
        'rounded-full',
        'pl-1.5 pr-3 py-1',
        'text-[12px] font-extrabold tracking-tight',
        'select-none transition-all duration-200 border border-white/10',
        cfg.bg,
        className,
      ].join(' ')}
    >
      <div className={['w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]', cfg.iconBg].join(' ')}>
        {cfg.icon}
      </div>
      <span className="leading-none mt-0.5">{children}</span>
    </span>
  )
}
