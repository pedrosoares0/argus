import React from 'react'

interface BotaoProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma'
  tamanho?: 'sm' | 'md' | 'lg'
  icone?: React.ReactNode
  carregando?: boolean
  larguraTotal?: boolean
}

/**
 * Componente Botão estilizado conforme o design system.
 * Variante primária possui borda branca destacada (3px), gradiente azul e sombra vibrante.
 */
export function Botao({
  variante = 'primario',
  tamanho = 'md',
  icone,
  carregando = false,
  larguraTotal = false,
  children,
  className = '',
  disabled,
  ...props
}: BotaoProps) {
  const tamanhos = {
    sm: 'px-5 py-2.5 text-xs gap-1.5',
    md: 'px-6 py-3 text-sm gap-2',
    lg: 'px-7 py-3.5 text-sm gap-2',
  }

  return (
    <button
      className={[
        'relative inline-flex items-center justify-center font-bold tracking-wide rounded-full select-none cursor-pointer',
        'active:scale-[0.98] transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        tamanhos[tamanho],

        // Variantes
        variante === 'primario' && [
          'bg-gradient-to-b from-[#246bfd] to-[#1253f6]',
          'text-white',
          'border-[3px] border-white/90',
          'shadow-[0_4px_14px_rgba(36,107,253,0.18)]',
          'hover:brightness-105',
        ].filter(Boolean).join(' '),

        variante === 'secundario' && [
          'bg-white/90 backdrop-blur-sm',
          'text-texto',
          'border border-white/70',
          'shadow-[var(--shadow-card)]',
          'hover:bg-white hover:shadow-[var(--shadow-card-hover)]',
        ].join(' '),

        variante === 'perigo' && [
          'bg-gradient-to-b from-[#ff4d4d] to-[#e60000]',
          'text-white',
          'border-[3px] border-white/90',
          'shadow-[0_14px_30px_-4px_rgba(230,0,0,0.35)]',
          'hover:brightness-105',
        ].join(' '),

        variante === 'fantasma' && [
          'bg-transparent',
          'text-primaria',
          'hover:bg-primaria/5',
        ].join(' '),

        larguraTotal ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      disabled={disabled || carregando}
      {...props}
    >
      {carregando ? (
        <svg
          className="animate-spin h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        icone && <span className="shrink-0">{icone}</span>
      )}
      <span>{children}</span>
    </button>
  )
}
