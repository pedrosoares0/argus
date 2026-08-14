'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PillUsuario } from '@/components/ui/PillUsuario'
import { criarClienteSupabase } from '@/lib/supabase/client'

export default function LayoutInspetor({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)
  const [usuario, setUsuario] = useState<{ nome: string; perfil: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('argus_usuario_atual')
    if (!stored) {
      const nextPath = window.location.pathname + window.location.search
      router.push(`/login?next=${encodeURIComponent(nextPath)}`)
    } else {
      try {
        setUsuario(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    }
  }, [router])

  const nomeExibido = usuario?.nome || 'Usuário'
  const perfilExibido = usuario?.perfil === 'inspetor' ? 'Inspetor(a)' : usuario?.perfil === 'coordenador' ? 'Coordenador(a)' : usuario?.perfil === 'engenharia_clinica' ? 'Engenharia Clínica' : usuario?.perfil === 'gestor' ? 'Gestor(a)' : 'Administrador(a)'
  const iniciais = nomeExibido.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()

  const itensNav = [
    {
      href: '/inspetor/inspecoes',
      label: 'Inspeções',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
    },
    {
      href: '/inspetor',
      label: 'Início',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      href: '/inspetor/pendencias',
      label: 'Pendências',
      icone: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
  ]

  async function handleSair() {
    try {
      const supabase = criarClienteSupabase()
      await supabase.auth.signOut()
    } catch (e) {
      console.error(e)
    }
    localStorage.removeItem('argus_usuario_atual')
    setMenuAberto(false)
    router.push('/login')
  }

  const isGradientPage = pathname === '/inspetor'

  return (
    <div className={`min-h-[100dvh] flex flex-col ${isGradientPage ? 'bg-gradient-to-b from-[#79C7FF] via-[#79C7FF]/5 to-[#FAFAFC] to-[50%]' : 'bg-[#FAFAFC]'} max-w-md mx-auto relative`}>
      {/* Header Condicional */}
      <header className={`px-5 pt-5 pb-3 flex items-center justify-between transition-all duration-200 ${isGradientPage ? 'bg-transparent' : 'bg-white border-b border-gray-100/80'}`}>
        <Link href="/inspetor" className={`text-xl font-bold tracking-tight hover:opacity-80 transition-opacity font-brand ${isGradientPage ? 'text-white' : 'text-gray-900'}`}>
          Argus
        </Link>
        <PillUsuario nome={nomeExibido} perfil={usuario?.perfil} onClick={() => setMenuAberto(true)} />
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 pb-28">
        {children}
      </main>

      {/* ══════════════════════════════════════════════════
          NAV INFERIOR — TRANSLÚCIDA COM BUBBLE EFFECT
          E INDICADOR EM CÁPSULA LARGA (APPLE STYLE)
         ══════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pointer-events-none">
        <nav className="pointer-events-auto bg-white/40 backdrop-blur-[24px] saturate-[180%] rounded-full border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.7)] p-1.5">
          <div className="flex items-center justify-between gap-1">
            {itensNav.map((item) => {
              const ativo = item.href === '/inspetor'
                ? pathname === '/inspetor'
                : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (item.href === '/inspetor/pendencias') {
                      e.preventDefault()
                    }
                  }}
                  className={[
                    'flex-1 flex flex-col items-center justify-center py-1.5 px-3 rounded-full cursor-pointer',
                    'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92]',
                    ativo
                      ? 'bg-gradient-to-b from-[#246BFD]/16 to-[#246BFD]/8 text-[#246BFD] shadow-[0_3px_10px_rgba(36,107,253,0.15),inset_0_1px_1.5px_rgba(255,255,255,0.8),inset_0_0_0_1px_rgba(36,107,253,0.18)] font-black'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/30',
                  ].join(' ')}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {item.icone}
                  </div>
                  <span className="text-[9.5px] font-bold tracking-wide mt-0.5">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════
          DRAWER / MENU LATERAL (Compact, Clean & Flat)
         ══════════════════════════════════════════════════ */}
      {menuAberto && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop blur */}
          <div
            className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setMenuAberto(false)}
          />

          {/* Container do Drawer */}
          <div className="relative w-[220px] h-full bg-white shadow-[-2px_0_15px_rgba(0,0,0,0.03)] flex flex-col rounded-none overflow-hidden animate-[slideLeft_0.25s_cubic-bezier(0.25,1,0.5,1)] border-l border-gray-100/70">
            
            {/* Botão Fechar compacto */}
            <div className="absolute top-3.5 right-3.5 z-10">
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="w-6 h-6 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Perfil Header compacto */}
            <div className="pt-10 pb-5 px-4 flex flex-col items-center text-center border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#246BFD] to-[#1253f6] flex items-center justify-center text-white font-extrabold text-[14px] shadow-[0_4px_10px_rgba(36,107,253,0.12)] mb-2.5">
                {iniciais}
              </div>
              <h3 className="text-[14px] font-bold text-gray-900 leading-tight">{nomeExibido}</h3>
              <p className="text-[11px] text-gray-400 font-bold mt-0.5">{perfilExibido}</p>
            </div>

            {/* Menu Links */}
            <div className="flex-1 py-4 overflow-y-auto">
              <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase px-4 mb-2">
                Navegação
              </p>

              <div className="flex flex-col">
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
                        'flex items-center gap-2.5 px-4 py-3 text-[13px] font-bold transition-all duration-150',
                        ativo
                          ? 'bg-[#246BFD]/5 text-[#246BFD] border-l-[3px] border-[#246BFD]'
                          : 'text-gray-600 hover:bg-gray-50 border-l-[3px] border-transparent hover:text-gray-900',
                      ].join(' ')}
                    >
                      <div className={ativo ? 'text-[#246BFD]' : 'text-gray-400'}>
                        {item.icone}
                      </div>
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Rodapé: Sair */}
            <div className="p-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSair}
                className="w-full py-2.5 rounded-none text-[13px] font-bold text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 hover:border-red-100/50 transition-all duration-150 border border-gray-200/50 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sair
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
