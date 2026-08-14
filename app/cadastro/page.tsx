'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { Avatar } from '@/components/ui/Avatar'
import { criarClienteSupabase } from '@/lib/supabase/client'

const ROLES = [
  { 
    valor: 'inspetor', 
    label: 'Inspetor', 
    desc: 'Enfermagem',
    avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg',
    fallback: 'IN' 
  },
  { 
    valor: 'engenharia_clinica', 
    label: 'Engenharia', 
    desc: 'Engenharia Clínica',
    avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/red.jpg',
    fallback: 'EN' 
  },
]

export default function PaginaCadastro() {
  const router = useRouter()
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [numeroConselho, setNumeroConselho] = useState('')


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
        const supabase = criarClienteSupabase() as any
        const { data } = await supabase
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
      const supabase = criarClienteSupabase() as any

      // 1. Registrar o usuário no Supabase Auth com metadados
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            hospital_id: hospitalId,
            nome: nomeCompleto,
            perfil: perfilSelecionado,
            numero_conselho: numeroConselho,
          }
        }
      })

      if (error) {
        setErro(error.message)
        setCarregando(false)
        return
      }

      setSucesso('Conta criada com sucesso!')

      // 2. Vincular dados diretamente na tabela public.usuarios
      if (data.user) {
        try {
          await supabase.from('usuarios').upsert({
            id: data.user.id,
            nome: nomeCompleto,
            email: email,
            perfil: perfilSelecionado,
            hospital_id: hospitalId,
            numero_conselho: numeroConselho
          })
        } catch (dbErr) {
          console.error('Erro ao upsertar na tabela usuarios:', dbErr)
        }

        // Ponte com a sessão simulada no LocalStorage para retrocompatibilidade
        localStorage.setItem('argus_usuario_atual', JSON.stringify({
          id: data.user.id,
          nome: nomeCompleto,
          perfil: perfilSelecionado
        }))

        // Redirecionamento imediato para a tela respectiva
        const rotas: Record<string, string> = {
          inspetor: '/inspetor',
          engenharia_clinica: '/engenharia',
          coordenador: '/coordenador',
        }

        setTimeout(() => {
          router.push(rotas[perfilSelecionado] || '/inspetor')
        }, 500)
      } else {
        router.push('/login?mensagem=Cadastro realizado. Faça login para continuar.')
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
            Cadastre o seu perfil na plataforma <span className="font-brand font-bold text-gray-700">Argus</span>
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

            {/* Número do Conselho (COREN / CRM / CREA) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1">
                Número do Conselho (COREN / CRM / CREA)
              </label>
              <input
                type="text"
                placeholder="Ex: COREN-BA 123456"
                value={numeroConselho}
                onChange={(e) => setNumeroConselho(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all"
              />

            </div>

            {/* Perfil / Cargo — Seletor por Avatares */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase ml-1 block">
                Perfil / Cargo
              </label>
              <div className="flex justify-around items-center bg-[#F4F6FA] border border-gray-200/80 rounded-2xl p-3">
                {ROLES.map((r) => {
                  const ativo = perfilSelecionado === r.valor
                  return (
                    <button
                      key={r.valor}
                      type="button"
                      onClick={() => setPerfilSelecionado(r.valor)}
                      className="flex flex-col items-center gap-1.5 focus:outline-none group select-none cursor-pointer flex-1"
                    >
                      <div
                        className={`rounded-full p-0.5 aspect-square flex items-center justify-center transition-all duration-200 ${
                          ativo
                            ? 'ring-2 ring-[#246BFD]/40 ring-offset-2 scale-105 shadow-[0_2px_8px_rgba(36,107,253,0.15)]'
                            : 'opacity-60 hover:opacity-100 hover:scale-105 active:scale-95'
                        }`}
                      >
                        <Avatar size="md">
                          <Avatar.Image
                            alt={r.label}
                            src={r.avatarUrl}
                          />
                          <Avatar.Fallback>{r.fallback}</Avatar.Fallback>
                        </Avatar>
                      </div>
                      <div className="text-center leading-tight">
                        <span
                          className={`text-[11px] font-bold tracking-tight block transition-colors ${
                            ativo ? 'text-[#246BFD]' : 'text-gray-700 group-hover:text-gray-900'
                          }`}
                        >
                          {r.label}
                        </span>
                        <span className="text-[9.5px] font-medium text-gray-400 block mt-0.5">
                          {r.desc}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
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

            {/* Botão Cadastrar com Efeito Liquid Metal */}
            <div className="pt-2">
              <LiquidMetalButton
                type="submit"
                tamanho="lg"
                larguraTotal
                carregando={carregando}
                label="Cadastrar"
              />
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
