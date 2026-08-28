'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { Avatar } from '@/components/ui/Avatar'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { TODOS_SETORES, SETORES_LABELS } from '@/lib/roteamentoNC'
import { traduzirErroAuth } from '@/lib/tratarErrosAuth'
import { OrbIA } from '@/components/ui/OrbIA'
import { ShieldCheck, UserPlus, Sparkles, Building2, UserCheck } from 'lucide-react'

const ROLES = [
  { 
    valor: 'inspetor', 
    label: 'Inspetor', 
    desc: 'Enfermagem / Campo',
    avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue.jpg',
    fallback: 'IN' 
  },
  { 
    valor: 'tecnico', 
    label: 'Técnico', 
    desc: 'Setor especializado',
    avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/orange.jpg',
    fallback: 'TC' 
  },
  { 
    valor: 'coordenador', 
    label: 'Coordenador', 
    desc: 'Gestão CC & IA',
    avatarUrl: 'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/green.jpg',
    fallback: 'CD' 
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
  const [setorSelecionado, setSetorSelecionado] = useState('')
  const [hospitalId, setHospitalId] = useState('e632822a-0000-0000-0000-000000000001')
  
  const [hospitais, setHospitais] = useState<any[]>([
    { id: 'e632822a-0000-0000-0000-000000000001', nome: 'Hospital Público Itaberaba' }
  ])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

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

      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            hospital_id: hospitalId,
            nome: nomeCompleto,
            perfil: perfilSelecionado,
            numero_conselho: numeroConselho,
            setor: perfilSelecionado === 'tecnico' ? (setorSelecionado || 'engenharia_clinica') : null,
          }
        }
      })

      if (error) {
        setErro(traduzirErroAuth(error))
        setCarregando(false)
        return
      }

      setSucesso('Conta criada com sucesso! Redirecionando...')

      if (data.user) {
        try {
          await supabase.from('usuarios').upsert({
            id: data.user.id,
            nome: nomeCompleto,
            email: email,
            perfil: perfilSelecionado,
            hospital_id: hospitalId,
            numero_conselho: numeroConselho,
            setor: perfilSelecionado === 'tecnico' ? (setorSelecionado || 'engenharia_clinica') : null,
          })
        } catch (dbErr) {
          console.error('Erro ao upsertar na tabela usuarios:', dbErr)
        }

        localStorage.setItem('argus_usuario_atual', JSON.stringify({
          id: data.user.id,
          nome: nomeCompleto,
          perfil: perfilSelecionado
        }))

        const rotas: Record<string, string> = {
          inspetor: '/inspetor',
          engenharia_clinica: '/engenharia',
          coordenador: '/coordenador',
          tecnico: '/engenharia',
        }

        setTimeout(() => {
          router.push(rotas[perfilSelecionado] || '/inspetor')
        }, 500)
      } else {
        router.push('/login?mensagem=Cadastro realizado. Faça login para continuar.')
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
      <div className="hidden lg:flex lg:w-1/2 xl:w-[48%] relative overflow-hidden bg-slate-950 text-white flex-col justify-between p-12 xl:p-16 select-none">
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
            <span className="font-semibold text-[11.5px] tracking-wide">Cadastro Oficial</span>
          </div>
        </div>

        {/* Centro: Mensagem & Benefícios */}
        <div className="relative z-10 my-auto py-8 space-y-6 max-w-lg">
          <div className="space-y-3">
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Junte-se à operação de prontidão do hospital.
            </h2>
            <p className="text-sm xl:text-base text-slate-400 leading-relaxed">
              Crie seu acesso para inspecionar salas, gerenciar equipamentos ou validar conformidades cirúrgicas.
            </p>
          </div>

          {/* Destaques de Perfis */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Inspetores de Campo</h4>
                <p className="text-xs text-slate-400">Checklists por QR Code e abertura imediata de NCs com evidência fotográfica.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Coordenação e Técnicos</h4>
                <p className="text-xs text-slate-400">Painéis de controle, roteamento automático por setor e suporte da Argus IA em tempo real.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Hero */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <span>© 2026 Argus Hospitalar</span>
          <span className="flex items-center gap-1.5 text-sky-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" /> Segurança & Qualidade
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          LADO DIREITO (FORMULÁRIO DE CADASTRO RESPONSIVO)
         ══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center items-center px-5 py-8 sm:px-10 lg:px-12 xl:px-16 overflow-y-auto select-none">
        
        {/* Mobile Header (visível apenas < lg) */}
        <div className="lg:hidden w-full max-w-md text-center mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-brand">
            Criar Conta
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Cadastre o seu perfil na plataforma <span className="font-bold text-slate-800">Argus</span>
          </p>
        </div>

        {/* Container do Formulário */}
        <div className="w-full max-w-md space-y-5 my-auto">
          
          <div className="space-y-1 text-left hidden lg:block">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Criar sua conta
            </h2>
            <p className="text-xs text-slate-500">
              Preencha os dados abaixo para vincular seu perfil profissional.
            </p>
          </div>

          {/* Card Principal */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-slate-200/80 space-y-4">
            
            <form onSubmit={handleCadastrar} className="space-y-3.5">
              
              {erro && (
                <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 text-center leading-relaxed animate-fadeIn">
                  {erro}
                </div>
              )}

              {sucesso && (
                <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center leading-relaxed animate-fadeIn">
                  {sucesso}
                </div>
              )}
              
              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all font-normal"
                />
              </div>

              {/* Grid 2 Colunas: E-mail e Conselho */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                    E-mail
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                    Conselho (COREN / CRM)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: COREN-BA 123456"
                    value={numeroConselho}
                    onChange={(e) => setNumeroConselho(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
              </div>

              {/* Hospital */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                  Hospital
                </label>
                <select
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer"
                >
                  {hospitais.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Perfil / Cargo — Seletor por Cards */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                  Perfil / Cargo
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-2">
                  {ROLES.map((r) => {
                    const ativo = perfilSelecionado === r.valor
                    return (
                      <button
                        key={r.valor}
                        type="button"
                        onClick={() => setPerfilSelecionado(r.valor)}
                        className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all select-none cursor-pointer ${
                          ativo
                            ? 'bg-white shadow-sm border border-slate-200 text-sky-600 scale-[1.02]'
                            : 'opacity-70 hover:opacity-100 hover:bg-slate-100/80 text-slate-600'
                        }`}
                      >
                        <Avatar size="sm">
                          <Avatar.Image alt={r.label} src={r.avatarUrl} />
                          <Avatar.Fallback>{r.fallback}</Avatar.Fallback>
                        </Avatar>
                        <span className={`text-[11.5px] font-bold mt-1 tracking-tight ${ativo ? 'text-sky-600' : 'text-slate-700'}`}>
                          {r.label}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-medium text-center line-clamp-1">
                          {r.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Seletor de Setor Técnico (se perfilSelecionado === 'tecnico') */}
              {perfilSelecionado === 'tecnico' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                    Setor de Atuação
                  </label>
                  <select
                    value={setorSelecionado}
                    onChange={(e) => setSetorSelecionado(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all cursor-pointer"
                  >
                    <option value="">Selecione o setor...</option>
                    {TODOS_SETORES.map((st) => (
                      <option key={st} value={st}>
                        {SETORES_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Grid 2 Colunas: Senha e Confirmar Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mín. 6 caracteres"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 tracking-wider uppercase ml-1 block">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
              </div>

              {/* Botão de Cadastro */}
              <div className="pt-2">
                <LiquidMetalButton
                  type="submit"
                  disabled={carregando}
                  className="w-full"
                >
                  {carregando ? 'Criando Conta...' : 'Concluir Cadastro'}
                </LiquidMetalButton>
              </div>
            </form>

            {/* Link para Login */}
            <div className="text-center pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Já tem uma conta?{' '}
                <Link
                  href="/login"
                  className="text-sky-600 hover:text-sky-700 font-bold ml-1 hover:underline cursor-pointer"
                >
                  Entrar
                </Link>
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
