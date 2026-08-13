'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PillUsuario } from '@/components/ui/PillUsuario'
import { getUsuarioLogado, setUsuarioLogado, DEFAULT_USER } from '@/lib/supabase/mockDb'
import { criarClienteSupabase } from '@/lib/supabase/client'

export default function LayoutEngenharia({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [menuAberto, setMenuAberto] = useState(false)
  const [usuario, setUsuario] = useState({ nome: 'Eng. Carlos', perfil: 'engenharia_clinica' })

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

    const user = getUsuarioLogado()
    if (user.perfil !== 'engenharia_clinica') {
      setUsuarioLogado(DEFAULT_USER)
      setUsuario({ nome: DEFAULT_USER.nome, perfil: DEFAULT_USER.perfil })
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
        <Link href="/engenharia" className="text-xl font-bold text-gray-900 tracking-tight hover:opacity-80 transition-opacity font-brand">
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
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#246BFD] to-[#1253f6] flex items-center justify-center text-white font-extrabold text-[16px] shadow-[0_4px_10px_rgba(36,107,253,0.12)] mb-2.5">
                CE
              </div>
              <h3 className="text-[14px] font-bold text-gray-900 leading-tight">{usuario.nome}</h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">Engenharia Clínica</p>
            </div>

            {/* Menu Links */}
            <div className="flex-1 py-4 overflow-y-auto">
              <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase px-4 mb-2">
                Navegação
              </p>

              <div className="flex flex-col">
                <Link
                  href="/engenharia"
                  onClick={() => setMenuAberto(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-[13px] font-bold bg-[#246BFD]/5 text-[#246BFD] border-l-[3px] border-[#246BFD] transition-all duration-150"
                >
                  <div className="text-[#246BFD]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.29-3.52c-.58-.39-1.13.12-.8.78l3.06 6.13c.25.5.92.5 1.17 0l3.06-6.13c.33-.66-.22-1.17-.8-.78l-5.29 3.52zM9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                    </svg>
                  </div>
                  <span>Fila de NCs</span>
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
