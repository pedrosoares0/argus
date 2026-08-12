import React from 'react'
import { Avatar } from '@/components/ui/Avatar'

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
  const avatarUrl =
    perfil === 'engenharia_clinica' || perfil === 'engenharia' ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg' :
    perfil === 'coordenador' ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg' :
    perfil === 'gestor' ? 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg' :
    'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg'

  // Limpa prefixos redundantes do nome cadastrado para exibição (ex: "Enf. Pedro Soares" -> "Pedro Soares")
  const nomeLimpo = nome ? nome.replace(/^(Enf\.|Eng\.|Coord\.)\s*/i, '') : ''
  const iniciais = nomeLimpo ? nomeLimpo.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'US'

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
    // Fallbacks baseados em prefixos se o perfil não estiver definido
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
        'inline-flex items-center gap-1.5',
        'bg-white',
        'rounded-full',
        'pl-1 pr-2.5 py-0.5',
        'shadow-[0_2px_8px_rgba(0,0,0,0.03)]',
        'border border-gray-100/80',
        'cursor-pointer hover:bg-gray-50 active:scale-[0.97] transition-all duration-200 outline-none select-none',
        className,
      ].join(' ')}
    >
      <Avatar size="sm">
        <Avatar.Image alt={nomeLimpo} src={avatarUrl} />
        <Avatar.Fallback>{iniciais}</Avatar.Fallback>
      </Avatar>
      <div className="flex flex-col items-start leading-none text-left select-none pr-0.5">
        <span className="text-[7.5px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
          {funcao}
        </span>
        <span className="text-[11px] font-extrabold text-gray-800 tracking-tight">
          {nomeLimpo}
        </span>
      </div>
    </button>
  )
}
