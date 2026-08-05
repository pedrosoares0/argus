import React from 'react'

interface PillUsuarioProps {
  nome: string
  className?: string
  onClick?: () => void
}

/**
 * Pill de usuário premium — clicável para abrir o menu
 */
export function PillUsuario({ nome, className = '', onClick }: PillUsuarioProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2',
        'bg-white',
        'rounded-full',
        'pl-3 pr-4 py-2',
        'shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
        'border border-gray-100',
        'cursor-pointer hover:bg-gray-50 active:scale-[0.97] transition-all duration-200 outline-none select-none',
        className,
      ].join(' ')}
    >
      {/* Ícone de pessoa */}
      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
      <span className="text-[13px] font-bold text-gray-800 tracking-tight">
        {nome}
      </span>
    </button>
  )
}
