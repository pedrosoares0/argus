'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { PillUsuario } from '@/components/ui/PillUsuario'
import { getUsuarioLogado, setUsuarioLogado, COORDENADOR_USER } from '@/lib/supabase/mockDb'
import { criarClienteSupabase } from '@/lib/supabase/client'

export default function LayoutCoordenador({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuAberto, setMenuAberto] = useState(false)
  const [usuario, setUsuario] = useState({ nome: 'Coord. Ana Beatriz', perfil: 'coordenador' })

  useEffect(() => {
    const stored = localStorage.getItem('argus_usuario_atual')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUsuario({ nome: parsed.nome, perfil: parsed.perfil })
        return
      } catch (e) {
        console.error(e)
      }
    }

    // Garante que o usuário logado é o coordenador
    const user = getUsuarioLogado()
    if (user.perfil !== 'coordenador') {
      setUsuarioLogado(COORDENADOR_USER)
      setUsuario({ nome: COORDENADOR_USER.nome, perfil: COORDENADOR_USER.perfil })
    } else {
      setUsuario({ nome: user.nome, perfil: user.perfil })
    }
  }, [])

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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F4F6FA] max-w-md mx-auto relative">
      {/* Header branco */}
      <header className="bg-white px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100/80">
        <Link href="/coordenador" className="text-xl font-bold text-gray-900 tracking-tight hover:opacity-80 transition-opacity font-brand">
          Argus
        </Link>
        <PillUsuario nome={usuario.nome} perfil={usuario.perfil} onClick={() => setMenuAberto(true)} />
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 pb-10">
        {children}
      </main>

      {/* ══════════════════════════════════════════════════
          DRAWER / MENU LATERAL
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
            
            {/* Botão Fechar */}
            <div className="absolute top-3.5 right-3.5 z-10">
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="w-6 h-6 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Perfil Header */}
            <div className="pt-10 pb-5 px-4 flex flex-col items-center text-center border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center text-white font-extrabold text-[16px] shadow-[0_4px_10px_rgba(124,58,237,0.12)] mb-2.5">
                AB
              </div>
              <h3 className="text-[14px] font-bold text-gray-900 leading-tight">{usuario.nome}</h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">Coordenador(a)</p>
            </div>

            {/* Menu Links */}
            <div className="flex-1 py-4 overflow-y-auto">
              <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase px-4 mb-2">
                Navegação
              </p>

              <div className="flex flex-col">
                {/* Validar NCs */}
                <Link
                  href="/coordenador"
                  onClick={() => setMenuAberto(false)}
                  className={[
                    'flex items-center gap-2.5 px-4 py-3 text-[13px] font-bold border-l-[3px] transition-all duration-150',
                    pathname === '/coordenador'
                      ? 'bg-[#7C3AED]/5 text-[#7C3AED] border-[#7C3AED]'
                      : 'text-gray-500 hover:text-[#7C3AED] hover:bg-gray-50 border-transparent',
                  ].join(' ')}
                >
                  <div className={pathname === '/coordenador' ? 'text-[#7C3AED]' : 'text-gray-400'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span>Validar NCs</span>
                </Link>

                {/* QR Codes & Etiquetas */}
                <Link
                  href="/coordenador/ativos"
                  onClick={() => setMenuAberto(false)}
                  className={[
                    'flex items-center gap-2.5 px-4 py-3 text-[13px] font-bold border-l-[3px] transition-all duration-150',
                    pathname === '/coordenador/ativos'
                      ? 'bg-[#7C3AED]/5 text-[#7C3AED] border-[#7C3AED]'
                      : 'text-gray-500 hover:text-[#7C3AED] hover:bg-gray-50 border-transparent',
                  ].join(' ')}
                >
                  <div className={pathname === '/coordenador/ativos' ? 'text-[#7C3AED]' : 'text-gray-400'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 8.25V4.875zM3.75 14.625c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125V18c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18v-3.375zM13.5 4.875c0-.621.504-1.125 1.125-1.125H18c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125h-3.375a1.125 1.125 0 01-1.125-1.125V4.875z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625v3.375c0 .621.504 1.125 1.125 1.125h1.5m0-5.625v5.625m0 0H18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-1.875m0 2.625V14.625" />
                    </svg>
                  </div>
                  <span>QR Codes & Etiquetas</span>
                </Link>
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
