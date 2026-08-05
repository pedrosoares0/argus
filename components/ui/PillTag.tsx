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
  azul: 'bg-primaria/12 text-primaria',
  roxo: 'bg-info/12 text-info',
  verde: 'bg-sucesso/12 text-sucesso',
  laranja: 'bg-alerta/12 text-alerta',
  vermelho: 'bg-perigo/12 text-perigo',
  cinza: 'bg-texto-terciario/12 text-texto-secundario',
}

/**
 * Tag colorida no formato pill para categorias e setores.
 * Ex: pill roxa "UTI", pill verde "Operacional".
 */
export function PillTag({
  children,
  cor = 'azul',
  className = '',
}: PillTagProps) {
  return (
    <span
      className={[
        'inline-flex items-center',
        'rounded-pill',
        'px-3 py-1',
        'text-xs font-semibold',
        'select-none',
        coresPill[cor],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
