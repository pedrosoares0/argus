import React from 'react'

interface PillUsuarioProps {
  nome: string
  className?: string
}

/**
 * Pill de usuário premium — borda glass, sombra suave, avatar com gradiente.
 * Referência: "Dr. Paulo" com ícone de pessoa à esquerda.
 */
export function PillUsuario({ nome, className = '' }: PillUsuarioProps) {
  return (
    <div
      className={[
        'inline-flex items-center gap-2',
        'bg-white/90 backdrop-blur-sm',
        'rounded-pill',
        'pl-2 pr-3.5 py-1.5',
        'shadow-[var(--shadow-card)]',
        'border border-white/60',
        className,
      ].join(' ')}
    >
      {/* Ícone de pessoa */}
      <svg className="w-4 h-4 text-texto-secundario" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
      <span className="text-[13px] font-semibold text-texto tracking-[-0.01em]">
        {nome}
      </span>
    </div>
  )
}
