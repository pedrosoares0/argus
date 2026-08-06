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

const coresPill: Record<CorPill, string> = {
  roxo: 'bg-[#A855F7] text-white',
  azul: 'bg-[#0EA5E9] text-white',
  verde: 'bg-[#12B76A] text-[#052E16]',
  laranja: 'bg-[#FBBF24] text-[#78350F]',
  vermelho: 'bg-[#EF4444] text-white',
  cinza: 'bg-[#F1F5F9] text-[#475569]',
}

/**
 * Tag limpa no formato pill para categorias e setores.
 * Inspirada na 2ª imagem de referência: tons pastéis suaves e tipografia em caixa alta.
 */
export function PillTag({
  children,
  cor = 'roxo',
  className = '',
}: PillTagProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center gap-1.5',
        'rounded-full',
        'px-2.5 py-1',
        'text-[11px] font-bold',
        'select-none shadow-[0_2px_5px_rgba(0,0,0,0.06)]',
        coresPill[cor],
        className,
      ].join(' ')}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {children}
    </span>
  )
}
