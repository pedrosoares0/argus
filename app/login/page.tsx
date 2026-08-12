'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { setUsuarioLogado, DEFAULT_USER, COORDENADOR_USER } from '@/lib/supabase/mockDb'
import { criarClienteSupabase } from '@/lib/supabase/client'

import { Avatar } from '@/components/ui/Avatar'

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

      // Se falhar o login (por exemplo, usuário não existe ou senha hash corrompida por inserções manuais anteriores)
      if (res.error) {
        // Tenta cadastrar o usuário de forma oficial via API (que preenche todas as tabelas e colunas com a estrutura exata exigida pelo GoTrue)
        const signUpRes = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              hospital_id: 'e632822a-0000-0000-0000-000000000001', // Hospital Público Itaberaba
              nome: email === 'inspetor@gmail.com' ? 'Enf. Pedro Soares' : email === 'engenharia@gmail.com' ? 'Eng. Carlos Eduardo' : 'Coord. Ana Beatriz',
              perfil: email === 'inspetor@gmail.com' ? 'inspetor' : email === 'engenharia@gmail.com' ? 'engenharia_clinica' : 'coordenador'
            }
          }
        })

        if (!signUpRes.error) {
          // Tenta fazer o login novamente após o cadastro automático
          res = await supabase.auth.signInWithPassword({
            email,
            password: senha,
          })
        } else {
          // Se o cadastro também falhar, mostra o erro original
          console.error('Erro de login original:', res.error)
          setErro(`Login inválido ou cadastro indisponível: ${res.error.message || JSON.stringify(res.error)}`)
          setCarregando(false)
          return
        }
      }

      if (res.error || !res.data.user) {
        setErro(`Erro ao autenticar: ${res.error?.message || 'Usuário nulo'}`)
        setCarregando(false)
        return
      }

      // Buscar perfil na tabela public.usuarios (com tolerância de milissegundos para o trigger assíncrono do Postgres terminar de rodar)
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
        await new Promise((resolve) => setTimeout(resolve, 200))
      }

      if (!profile) {
        setErro('Usuário autenticado, mas o perfil não pôde ser carregado na tabela usuarios.')
        setCarregando(false)
        return
      }

      // Bridging session profile to mockDb localStorage state so coordinator and engineering pages continue working
      localStorage.setItem('sentry_usuario_atual', JSON.stringify({
        id: profile.id,
        nome: profile.nome,
        perfil: profile.perfil
      }))

      // Redireciona baseado no perfil real ou parâmetro next
      const rotas: Record<string, string> = {
        inspetor: '/inspetor',
        coordenador: '/coordenador',
        engenharia_clinica: '/engenharia',
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
      setErro('Erro na conexão com o servidor.')
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8 bg-gradient-to-b from-[#79C7FF] via-[#79C7FF]/5 to-[#FAFAFC] to-[50%] select-none">
      <div className="w-full max-w-sm space-y-8 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Cabeçalho de Identidade (Sem mascote blop) */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Sentry
          </h1>
          <p className="text-sm text-white/80 font-semibold mt-1.5 leading-snug">
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

          {/* Painel de Perfis Animado (Sleek Glassmorphism & Compact) */}
          <div
            className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              maxHeight: mostrarCredenciais ? '90px' : '0px',
              opacity: mostrarCredenciais ? 1 : 0,
              marginTop: mostrarCredenciais ? '14px' : '0px',
            }}
          >
            <div className="max-w-[290px] mx-auto bg-white/35 backdrop-blur-md rounded-[20px] p-2.5 border border-white/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.04)]">
              <div className="flex justify-center gap-3">
                {PERFIS.map((p) => {
                  const ativo = perfilSelecionado === p.valor
                  const labelCurto: Record<string, string> = {
                    inspetor: 'Inspetor',
                    engenharia: 'Engenharia',
                    coordenador: 'Coordenação',
                  }
                  
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
                      className="flex flex-col items-center gap-1.5 focus:outline-none group select-none cursor-pointer"
                    >
                      <div
                        className={`rounded-full p-0.5 aspect-square flex items-center justify-center transition-all duration-200 ${
                          ativo
                            ? 'ring-2 ring-[#246BFD]/30 ring-offset-2 scale-105 shadow-[0_2px_8px_rgba(36,107,253,0.15)]'
                            : 'opacity-60 hover:opacity-100 hover:scale-105 active:scale-95'
                        }`}
                      >
                        <Avatar size="md">
                          <Avatar.Image
                            alt={p.label}
                            src={p.avatarUrl}
                          />
                          <Avatar.Fallback>{p.fallback}</Avatar.Fallback>
                        </Avatar>
                      </div>
                      <span
                        className={`text-[10px] font-bold tracking-tight text-center whitespace-nowrap transition-colors ${
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
            
            {erro && (
              <p className="text-xs font-bold text-red-500 bg-red-50/50 border border-red-200/50 rounded-xl px-4 py-2.5 text-center">
                {erro}
              </p>
            )}
            
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
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3.5 text-[16px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
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
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3.5 text-[16px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
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

            {/* Link para Cadastro */}
            <div className="text-center pt-1.5">
              <Link
                href="/cadastro"
                className="text-xs font-bold text-[#246BFD] hover:underline"
              >
                Não tem uma conta? Cadastre-se
              </Link>
            </div>

          </form>
        </div>

      </div>
    </div>
  )
}

export default function PaginaLogin() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-[#F4F6FA] text-sm text-gray-400">Carregando...</div>}>
      <FormularioLogin />
    </Suspense>
  )
}
