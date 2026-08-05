'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconeMascote } from '@/components/ui/IconeMascote'
import { Botao } from '@/components/ui/Botao'
import { criarClienteSupabase } from '@/lib/supabase/client'

export default function PaginaLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    try {
      const supabase = criarClienteSupabase()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) {
        setErro(
          error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos.'
            : error.message
        )
        return
      }

      // Buscar perfil do usuário para redirecionar
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErro('Erro ao carregar dados do usuário.')
        return
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('perfil')
        .eq('auth_user_id', user.id)
        .single() as { data: { perfil: string } | null }

      // Redirecionar baseado no perfil
      const rotasPorPerfil: Record<string, string> = {
        inspetor: '/inspetor',
        coordenador: '/coordenador',
        gestor: '/gestor',
        engenharia_clinica: '/engenharia',
        administrador: '/admin',
      }

      const rota = rotasPorPerfil[usuario?.perfil ?? 'inspetor'] ?? '/inspetor'
      router.push(rota)
    } catch {
      setErro('Erro de conexão. Verifique sua internet.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-fundo">
      {/* Container central */}
      <div className="w-full max-w-sm animate-[fadeIn_0.4s_var(--ease-out-forte)_both]">
        {/* Logo / Mascote */}
        <div className="flex flex-col items-center mb-10">
          <IconeMascote tamanho={72} className="mb-4" />
          <h1 className="text-2xl font-bold text-texto">Sentry</h1>
          <p className="text-sm text-texto-secundario mt-1">
            Prontidão operacional do centro cirúrgico
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-texto-secundario mb-1.5 ml-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={[
                'w-full',
                'bg-superficie',
                'rounded-input',
                'border border-separador',
                'px-4 py-3.5',
                'text-base text-texto',
                'placeholder:text-texto-terciario',
                'outline-none',
                'transition-all duration-200',
                'focus:border-primaria/30 focus:shadow-[var(--shadow-glow)]',
              ].join(' ')}
              placeholder="seu@email.com"
            />
          </div>

          {/* Senha */}
          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-medium text-texto-secundario mb-1.5 ml-1"
            >
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={[
                'w-full',
                'bg-superficie',
                'rounded-input',
                'border border-separador',
                'px-4 py-3.5',
                'text-base text-texto',
                'placeholder:text-texto-terciario',
                'outline-none',
                'transition-all duration-200',
                'focus:border-primaria/30 focus:shadow-[var(--shadow-glow)]',
              ].join(' ')}
              placeholder="••••••••"
            />
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <div className="bg-perigo-fundo text-perigo text-sm font-medium px-4 py-3 rounded-sm animate-[fadeIn_0.2s_ease-out_both]">
              {erro}
            </div>
          )}

          {/* Botão de login */}
          <Botao
            type="submit"
            variante="primario"
            tamanho="lg"
            larguraTotal
            carregando={carregando}
          >
            Entrar
          </Botao>
        </form>
      </div>
    </div>
  )
}
