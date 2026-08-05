'use client'

import React, { useState } from 'react'

interface BarraBuscaProps {
  placeholder?: string
  valor?: string
  aoMudar?: (valor: string) => void
  className?: string
}

/**
 * Barra de busca no formato pill clean com ícone de lupa.
 * Fundo branco, borda suave de 1px, shadow levíssima.
 */
export function BarraBusca({
  placeholder = 'Buscar por carrinho ou setor...',
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
        'bg-white',
        'rounded-full',
        'border border-gray-200/80',
        'shadow-[0_2px_8px_rgba(0,0,0,0.02)]',
        'transition-all duration-200',
        'focus-within:border-[#246BFD] focus-within:shadow-[0_2px_12px_rgba(36,107,253,0.12)]',
        className,
      ].join(' ')}
    >
      {/* Ícone de lupa */}
      <svg
        className="absolute left-4 h-4 w-4 text-gray-400 pointer-events-none"
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
          'pl-11 pr-4 py-3.5',
          'text-sm text-texto',
          'placeholder:text-gray-400',
          'outline-none',
          'rounded-full',
        ].join(' ')}
        placeholder={placeholder}
        value={valorAtual}
        onChange={handleChange}
      />

      {/* Botão limpar */}
      {valorAtual && (
        <button
          type="button"
          className="absolute right-3.5 p-1 rounded-full hover:bg-gray-100 text-gray-400"
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
