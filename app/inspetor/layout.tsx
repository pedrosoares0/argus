'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PillUsuario } from '@/components/ui/PillUsuario'

export default function LayoutInspetor({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)

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

  function handleSair() {
    setMenuAberto(false)
    router.push('/login')
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F4F6FA] max-w-md mx-auto relative">
      {/* Header branco */}
      <header className="bg-white px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100/80">
        <Link href="/inspetor" className="text-xl font-bold text-gray-900 tracking-tight hover:opacity-80 transition-opacity">
          Sentry
        </Link>
        <PillUsuario nome="Dr. Paulo" onClick={() => setMenuAberto(true)} />
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

      {/* ══════════════════════════════════════════════════
          DRAWER / MENU LATERAL (Apple Sidebar)
         ══════════════════════════════════════════════════ */}
      {menuAberto && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop blur */}
          <div
            className="absolute inset-0 bg-black/15 backdrop-blur-[1px] animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setMenuAberto(false)}
          />

          {/* Container do Drawer */}
          <div className="relative w-[280px] h-full bg-[#F4F6FA] shadow-[-4px_0_24px_rgba(0,0,0,0.08)] flex flex-col rounded-l-[28px] overflow-hidden animate-[slideLeft_0.25s_cubic-bezier(0.25,1,0.5,1)]">
            
            {/* Perfil Header */}
            <div className="bg-white p-6 pt-10 border-b border-gray-100 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#246BFD] to-[#1253f6] flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_14px_rgba(36,107,253,0.2)]">
                DP
              </div>
              <div>
                <p className="text-[16px] font-bold text-gray-900">Dr. Paulo</p>
                <p className="text-[12px] text-gray-400 font-medium">Médico / Coordenador</p>
              </div>
            </div>

            {/* Menu Links */}
            <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
              
              {/* Seção 1: Navegação Principal */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase px-2">
                  Navegação Principal
                </p>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.01)] overflow-hidden">
                  {itensNav.map((item) => {
                    const ativo = item.href === '/inspetor'
                      ? pathname === '/inspetor'
                      : pathname.startsWith(item.href)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuAberto(false)}
                        className={[
                          'flex items-center gap-3 px-4 py-3 text-[14px] font-semibold transition-colors',
                          ativo
                            ? 'bg-[#246BFD]/5 text-[#246BFD]'
                            : 'text-gray-700 hover:bg-gray-50',
                        ].join(' ')}
                      >
                        <div className={ativo ? 'text-[#246BFD]' : 'text-gray-400'}>
                          {item.icone}
                        </div>
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Rodapé: Sair */}
            <div className="p-4 bg-white border-t border-gray-100">
              <button
                type="button"
                onClick={handleSair}
                className="w-full py-3.5 rounded-full text-[14px] font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100/70 transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sair da Conta
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Animação do drawer */}
      <style jsx global>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
