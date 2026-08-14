'use client'

import React from 'react'
import { AvatarPerfil } from '@/components/ui/Avatar'

interface PillUsuarioProps {
  nome: string
  perfil?: string
  className?: string
  onClick?: () => void
}

/**
 * Pill de usuário premium — com Avatar HeroUI oficial por perfil
 */
export function PillUsuario({ nome, perfil, className = '', onClick }: PillUsuarioProps) {
  // Limpa prefixos redundantes do nome cadastrado para exibição (ex: "Enf. Pedro Soares" -> "Pedro Soares")
  const nomeLimpo = nome ? nome.replace(/^(Enf\.|Eng\.|Coord\.)\s*/i, '') : ''

  // Mapeia a função/perfil para exibição amigável
  let funcao = 'Enfermeiro'
  const p = perfil || ''
  if (p === 'inspetor') {
    funcao = 'Enfermeiro'
  } else if (p === 'coordenador') {
    funcao = 'Coordenador'
  } else if (p === 'engenharia' || p === 'engenharia_clinica') {
    funcao = 'Eng. Clínica'
  } else if (p === 'gestor') {
    funcao = 'Gestor'
  } else {
    if (nome.startsWith('Enf.')) {
      funcao = 'Enfermeiro'
    } else if (nome.startsWith('Eng.')) {
      funcao = 'Eng. Clínica'
    } else if (nome.startsWith('Coord.')) {
      funcao = 'Coordenador'
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2',
        'bg-white',
        'rounded-full',
        'pl-1 pr-3 py-1',
        'shadow-2xs',
        'border border-slate-200/80',
        'cursor-pointer hover:bg-slate-50 active:scale-[0.97] transition-all duration-200 outline-none select-none',
        className,
      ].join(' ')}
    >
      <AvatarPerfil perfil={perfil} nome={nome} tamanho="sm" />
      <div className="flex flex-col items-start leading-none text-left select-none pr-0.5">
        <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
          {funcao}
        </span>
        <span className="text-[11.5px] font-bold text-slate-800 tracking-tight">
          {nomeLimpo || nome}
        </span>
      </div>
    </button>
  )
}
