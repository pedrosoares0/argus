'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PillUsuario } from '@/components/ui/PillUsuario'
import { IconeMascote } from '@/components/ui/IconeMascote'

/**
 * Layout do Inspetor — refinado conforme protótipo de referência.
 * Header com mascote à esquerda, PillUsuario ("Dr. Paulo") à direita.
 */
export default function LayoutInspetor({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const itensNav = [
    {
      href: '/inspetor',
      label: 'Início',
      icone: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      href: '/inspetor/inspecoes',
      label: 'Inspeções',
      icone: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      href: '/inspetor/pendencias',
      label: 'Pendências',
      icone: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col bg-fundo max-w-md mx-auto relative shadow-2xl">
      {/* Header fixo com efeito glass */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-separador/60">
        <div className="flex items-center justify-between px-5 py-3.5">
          <Link href="/inspetor" className="active:scale-95 transition-transform">
            <IconeMascote tamanho={36} />
          </Link>
          <PillUsuario nome="Dr. Paulo" />
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 pb-28">
        {children}
      </main>

      {/* Nav inferior — estilo Tab Bar do iOS */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-t border-separador/60 max-w-md mx-auto">
        <div className="flex items-center justify-around px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {itensNav.map((item) => {
            const ativo = pathname === item.href || 
              (item.href !== '/inspetor' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl',
                  'transition-all duration-200',
                  ativo
                    ? 'text-primaria font-semibold scale-105'
                    : 'text-texto-terciario hover:text-texto-secundario',
                ].join(' ')}
              >
                {item.icone}
                <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
