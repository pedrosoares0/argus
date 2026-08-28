'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/Avatar'
import { traduzirErroAuth } from '@/lib/tratarErrosAuth'
import { OrbIA } from '@/components/ui/OrbIA'
import { ShieldCheck, Activity, Sparkles, CheckCircle2 } from 'lucide-react'

type PerfilUsuario = 'inspetor' | 'coordenador' | 'engenharia'

const PERFIS: { valor: PerfilUsuario; label: string; desc: string; avatarUrl: string; fallback: string }[] = [
  { 
    valor: 'inspetor', 
    label: 'Inspetor', 
    desc: 'Enfermeiros e Técnicos em campo', 
    avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg',
    fallback: 'IN' 
  },
  { 
    valor: 'engenharia', 
    label: 'Engenharia Clínica', 
    desc: 'Manutenção e reparo de ativos', 
    avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg',
    fallback: 'EN' 
  },
  { 
    valor: 'coordenador', 
    label: 'Coordenação', 
    desc: 'Visão setorial e validação de NCs', 
    avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/purple.jpg',
    fallback: 'CO' 
  },
]

function FormularioLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [perfilSelecionado, setPerfilSelecionado] = useState<PerfilUsuario>('inspetor')
  const [carregando, setCarregando] = useState(false)
  const [mostrarCredenciais, setMostrarCredenciais] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro(null)

    try {
      const supabase = criarClienteSupabase() as any
      
      let res = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      // Se falhar o login (por exemplo, primeiro acesso para contas mock padrão)
      if (res.error) {
        const signUpRes = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              hospital_id: 'e632822a-0000-0000-0000-000000000001',
              nome: email === 'inspetor@gmail.com' ? 'Enf. Pedro Soares' : email === 'engenharia@gmail.com' ? 'Eng. Carlos Eduardo' : 'Coord. Paulo Morais',
              perfil: email === 'inspetor@gmail.com' ? 'inspetor' : email === 'engenharia@gmail.com' ? 'engenharia_clinica' : 'coordenador'
            }
          }
        })

        if (!signUpRes.error) {
          res = await supabase.auth.signInWithPassword({
            email,
            password: senha,
          })
        } else {
          console.error('Erro de login original:', res.error)
          setErro(traduzirErroAuth(res.error))
          setCarregando(false)
          return
        }
      }

      if (res.error || !res.data.user) {
        setErro(traduzirErroAuth(res.error || 'Usuário nulo'))
        setCarregando(false)
        return
      }

      let profile = null
      for (let i = 0; i < 4; i++) {
        const { data: p } = await supabase
          .from('usuarios')
          .select('id, nome, perfil')
          .eq('id', res.data.user.id)
          .single()
        
        if (p) {
          profile = p
          break
        }
        await new Promise(r => setTimeout(r, 200))
      }

      if (!profile) {
        profile = {
          id: res.data.user.id,
          nome: res.data.user.user_metadata?.nome || email.split('@')[0],
          perfil: res.data.user.user_metadata?.perfil || perfilSelecionado
        }
      }

      localStorage.setItem('argus_usuario_atual', JSON.stringify({
        id: res.data.user.id,
        nome: profile.nome,
        perfil: profile.perfil
      }))

      const rotas: Record<string, string> = {
        inspetor: '/inspetor',
        coordenador: '/coordenador',
        engenharia_clinica: '/engenharia',
        tecnico: '/engenharia',
        gestor: '/gestor',
        administrador: '/admin',
      }

      const nextParam = searchParams?.get('next')
      if (nextParam) {
        router.push(nextParam)
      } else {
        router.push(rotas[profile.perfil] || '/inspetor')
      }
    } catch (err: any) {
      console.error(err)
      setErro(traduzirErroAuth(err))
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col lg:flex-row bg-[#F8FAFC]">
      
      {/* ══════════════════════════════════════════════════
          LADO ESQUERDO (HERO VISUAL EXCLUSIVO DESKTOP)
         ══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[52%] relative overflow-hidden bg-slate-950 text-white flex-col justify-between p-12 xl:p-16 select-none">
        {/* Glow de fundo */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Topo: Logo & Badge */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight font-brand text-white">
                Argus
              </span>
              <span className="block text-[10.5px] font-bold uppercase tracking-widest text-sky-400">
                Hospital Itaberaba
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-200">
            <OrbIA tamanho={18} />
            <span className="font-semibold text-[11.5px] tracking-wide">Argus IA Ativa</span>
          </div>
        </div>

        {/* Centro: Mensagem & Cards de Destaque */}
        <div className="relative z-10 my-auto py-12 space-y-8 max-w-lg">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Prontidão Operacional do Centro Cirúrgico.
            </h2>
            <p className="text-sm xl:text-base text-slate-400 leading-relaxed">
              Gestão preventiva de salas, rastreamento de Não Conformidades e suporte de inteligência artificial em tempo real.
            </p>
          </div>

          {/* Grid de Métricas Visuais */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Rondas de Checklist</span>
              </div>
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-[11px] text-slate-400">Salas monitoradas por QR Code</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Activity className="w-4 h-4" />
                <span>Roteamento Ágil</span>
              </div>
              <p className="text-2xl font-bold text-white">&lt; 15 min</p>
              <p className="text-[11px] text-slate-400">Atribuição a setores técnicos</p>
            </div>
          </div>
        </div>

        {/* Rodapé do Hero */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <span>© 2026 Argus Hospitalar</span>
          <span className="flex items-center gap-1.5 text-sky-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Prontidão Cirúrgica 4.0
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          LADO DIREITO (FORMULÁRIO DE LOGIN RESPONSIVO)
         ══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16 min-h-[100dvh] lg:min-h-0 select-none">
        
        {/* Mobile Header (visível apenas < lg) */}
        <div className="lg:hidden w-full max-w-sm text-center mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-brand">
            Argus
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Plataforma de Prontidão Operacional do Centro Cirúrgico
          </p>
        </div>

        {/* Container do Formulário */}
        <div className="w-full max-w-sm sm:max-w-md space-y-6">
          
          <div className="space-y-1 text-left hidden lg:block">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Acesse sua conta
            </h2>
            <p className="text-xs text-slate-500">
              Insira suas credenciais para gerenciar salas e inspeções.
            </p>
          </div>

          {/* Seletor Rápido de Credenciais de Demonstração */}
          <div className="text-center lg:text-left">
            <button
              type="button"
              onClick={() => setMostrarCredenciais(!mostrarCredenciais)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/70 text-[10.5px] font-bold uppercase tracking-wider text-slate-600 transition-all cursor-pointer active:scale-95"
            >
              <span>Contas de Teste Rápido</span>
              <svg className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${mostrarCredenciais ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Painel de Perfis Expansível */}
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{
                maxHeight: mostrarCredenciais ? '100px' : '0px',
                opacity: mostrarCredenciais ? 1 : 0,
                marginTop: mostrarCredenciais ? '12px' : '0px',
              }}
            >
              <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 shadow-xs">
                <div className="flex justify-around items-center gap-2">
                  {PERFIS.map((p) => {
                    const ativo = perfilSelecionado === p.valor
                    return (
                      <button
                        key={p.valor}
                        type="button"
                        onClick={() => {
                          setPerfilSelecionado(p.valor)
                          const emails: Record<string, string> = {
                            inspetor: 'inspetor@gmail.com',
                            coordenador: 'coordenador@gmail.com',
                            engenharia: 'engenharia@gmail.com',
                          }
                          setEmail(emails[p.valor])
                          setSenha('123456')
                        }}
                        className="flex flex-col items-center gap-1 focus:outline-none group select-none cursor-pointer"
                      >
                        <div
                          className={`rounded-full p-0.5 aspect-square flex items-center justify-center transition-all ${
                            ativo
                              ? 'ring-2 ring-sky-500 ring-offset-2 scale-105 shadow-sm'
                              : 'opacity-60 hover:opacity-100 hover:scale-105 active:scale-95'
                          }`}
                        >
                          <Avatar size="sm">
                            <Avatar.Image alt={p.label} src={p.avatarUrl} />
                            <Avatar.Fallback>{p.fallback}</Avatar.Fallback>
                          </Avatar>
                        </div>
                        <span
                          className={`text-[10px] font-bold tracking-tight text-center ${
                            ativo ? 'text-sky-600 font-extrabold' : 'text-slate-500'
                          }`}
                        >
                          {p.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card Principal do Login */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200/80 space-y-5">
            <form onSubmit={handleEntrar} className="space-y-4">
              
              {erro && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 text-center leading-relaxed animate-fadeIn">
                  {erro}
                </div>
              )}
              
              {/* Input de Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all font-normal"
                />
              </div>

              {/* Input de Senha */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase block">
                    Senha
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    Mín. 6 dígitos
                  </span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                />
              </div>

              {/* Botão Entrar */}
              <div className="pt-2">
                <LiquidMetalButton
                  type="submit"
                  disabled={carregando}
                  className="w-full"
                >
                  {carregando ? 'Entrando...' : 'Entrar no Sistema'}
                </LiquidMetalButton>
              </div>
            </form>

            {/* Link para Cadastro */}
            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Não possui conta?{' '}
                <Link
                  href="/cadastro"
                  className="text-sky-600 hover:text-sky-700 font-bold ml-1 hover:underline cursor-pointer"
                >
                  Cadastre-se
                </Link>
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}

export default function PaginaLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    }>
      <FormularioLogin />
    </Suspense>
  )
}
