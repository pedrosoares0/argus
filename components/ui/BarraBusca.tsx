'use client'

import React, { useState } from 'react'

interface BarraBuscaProps {
  placeholder?: string
  valor?: string
  aoMudar?: (valor: string) => void
  className?: string
}

/**
 * Barra de busca no formato pill com ícone de lupa.
 * Fundo cinza suave, cantos totalmente arredondados.
 */
export function BarraBusca({
  placeholder = 'Buscar...',
  valor,
  aoMudar,
  className = '',
}: BarraBuscaProps) {
  const [valorInterno, setValorInterno] = useState('')
  const valorAtual = valor ?? valorInterno

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novoValor = e.target.value
    setValorInterno(novoValor)
    aoMudar?.(novoValor)
  }

  return (
    <div
      className={[
        'relative flex items-center',
        'bg-superficie',
        'rounded-pill',
        'border border-separador',
        'shadow-[var(--shadow-card)]',
        'transition-shadow duration-200',
        'focus-within:shadow-[var(--shadow-glow)] focus-within:border-primaria/30',
        className,
      ].join(' ')}
    >
      {/* Ícone de lupa */}
      <svg
        className="absolute left-4 h-4.5 w-4.5 text-texto-terciario pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>

      <input
        type="text"
        className={[
          'w-full',
          'bg-transparent',
          'pl-11 pr-4 py-3',
          'text-base text-texto',
          'placeholder:text-texto-terciario',
          'outline-none',
          'rounded-pill',
        ].join(' ')}
        placeholder={placeholder}
        value={valorAtual}
        onChange={handleChange}
      />

      {/* Botão limpar */}
      {valorAtual && (
        <button
          type="button"
          className="absolute right-3 p-1 rounded-full hover:bg-texto-terciario/10 text-texto-terciario"
          onClick={() => {
            setValorInterno('')
            aoMudar?.('')
          }}
          aria-label="Limpar busca"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
