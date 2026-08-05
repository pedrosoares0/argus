'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'

type PerfilUsuario = 'inspetor' | 'coordenador' | 'engenharia' | 'gestor' | 'admin'

const PERFIS: { valor: PerfilUsuario; label: string; desc: string; icone: string }[] = [
  { valor: 'inspetor', label: 'Inspetor', desc: 'Enfermeiros e Técnicos em campo', icone: '📋' },
  { valor: 'coordenador', label: 'Coordenador', desc: 'Visão setorial e validação de NCs', icone: '🔑' },
  { valor: 'engenharia', label: 'Engenharia Clínica', desc: 'Manutenção e reparo de ativos', icone: '🛠️' },
  { valor: 'gestor', label: 'Gestor', desc: 'Painéis, indicadores e SLA', icone: '📊' },
  { valor: 'admin', label: 'Administrador', desc: 'Gestão completa do sistema', icone: '⚙️' },
]

export default function PaginaLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilUsuario>('inspetor')
  const [carregando, setCarregando] = useState(false)

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    await new Promise((r) => setTimeout(r, 800))

    // Redireciona baseado no perfil selecionado
    const rotas: Record<PerfilUsuario, string> = {
      inspetor: '/inspetor',
      coordenador: '/coordenador',
      engenharia: '/engenharia',
      gestor: '/gestor',
      admin: '/admin',
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

            {/* ── Seletor de Perfil (Simulação) ── */}
            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                Simular Acesso como
              </label>
              
              <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1 border border-gray-100 rounded-2xl p-2 bg-[#F4F6FA]/50 scrollbar-thin">
                {PERFIS.map((p) => {
                  const ativo = perfilSelecionado === p.valor
                  return (
                    <button
                      key={p.valor}
                      type="button"
                      onClick={() => setPerfilSelecionado(p.valor)}
                      className={[
                        'w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200 active:scale-[0.98]',
                        ativo
                          ? 'border-[#246BFD]/30 bg-[#246BFD]/5 text-[#246BFD] shadow-sm'
                          : 'border-transparent bg-white text-gray-600 hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <span className="text-lg shrink-0">{p.icone}</span>
                      <div className="min-w-0">
                        <p className={`text-[13px] font-bold ${ativo ? 'text-[#246BFD]' : 'text-gray-900'}`}>
                          {p.label}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {p.desc}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
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
