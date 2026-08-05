import React from 'react'

interface IconeMascoteProps {
  tamanho?: number
  className?: string
}

/**
 * Mascote Sentry / Health Tech inspirado no design de referência:
 * Squircle azul com cantos muito suaves, gradiente azul vibrante a ciano,
 * e dois olhinhos brancos característicos.
 */
export function IconeMascote({ tamanho = 44, className = '' }: IconeMascoteProps) {
  return (
    <div
      style={{ width: tamanho, height: tamanho }}
      className={[
        'relative inline-flex items-center justify-center shrink-0',
        'rounded-[28%] overflow-hidden',
        'bg-gradient-to-b from-[#38C6FF] via-[#0088FF] to-[#0055FE]',
        'shadow-[0_4px_14px_rgba(0,122,255,0.35)]',
        'border border-white/40',
        className,
      ].join(' ')}
    >
      {/* Brilho interno no topo */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

      {/* Olho esquerdo */}
      <div className="w-[18%] h-[28%] bg-white rounded-full mx-[5%] shadow-sm" />

      {/* Olho direito */}
      <div className="w-[18%] h-[28%] bg-white rounded-full mx-[5%] shadow-sm" />
    </div>
  )
}
