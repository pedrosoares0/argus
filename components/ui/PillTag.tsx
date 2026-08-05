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
  roxo: 'bg-[#F3E8FF] text-[#9333EA]',
  azul: 'bg-[#E0F2FE] text-[#0284C7]',
  verde: 'bg-[#DCFCE7] text-[#16A34A]',
  laranja: 'bg-[#FEF3C7] text-[#D97706]',
  vermelho: 'bg-[#FEE2E2] text-[#DC2626]',
  cinza: 'bg-[#F3F4F6] text-[#4B5563]',
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
        'inline-flex items-center justify-center',
        'rounded-full',
        'px-3 py-1',
        'text-[10px] font-bold tracking-wider uppercase',
        'select-none',
        coresPill[cor],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
