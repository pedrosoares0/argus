import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  animacao?: boolean
  variante?: 'padrao' | 'elevado' | 'tintado'
}

/**
 * Card premium — cantos arredondados generosos (22px),
 * sombra multi-camada, borda glass sutil, padding amplo.
 *
 * Variante "tintado": fundo levemente azulado (como o card de QR na referência).
 */
export function Card({
  children,
  className = '',
  onClick,
  animacao = true,
  variante = 'padrao',
}: CardProps) {
  const interativo = !!onClick

  const variantes = {
    padrao: 'bg-superficie border-white/60',
    elevado: 'bg-superficie border-white/70',
    tintado: 'bg-[#F0F4FF] border-[#E0E8FF]/60',
  }

  const sombras = {
    padrao: 'shadow-[var(--shadow-card)]',
    elevado: 'shadow-[var(--shadow-elevado)]',
    tintado: 'shadow-[var(--shadow-card)]',
  }

  return (
    <div
      className={[
        'rounded-card',
        'border',
        'p-6',
        variantes[variante],
        sombras[variante],
        animacao ? 'animate-[fadeIn_0.4s_var(--ease-out-forte)_both]' : '',
        interativo
          ? 'cursor-pointer hover:shadow-[var(--shadow-card-hover)] active:scale-[0.985] transition-all duration-250'
          : '',
        className,
      ].join(' ')}
      onClick={onClick}
      role={interativo ? 'button' : undefined}
      tabIndex={interativo ? 0 : undefined}
      onKeyDown={
        interativo
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}
