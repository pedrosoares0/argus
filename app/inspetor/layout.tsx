'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PillUsuario } from '@/components/ui/PillUsuario'

export default function LayoutInspetor({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const itensNav = [
    {
      href: '/inspetor/inspecoes',
      label: 'Inspeções',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      href: '/inspetor',
      label: 'Início',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      href: '/inspetor/pendencias',
      label: 'Pendências',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F4F6FA] max-w-md mx-auto relative">
      {/* Header branco */}
      <header className="bg-white px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100/80">
        <Link href="/inspetor" className="text-xl font-bold text-gray-900 tracking-tight hover:opacity-80 transition-opacity">
          Sentry
        </Link>
        <PillUsuario nome="Dr. Paulo" />
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 pb-28">
        {children}
      </main>

      {/* Nav inferior — Glass flutuante com Efeito Bubble */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <nav className="bg-white/45 backdrop-blur-[18px] rounded-[24px] border border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around px-2 py-2.5">
            {itensNav.map((item) => {
              const ativo = item.href === '/inspetor'
                ? pathname === '/inspetor'
                : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex flex-col items-center gap-0.5 px-5 py-2 rounded-[18px]',
                    'transition-all duration-300 ease-out active:scale-[0.92]',
                    ativo
                      ? 'text-[#246BFD] bg-[#246BFD]/8 shadow-[inset_0_0_0_1px_rgba(36,107,253,0.05)] font-bold'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/40',
                  ].join(' ')}
                >
                  {item.icone}
                  <span className="text-[10px] tracking-wide mt-0.5">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
