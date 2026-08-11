'use client'

import React, { createContext, useContext, useState } from 'react'

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
