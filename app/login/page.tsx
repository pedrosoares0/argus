'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { setUsuarioLogado, DEFAULT_USER, COORDENADOR_USER } from '@/lib/supabase/mockDb'

type PerfilUsuario = 'inspetor' | 'coordenador' | 'engenharia' | 'gestor'

const PERFIS: { valor: PerfilUsuario; label: string; desc: string; icone: string }[] = [
  { valor: 'inspetor', label: 'Inspetor', desc: 'Enfermeiros e Técnicos em campo', icone: '📋' },
  { valor: 'coordenador', label: 'Coordenador', desc: 'Visão setorial e validação de NCs', icone: '🔑' },
  { valor: 'engenharia', label: 'Engenharia Clínica', desc: 'Manutenção e reparo de ativos', icone: '🛠️' },
  { valor: 'gestor', label: 'Gestor', desc: 'Painéis, indicadores e SLA', icone: '📊' },
]

export default function PaginaLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilUsuario>('inspetor')
  const [carregando, setCarregando] = useState(false)
  const [mostrarCredenciais, setMostrarCredenciais] = useState(false)

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    await new Promise((r) => setTimeout(r, 800))

    // Configura o usuário logado baseado no perfil
    if (perfilSelecionado === 'coordenador') {
      setUsuarioLogado(COORDENADOR_USER)
    } else if (perfilSelecionado === 'engenharia') {
      setUsuarioLogado(DEFAULT_USER)
    }

    // Redireciona baseado no perfil selecionado
    const rotas: Record<PerfilUsuario, string> = {
      inspetor: '/inspetor',
      coordenador: '/coordenador',
      engenharia: '/engenharia',
      gestor: '/gestor',
    }

    router.push(rotas[perfilSelecionado])
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8 bg-[#F4F6FA] select-none">
      <div className="w-full max-w-sm space-y-8 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Cabeçalho de Identidade (Sem mascote blop) */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Sentry
          </h1>
          <p className="text-sm text-gray-400 font-semibold mt-1.5 leading-snug">
            Plataforma de Prontidão Operacional <br /> do Centro Cirúrgico
          </p>

          {/* Botão CREDENCIAIS */}
          <button
            type="button"
            onClick={() => setMostrarCredenciais(!mostrarCredenciais)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-gray-200/50 shadow-[0_2px_6px_rgba(0,0,0,0.02)] text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all duration-200 cursor-pointer active:scale-95 select-none"
          >
            <span>CREDENCIAIS</span>
            <svg className={`w-2.5 h-2.5 text-gray-400 transition-transform duration-300 ${mostrarCredenciais ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Painel de Perfis Animado */}
          <div
            className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              maxHeight: mostrarCredenciais ? '120px' : '0px',
              opacity: mostrarCredenciais ? 1 : 0,
              marginTop: mostrarCredenciais ? '14px' : '0px',
            }}
          >
            <div className="bg-white rounded-[24px] p-4 border border-gray-100/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
              <div className="flex justify-center gap-4">
                {PERFIS.map((p) => {
                  const ativo = perfilSelecionado === p.valor
                  const labelCurto: Record<string, string> = {
                    inspetor: 'Inspetor',
                    coordenador: 'Coord.',
                    engenharia: 'Engenharia',
                    gestor: 'Gestor',
                    admin: 'Admin',
                  }
                  
                  return (
                    <button
                      key={p.valor}
                      type="button"
                      onClick={() => {
                        setPerfilSelecionado(p.valor)
                        const emails: Record<string, string> = {
                          inspetor: 'inspetor.pedro@sentry.com',
                          coordenador: 'coordenador.ana@sentry.com',
                          engenharia: 'engenharia.carlos@sentry.com',
                          gestor: 'gestor.paulo@sentry.com',
                          admin: 'admin.sentry@sentry.com',
                        }
                        setEmail(emails[p.valor])
                        setSenha('senha123')
                      }}
                      className="flex flex-col items-center gap-1.5 focus:outline-none group select-none cursor-pointer"
                    >
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all duration-200 border ${
                          ativo
                            ? 'bg-[#246BFD] border-[#246BFD] text-white shadow-[0_4px_12px_rgba(36,107,253,0.25)] scale-105'
                            : 'bg-[#F8FAFC] border-gray-200/50 text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:scale-95'
                        }`}
                      >
                        {p.icone}
                      </div>
                      <span
                        className={`text-[9px] font-bold tracking-tight text-center whitespace-nowrap transition-colors ${
                          ativo ? 'text-[#246BFD]' : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      >
                        {labelCurto[p.valor]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Card Principal do Login */}
        <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-gray-100/80 space-y-6">
          <form onSubmit={handleEntrar} className="space-y-4">
            
            {/* Input de Email */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3.5 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
              />
            </div>

            {/* Input de Senha */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                Senha
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3.5 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
              />
            </div>

            {/* Botão Entrar */}
            <div className="pt-2">
              <Botao
                type="submit"
                variante="primario"
                tamanho="lg"
                larguraTotal
                carregando={carregando}
              >
                Entrar
              </Botao>
            </div>

          </form>
        </div>

      </div>
    </div>
  )
}
