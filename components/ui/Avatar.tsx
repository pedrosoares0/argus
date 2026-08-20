'use client'

import React, { createContext, useContext, useState } from 'react'

export function getAvatarUrlPorPerfil(perfil?: string, nome?: string, setor?: string | null): string {
  const p = (perfil || '').toLowerCase()
  const n = (nome || '').toLowerCase()
  const s = (setor || '').toLowerCase()
  
  if (s === 'manutencao' || n.includes('manutenção') || n.includes('manutencao')) {
    return 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg'
  }
  if (s === 'farmacia' || n.includes('farmácia') || n.includes('farmacia')) {
    return 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg'
  }
  if (s === 'almoxarifado' || n.includes('almoxarifado')) {
    return 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/sky.jpg'
  }
  if (p === 'engenharia_clinica' || p === 'engenharia' || s === 'engenharia_clinica' || n.startsWith('eng.')) {
    return 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg'
  }
  if (p === 'coordenador' || p === 'gestor' || p === 'administrador' || n.startsWith('coord.')) {
    return 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg'
  }
  return 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg'
}

export function getAvatarGradientPorPerfil(perfil?: string, nome?: string, setor?: string | null): string {
  const p = (perfil || '').toLowerCase()
  const n = (nome || '').toLowerCase()
  const s = (setor || '').toLowerCase()
  
  if (s === 'manutencao') {
    return 'bg-gradient-to-tr from-amber-400 via-orange-400 to-amber-500'
  }
  if (s === 'farmacia') {
    return 'bg-gradient-to-tr from-emerald-400 via-teal-400 to-green-500'
  }
  if (s === 'almoxarifado') {
    return 'bg-gradient-to-tr from-sky-400 via-cyan-400 to-blue-400'
  }
  if (p === 'engenharia_clinica' || p === 'engenharia' || s === 'engenharia_clinica' || n.startsWith('eng.')) {
    return 'bg-gradient-to-tr from-orange-400 via-red-400 to-rose-500'
  }
  if (p === 'coordenador' || p === 'gestor' || p === 'administrador' || n.startsWith('coord.')) {
    return 'bg-gradient-to-tr from-purple-400 via-fuchsia-400 to-pink-500'
  }
  return 'bg-gradient-to-tr from-cyan-400 via-sky-400 to-blue-500'
}

interface AvatarPerfilProps {
  perfil?: string
  nome?: string
  setor?: string | null
  tamanho?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function AvatarPerfil({
  perfil,
  nome,
  setor,
  tamanho = 'md',
  className = '',
}: AvatarPerfilProps) {
  const src = getAvatarUrlPorPerfil(perfil, nome, setor)
  const fallbackGradient = getAvatarGradientPorPerfil(perfil, nome, setor)

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-7.5 h-7.5',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-13 h-13',
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 shadow-xs border border-white/80 aspect-square select-none ${fallbackGradient} ${sizeClasses[tamanho]} ${className}`}
    >
      <img
        src={src}
        alt={nome || perfil || 'Avatar'}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  )
}

interface AvatarContextProps {
  size?: 'sm' | 'md' | 'lg'
  imageLoaded: boolean
  setImageLoaded: (loaded: boolean) => void
}

const AvatarContext = createContext<AvatarContextProps>({
  size: 'md',
  imageLoaded: false,
  setImageLoaded: () => {},
})

export function Avatar({
  size = 'md',
  children,
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  className?: string
}) {
  const [imageLoaded, setImageLoaded] = useState(true)

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
  }

  return (
    <AvatarContext.Provider value={{ size, imageLoaded, setImageLoaded }}>
      <div
        className={`relative inline-flex items-center justify-center rounded-full overflow-hidden bg-slate-200 border border-white/40 shadow-xs shrink-0 aspect-square select-none ${sizeClasses[size]} ${className}`}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  )
}

Avatar.Image = function AvatarImage({
  src,
  alt = 'Avatar',
  className = '',
}: {
  src: string
  alt?: string
  className?: string
}) {
  const { setImageLoaded } = useContext(AvatarContext)

  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setImageLoaded(true)}
      onError={() => setImageLoaded(false)}
      className={`w-full h-full object-cover rounded-full aspect-square ${className}`}
    />
  )
}

Avatar.Fallback = function AvatarFallback({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const { imageLoaded } = useContext(AvatarContext)
  if (imageLoaded) return null

  return (
    <span className={`font-bold text-slate-600 uppercase ${className}`}>
      {children}
    </span>
  )
}
