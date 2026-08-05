import React from 'react'

interface ItemListaProps {
  titulo: string
  subtitulo?: string
  icone?: React.ReactNode
  acessorio?: React.ReactNode
  onClick?: () => void
  className?: string
}

/**
 * Item de lista com chevron indicando navegação.
 * Inspirado nos UITableView do iOS — estilo grouped.
 */
export function ItemLista({
  titulo,
  subtitulo,
  icone,
  acessorio,
  onClick,
  className = '',
}: ItemListaProps) {
  const Componente = onClick ? 'button' : 'div'

  return (
    <Componente
      className={[
        'flex items-center gap-3 w-full',
        'px-4 py-3.5',
        'text-left',
        onClick
          ? 'cursor-pointer hover:bg-texto/[0.03] active:bg-texto/[0.06] transition-colors duration-150'
          : '',
        className,
      ].join(' ')}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {/* Ícone à esquerda */}
      {icone && (
        <div className="shrink-0 w-9 h-9 rounded-sm flex items-center justify-center bg-primaria/8 text-primaria">
          {icone}
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-texto truncate">{titulo}</p>
        {subtitulo && (
          <p className="text-sm text-texto-secundario truncate mt-0.5">
            {subtitulo}
          </p>
        )}
      </div>

      {/* Acessório / Chevron */}
      {acessorio || (
        onClick && (
          <svg
            className="shrink-0 h-4 w-4 text-texto-terciario"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        )
      )}
    </Componente>
  )
}
