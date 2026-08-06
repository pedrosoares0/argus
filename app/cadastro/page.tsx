'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { criarClienteSupabase } from '@/lib/supabase/client'

const ROLES = [
  { valor: 'inspetor', label: 'Inspetor(a) de Enfermagem' },
  { valor: 'coordenador', label: 'Coordenador(a)' },
  { valor: 'engenharia_clinica', label: 'Engenharia Clínica' },
  { valor: 'gestor', label: 'Gestor(a)' },
  { valor: 'administrador', label: 'Administrador(a)' },
]

export default function PaginaCadastro() {
  const router = useRouter()
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [perfilSelecionado, setPerfilSelecionado] = useState('inspetor')
  const [hospitalId, setHospitalId] = useState('e632822a-0000-0000-0000-000000000001') // Default hospital ID
  
  const [hospitais, setHospitais] = useState<any[]>([
    { id: 'e632822a-0000-0000-0000-000000000001', nome: 'Hospital Público Itaberaba' }
  ])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  // Carregar hospitais cadastrados
  useEffect(() => {
    async function carregarHospitais() {
      try {
        const supabase = criarClienteSupabase()
        const { data, error } = await supabase
          .from('hospitais')
          .select('id, nome')
        
        if (data && data.length > 0) {
          setHospitais(data)
          setHospitalId(data[0].id)
        }
      } catch (err) {
        console.error('Erro ao carregar hospitais:', err)
      }
    }
    carregarHospitais()
  }, [])

  async function handleCadastrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(null)

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setCarregando(true)

    try {
      const supabase = criarClienteSupabase()

      // Registrar o usuário no Supabase Auth com metadados para o trigger do perfil
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            hospital_id: hospitalId,
            nome: nomeCompleto,
            perfil: perfilSelecionado,
          }
        }
      })

      if (error) {
        setErro(error.message)
        setCarregando(false)
        return
      }

      setSucesso('Conta criada com sucesso!')

      // Se o usuário foi autenticado imediatamente (confirmação de email desativada)
      if (data.user) {
        // Buscar perfil criado na tabela public.usuarios (com retentativas para dar tempo ao trigger do Postgres)
        let profile = null
        for (let i = 0; i < 4; i++) {
          const { data: p } = await supabase
            .from('usuarios')
            .select('id, nome, perfil')
            .eq('id', data.user.id)
            .single()
          
          if (p) {
            profile = p
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 250))
        }

        if (profile) {
          // Ponte com a sessão simulada no LocalStorage para retrocompatibilidade
          localStorage.setItem('sentry_usuario_atual', JSON.stringify({
            id: profile.id,
            nome: profile.nome,
            perfil: profile.perfil
          }))

          const rotas: Record<string, string> = {
            inspetor: '/inspetor',
            coordenador: '/coordenador',
            engenharia_clinica: '/engenharia',
            gestor: '/gestor',
            administrador: '/admin',
          }

          router.push(rotas[profile.perfil] || '/inspetor')
        } else {
          router.push('/login?mensagem=Cadastro realizado. Faça login para continuar.')
        }
      } else {
        router.push('/login?mensagem=Cadastro realizado. Por favor, faça login.')
      }

    } catch (err: any) {
      console.error(err)
      setErro('Erro de conexão ao tentar realizar cadastro.')
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8 bg-[#F4F6FA] select-none">
      <div className="w-full max-w-sm space-y-8 animate-[fadeIn_0.3s_ease-out]">
        
        {/* Cabeçalho */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Criar Conta
          </h1>
          <p className="text-sm text-gray-400 font-semibold mt-1.5 leading-snug">
            Cadastre o seu perfil na plataforma Sentry
          </p>
        </div>

        {/* Card de Cadastro */}
        <div className="bg-white rounded-[28px] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-gray-100/80">
          <form onSubmit={handleCadastrar} className="space-y-4">
            
            {erro && (
              <p className="text-xs font-bold text-red-500 bg-red-50/50 border border-red-200/50 rounded-xl px-4 py-2.5 text-center">
                {erro}
              </p>
            )}

            {sucesso && (
              <p className="text-xs font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-200/50 rounded-xl px-4 py-2.5 text-center">
                {sucesso}
              </p>
            )}
            
            {/* Nome Completo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                placeholder="Seu nome"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
              />
            </div>

            {/* E-mail */}
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
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
              />
            </div>

            {/* Hospital */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                Hospital
              </label>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[15px] text-gray-900 outline-none focus:border-[#246BFD] transition-all cursor-pointer"
              >
                {hospitais.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Perfil/Cargo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                Perfil / Cargo
              </label>
              <select
                value={perfilSelecionado}
                onChange={(e) => setPerfilSelecionado(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[15px] text-gray-900 outline-none focus:border-[#246BFD] transition-all cursor-pointer"
              >
                {ROLES.map(r => (
                  <option key={r.valor} value={r.valor}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                Senha (mín. 6 caracteres)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
              />
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                Confirmar Senha
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
              />
            </div>

            {/* Botão Cadastrar */}
            <div className="pt-2">
              <Botao
                type="submit"
                variante="primario"
                tamanho="lg"
                larguraTotal
                carregando={carregando}
              >
                Cadastrar
              </Botao>
            </div>

            {/* Link para Login */}
            <div className="text-center pt-1.5">
              <Link
                href="/login"
                className="text-xs font-bold text-gray-500 hover:text-gray-800 hover:underline"
              >
                Já tem conta? Faça Login
              </Link>
            </div>

          </form>
        </div>

      </div>
    </div>
  )
}
