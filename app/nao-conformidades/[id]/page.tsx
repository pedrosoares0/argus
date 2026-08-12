'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { PillTag } from '@/components/ui/PillTag'
import { QRCodeAtivo } from '@/components/ui/QRCodeAtivo'
import { criarClienteSupabase } from '@/lib/supabase/client'
import type { StatusNaoConformidade, StatusAtivo } from '@/lib/supabase/types'

const STATUS_CORES: Record<StatusNaoConformidade, 'azul' | 'laranja' | 'verde' | 'vermelho' | 'cinza'> = {
  aberta: 'vermelho',
  em_analise: 'azul',
  em_correcao: 'laranja',
  aguardando_validacao: 'verde',
  encerrada: 'cinza',
  correcao_recusada: 'vermelho',
}

const STATUS_LABELS: Record<StatusNaoConformidade, string> = {
  aberta: 'Aberta',
  em_analise: 'Em Resolução',
  em_correcao: 'Em Correção',
  aguardando_validacao: 'Aguardando Validação',
  encerrada: 'Encerrada',
  correcao_recusada: 'Correção Recusada',
}

const STATUS_ATIVO: Record<StatusAtivo, { label: string; dot: string }> = {
  operacional: { label: 'Operacional', dot: 'bg-emerald-500' },
  operacional_com_restricoes: { label: 'Com restrições', dot: 'bg-amber-500' },
  indisponivel: { label: 'Indisponível', dot: 'bg-red-500' },
  em_manutencao: { label: 'Em manutenção', dot: 'bg-sky-500' },
}

export default function DetalheNCEngenharia() {
  const params = useParams()
  const router = useRouter()
  const ncId = params.id as string

  const [nc, setNc] = useState<any | null>(null)
  const [usuario, setUsuario] = useState({ id: '', nome: '', perfil: '' })
  const [fotoZoom, setFotoZoom] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [avisoSucesso, setAvisoSucesso] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  
  // Controle do formulário de manutenção
  const [mostrarFormManutencao, setMostrarFormManutencao] = useState(false)
  const [descricaoReparo, setDescricaoReparo] = useState('')
  const [erroForm, setErroForm] = useState('')

  async function carregarDados() {
    try {
      if (!ncId) return
      const supabase = criarClienteSupabase() as any

      // 1. Obter usuário logado
      let currentUser = null
      const stored = localStorage.getItem('sentry_usuario_atual')
      if (stored) {
        try {
          currentUser = JSON.parse(stored)
        } catch (e) {
          console.error(e)
        }
      }
      
      if (!currentUser) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('usuarios')
            .select('id, nome, perfil, hospital_id')
            .eq('id', user.id)
            .single()
          if (profile) {
            currentUser = profile
          }
        }
      }

      if (currentUser) {
        setUsuario({ id: currentUser.id, nome: currentUser.nome, perfil: currentUser.perfil })
      }

      // 2. Buscar a NC pelo ID do Supabase
      const { data: ncData, error: ncError } = await supabase
        .from('nao_conformidades')
        .select('*, ativos(*, categorias_ativos(*), locais(*, centros_cirurgicos(*, unidades(*)))), itens_execucao_checklist(*)')
        .eq('id', ncId)
        .single()

      if (ncError || !ncData) {
        setErro('Não conformidade não encontrada no banco de dados.')
        return
      }

      // 3. Buscar nome do responsável se houver
      let responsavelNome = null
      if (ncData.responsavel_id) {
        const { data: resp } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('id', ncData.responsavel_id)
          .single()
        if (resp) {
          responsavelNome = resp.nome
        }
      }

      // 4. Buscar histórico de status do banco real
      const { data: historicoData } = await supabase
        .from('historico_status_nao_conformidade')
        .select('*')
        .eq('nao_conformidade_id', ncId)
        .order('created_at', { ascending: true })

      // 5. Buscar registro de manutenção em andamento ou finalizado
      const { data: maintData } = await supabase
        .from('registros_manutencao')
        .select('*')
        .eq('nao_conformidade_id', ncId)
        .order('created_at', { ascending: false })

      const localAtivo = ncData.ativos?.locais || {}
      const centroCirurgico = localAtivo.centros_cirurgicos || {}
      const unidade = centroCirurgico.unidades || {}
      const itemExec = ncData.itens_execucao_checklist || {}

      // Formatar objeto da NC
      setNc({
        id: ncData.id,
        numero_unico: ncData.numero_unico || `NC-${ncData.criado_em ? new Date(ncData.criado_em).getFullYear() : '2026'}-${ncData.id.substring(0, 4).toUpperCase()}`,
        descricao: itemExec.evidencia_texto || 'Não conformidade registrada no checklist.',
        criticidade: ncData.criticidade,
        status: ncData.status,
        prazo: ncData.prazo,
        created_at: ncData.criado_em,
        evidencia_url: itemExec.evidencia_url,
        ativo: ncData.ativos ? {
          id: ncData.ativos.id,
          local_id: ncData.ativos.local_id,
          nome: ncData.ativos.nome,
          categoria: ncData.ativos.categorias_ativos?.nome || 'Equipamento',
          status: ncData.ativos.status,
          codigo_qr: ncData.ativos.codigo_qr,
          patrimonio: ncData.ativos.patrimonio,
        } : null,
        local: {
          nome: localAtivo.nome || 'Sala',
          unidade: unidade.nome || 'Unidade',
          centro_cirurgico: centroCirurgico.nome || 'Centro Cirúrgico',
          hospital: 'Hospital'
        },
        item_execucao: {
          item_congelado: itemExec.item_congelado?.descricao || ncData.ativos?.nome || 'Equipamento',
          evidencia_texto: itemExec.evidencia_texto || 'Não conformidade registrada.',
        },
        criado_por_nome: 'Inspetor',
        responsavel_nome: responsavelNome,
        responsavel_id: ncData.responsavel_id,
        registro_manutencao: maintData && maintData.length > 0 ? maintData[0] : null,
        historico: historicoData || [],
      })

    } catch (err: any) {
      console.error(err)
      setErro(`Erro de conexão ao carregar dados: ${err.message || err}`)
    } finally {
      setCarregando(false)
    }
  }

  // Carrega dados iniciais
  useEffect(() => {
    carregarDados()
  }, [ncId])

  function atualizarNC() {
    carregarDados()
  }

  // Ação: Assumir NC
  async function handleAssumir() {
    if (!nc) return
    try {
      const supabase = criarClienteSupabase() as any
      
      // 1. Atualizar a NC
      const { error } = await supabase
        .from('nao_conformidades')
        .update({ responsavel_id: usuario.id })
        .eq('id', nc.id)

      if (error) throw error

      // 2. Gravar no histórico de status
      await supabase
        .from('historico_status_nao_conformidade')
        .insert({
          nao_conformidade_id: nc.id,
          status_anterior: nc.status,
          status_novo: nc.status,
          usuario_id: usuario.id,
        })

      setAvisoSucesso('Você assumiu a responsabilidade por esta NC.')
      setTimeout(() => setAvisoSucesso(null), 4000)
      atualizarNC()
    } catch (err: any) {
      console.error(err)
      alert(`Erro ao assumir NC: ${err.message}`)
    }
  }

  // Ação: Iniciar Análise
  async function handleIniciarAnalise() {
    if (!nc) return
    try {
      const supabase = criarClienteSupabase() as any
      
      // 1. Atualizar a NC para em_analise
      const { error } = await supabase
        .from('nao_conformidades')
        .update({ status: 'em_analise', responsavel_id: usuario.id })
        .eq('id', nc.id)

      if (error) throw error

      // 2. Gravar no histórico
      await supabase
        .from('historico_status_nao_conformidade')
        .insert({
          nao_conformidade_id: nc.id,
          status_anterior: nc.status,
          status_novo: 'em_analise',
          usuario_id: usuario.id,
        })

      setAvisoSucesso('NC recebida com sucesso!')
      setTimeout(() => setAvisoSucesso(null), 4000)
      atualizarNC()
    } catch (err: any) {
      console.error(err)
      alert(`Erro ao receber NC: ${err.message}`)
    }
  }

  // Ação: Confirmar envio de registro de reparo e mudar para em_correcao
  async function handleSalvarCorrecao(e: React.FormEvent) {
    e.preventDefault()
    if (!nc) return
    if (!descricaoReparo.trim()) {
      setErroForm('Por favor, descreva o diagnóstico ou ações realizadas.')
      return
    }

    try {
      const supabase = criarClienteSupabase() as any

      // 1. Inserir em registros_manutencao
      const { error: maintError } = await supabase
        .from('registros_manutencao')
        .insert({
          nao_conformidade_id: nc.id,
          usuario_id: usuario.id,
          descricao: descricaoReparo,
          status: 'em_andamento',
        })

      if (maintError) throw maintError

      // 2. Atualizar status da NC para em_correcao
      const { error: ncError } = await supabase
        .from('nao_conformidades')
        .update({ status: 'em_correcao' })
        .eq('id', nc.id)

      if (ncError) throw ncError

      // 3. Atualizar status do Ativo para 'em_manutencao' (RN-021)
      if (nc.ativo?.id) {
        await supabase
          .from('ativos')
          .update({ status: 'em_manutencao' })
          .eq('id', nc.ativo.id)
      }

      // 4. Inserir histórico
      await supabase
        .from('historico_status_nao_conformidade')
        .insert({
          nao_conformidade_id: nc.id,
          status_anterior: nc.status,
          status_novo: 'em_correcao',
          usuario_id: usuario.id,
        })

      setAvisoSucesso('Manutenção registrada e status alterado para Em Correção.')
      setMostrarFormManutencao(false)
      setDescricaoReparo('')
      setErroForm('')
      setTimeout(() => setAvisoSucesso(null), 4000)
      atualizarNC()
    } catch (err: any) {
      console.error(err)
      setErroForm(`Erro ao salvar manutenção: ${err.message}`)
    }
  }

  // Ação: Finalizar Reparo
  async function handleFinalizarReparo() {
    if (!nc) return
    try {
      const supabase = criarClienteSupabase() as any

      // 1. Atualizar registro_manutencao para finalizada
      if (nc.registro_manutencao?.id) {
        const { error: maintError } = await supabase
          .from('registros_manutencao')
          .update({ status: 'finalizada', finalizada_em: new Date().toISOString() })
          .eq('id', nc.registro_manutencao.id)
        if (maintError) throw maintError
      }

      // 2. Atualizar status da NC para aguardando_validacao
      const { error: ncError } = await supabase
        .from('nao_conformidades')
        .update({ status: 'aguardando_validacao' })
        .eq('id', nc.id)

      if (ncError) throw ncError

      // 3. Inserir histórico
      await supabase
        .from('historico_status_nao_conformidade')
        .insert({
          nao_conformidade_id: nc.id,
          status_anterior: nc.status,
          status_novo: 'aguardando_validacao',
          usuario_id: usuario.id,
        })

      setAvisoSucesso('Reparo finalizado! NC enviada para validação do coordenador.')
      setTimeout(() => setAvisoSucesso(null), 4000)
      atualizarNC()
    } catch (err: any) {
      console.error(err)
      alert(`Erro ao finalizar reparo: ${err.message}`)
    }
  }

  if (erro) {
    return (
      <div className="px-5 pt-10 text-center space-y-4">
        <p className="text-red-500 font-bold">{erro}</p>
        <Link href="/engenharia" className="inline-block text-[#246BFD] font-bold">
          Voltar para a fila
        </Link>
      </div>
    )
  }

  if (!nc) {
    return <div className="px-5 pt-10 text-center text-gray-500">Carregando...</div>
  }

  const corCriticidade =
    nc.criticidade === 'critico'
      ? 'vermelho'
      : nc.criticidade === 'importante'
      ? 'laranja'
      : 'azul'

  const corStatus = STATUS_CORES[nc.status as StatusNaoConformidade]
  const labelStatus = STATUS_LABELS[nc.status as StatusNaoConformidade]
  const ativoStatusCfg = nc.ativo ? STATUS_ATIVO[nc.ativo.status as StatusAtivo] : null

  // Regra de Negócio: verificar se tem outro responsável
  const temOutroResponsavel = nc.responsavel_id !== null && nc.responsavel_id !== usuario.id

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-36">
      {/* Header compact com botão voltar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link
          href="/engenharia"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-600 hover:text-black transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Fila
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
            {nc.numero_unico}
          </span>
          <PillTag cor={corStatus}>{labelStatus}</PillTag>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Toast Notificação de Sucesso */}
        {avisoSucesso && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-xs font-bold animate-[fadeIn_0.2s_ease-out] flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>{avisoSucesso}</span>
          </div>
        )}

        {/* Alerta de Responsável */}
        {temOutroResponsavel && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs font-bold flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">Outro Responsável</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Esta NC já está sob cuidados de <span className="font-bold">{nc.responsavel_nome}</span>. As ações de alteração foram bloqueadas.
              </p>
            </div>
          </div>
        )}

        {/* ── CARD 1: O ATIVO ── */}
        <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4">
          <div>
            <PillTag cor="azul">
              {nc.ativo?.categoria || 'Equipamento'}
            </PillTag>
            <h2 className="text-base font-extrabold text-gray-900 mt-2 leading-tight tracking-tight">
              {nc.ativo?.nome || 'Ativo desconhecido'}
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3.5">
              {nc.ativo?.codigo_qr && (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                    Código de Segurança
                  </p>
                  <p className="text-xs font-mono font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5 select-all">
                    {nc.ativo.codigo_qr}
                  </p>
                </div>
              )}
              {nc.ativo && (
                <QRCodeAtivo
                  ativoId={nc.ativo.id}
                  localId={nc.ativo.local_id}
                  nomeAtivo={nc.ativo.nome}
                  codigoQr={nc.ativo.codigo_qr}
                  patrimonio={nc.ativo.patrimonio}
                />
              )}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Breadcrumb Local completo */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Localização Física</p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span>{nc.local.hospital}</span>
              <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <span>{nc.local.unidade}</span>
              <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <span>{nc.local.centro_cirurgico}</span>
              <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <span className="text-gray-900 font-bold">{nc.local.nome}</span>
            </div>
          </div>

          {/* Status do ativo */}
          {ativoStatusCfg && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Status Atual do Ativo:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${ativoStatusCfg.dot}`} />
                <span className="text-xs font-bold text-gray-900">{ativoStatusCfg.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── CARD 2: A NÃO CONFORMIDADE ── */}
        <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Relato da Ocorrência</span>
            <PillTag cor={corCriticidade}>
              {nc.criticidade === 'critico' ? 'Urgente / Crítico' : nc.criticidade === 'importante' ? 'Importante' : 'Informativo'}
            </PillTag>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item Afetado</h4>
            <p className="text-[14px] font-bold text-gray-800 mt-0.5">{nc.item_execucao.item_congelado}</p>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição Detalhada</h4>
            <p className="text-xs text-gray-600 leading-relaxed font-normal bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              {nc.descricao}
            </p>
          </div>

          {/* Observação Adicional do Inspetor */}
          {nc.item_execucao.evidencia_texto && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Observações do Inspetor</h4>
              <p className="text-xs text-gray-500 italic">&quot;{nc.item_execucao.evidencia_texto}&quot;</p>
            </div>
          )}

          {/* Evidência URL (Foto) */}
          {nc.evidencia_url && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Evidência Fotográfica</h4>
              <div className="relative group cursor-zoom-in overflow-hidden rounded-2xl border border-gray-200">
                <img
                  src={nc.evidencia_url}
                  alt="Foto de evidência"
                  className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                  onClick={() => setFotoZoom(nc.evidencia_url)}
                />
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-white/90 text-xs font-bold text-gray-800 px-3 py-1.5 rounded-full shadow-sm">
                    Ampliar Imagem
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-gray-100" />

          {/* Assinatura / Criador */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-extrabold text-[11px] shrink-0">
              {nc.criado_por_nome.substring(5, 7).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{nc.criado_por_nome}</p>
              <p className="text-[10px] text-gray-400">
                Aberto em {new Date(nc.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* ── FORMULÁRIO DE REGISTRO DE MANUTENÇÃO (Modal ou Inline) ── */}
        {mostrarFormManutencao && (
          <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border-2 border-[#246BFD]/20 space-y-4 animate-[fadeIn_0.15s_ease-out]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Registrar Ação de Manutenção</h3>
              <button
                type="button"
                onClick={() => {
                  setMostrarFormManutencao(false)
                  setErroForm('')
                }}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                Cancelar
              </button>
            </div>
            
            <form onSubmit={handleSalvarCorrecao} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Descrição das Ações Realizadas
                </label>
                <textarea
                  required
                  rows={4}
                  value={descricaoReparo}
                  onChange={(e) => setDescricaoReparo(e.target.value)}
                  placeholder="Descreva o diagnóstico inicial, peças trocadas, calibração realizada ou justificativa do reparo..."
                  className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[16px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all resize-none"
                />
                {erroForm && <p className="text-[11px] text-red-500 font-medium">{erroForm}</p>}
              </div>

              <Botao
                type="submit"
                variante="primario"
                tamanho="sm"
                larguraTotal
              >
                Gravar Registro e Avançar
              </Botao>
            </form>
          </div>
        )}

        {/* ── CARD 3: REGISTRO DE MANUTENÇÃO (Se existir) ── */}
        {nc.registro_manutencao && !mostrarFormManutencao && (
          <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Registro Técnico de Manutenção</span>
              <PillTag cor={nc.registro_manutencao.status === 'finalizada' ? 'verde' : 'laranja'}>
                {nc.registro_manutencao.status === 'finalizada' ? 'Finalizado' : 'Em andamento'}
              </PillTag>
            </div>

            <div className="bg-sky-50/50 rounded-xl p-3 border border-sky-100/60">
              <p className="text-xs text-gray-700 leading-relaxed font-normal">
                {nc.registro_manutencao.descricao}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span>Responsável: <span className="font-bold text-gray-600">{nc.responsavel_nome || 'N/A'}</span></span>
              </div>
            </div>

            {nc.registro_manutencao.finalizada_em && (
              <div className="text-[10px] text-gray-400 italic flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Finalizado em: {new Date(nc.registro_manutencao.finalizada_em).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        )}

        {/* ── CARD 4: TIMELINE / HISTÓRICO ── */}
        <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4">
          <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Histórico de Alterações</span>

          <div className="relative border-l border-gray-200 pl-4 ml-2.5 space-y-4 py-2">
            {nc.historico.map((hist: any, idx: number) => {
              const bolinhaCor =
                hist.status_novo === 'aberta'
                  ? 'bg-red-500 ring-4 ring-red-100'
                  : hist.status_novo === 'em_analise'
                  ? 'bg-[#246BFD] ring-4 ring-[#246BFD]/10'
                  : hist.status_novo === 'em_correcao'
                  ? 'bg-amber-500 ring-4 ring-amber-100'
                  : hist.status_novo === 'aguardando_validacao'
                  ? 'bg-[#7C3AED] ring-4 ring-[#7C3AED]/10'
                  : hist.status_novo === 'encerrada'
                  ? 'bg-emerald-500 ring-4 ring-emerald-100'
                  : 'bg-gray-500 ring-4 ring-gray-100'

              return (
                <div key={hist.id} className="relative animate-[fadeIn_0.3s_ease-out]" style={{ animationDelay: `${idx * 40}ms` }}>
                  <span className={`absolute -left-[25.5px] top-[3px] w-2.5 h-2.5 rounded-full ${bolinhaCor}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800">
                      {hist.status_anterior !== hist.status_novo ? (
                        <>
                          Alterado para <span className="text-[#246BFD]">{STATUS_LABELS[hist.status_novo as StatusNaoConformidade]}</span>
                        </>
                      ) : (
                        <>NC assumida por técnico</>
                      )}
                    </p>
                    {hist.justificativa && (
                      <p className="text-xs text-amber-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100 mt-1 max-w-sm">
                        Justificativa de reabertura: &quot;{hist.justificativa}&quot;
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Por {hist.usuario_nome} · {new Date(hist.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({new Date(hist.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── BARRA INFERIOR DE CTAs (Apple design) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#F4F6FA] via-[#F4F6FA]/90 to-transparent pt-6">
        <div className="bg-white/80 backdrop-blur-[18px] rounded-[24px] border border-white/50 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-3 flex flex-col gap-2.5">
          
          {/* Se a NC é de outro técnico, mostra estado inativo */}
          {temOutroResponsavel ? (
            <div className="text-center py-2 text-xs font-bold text-gray-400">
              Apenas {nc.responsavel_nome} pode interagir com esta NC
            </div>
          ) : (
            <>
              {/* Botão Primário Dinâmico */}
              {(nc.status === 'aberta' || nc.status === 'correcao_recusada') && (
                <Botao
                  variante="primario"
                  tamanho="lg"
                  larguraTotal
                  onClick={handleIniciarAnalise}
                  icone={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Receber NC
                </Botao>
              )}

              {nc.status === 'em_analise' && !mostrarFormManutencao && (
                <Botao
                  variante="primario"
                  tamanho="lg"
                  larguraTotal
                  onClick={() => setMostrarFormManutencao(true)}
                  icone={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  }
                >
                  Registrar Correção
                </Botao>
              )}

              {nc.status === 'em_correcao' && (
                <Botao
                  variante="primario"
                  tamanho="lg"
                  larguraTotal
                  onClick={handleFinalizarReparo}
                  icone={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Concluir
                </Botao>
              )}

              {nc.status === 'aguardando_validacao' && (
                <div className="text-center py-3 bg-gray-50 border border-gray-100 rounded-full text-xs font-bold text-gray-500 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Aguardando validação do Coordenador</span>
                </div>
              )}

              {nc.status === 'encerrada' && (
                <div className="text-center py-3 bg-emerald-50 border border-emerald-100 rounded-full text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Não conformidade encerrada</span>
                </div>
              )}

              {/* Botão Secundário se não estiver no form ou encerrado */}
              {!mostrarFormManutencao && nc.status !== 'encerrada' && (
                <button
                  type="button"
                  onClick={() => alert('Coordenador acionado via notificação rápida.')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-colors border border-gray-200 cursor-pointer active:scale-95"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 11-3.15 0 1.575 1.575 0 013.15 0zM8.475 7.875a.75.75 0 01.75.75v3.188a.75.75 0 01-1.5 0V8.625a.75.75 0 01.75-.75zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                  </svg>
                  Chamar Coordenador
                </button>
              )}

              {/* Botão extra: Assumir NC se estiver aberta ou recusada e sem responsável */}
              {(nc.status === 'aberta' || nc.status === 'correcao_recusada') && nc.responsavel_id === null && (
                <button
                  type="button"
                  onClick={handleAssumir}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[11px] font-bold text-[#246BFD] hover:bg-[#246BFD]/5 transition-colors cursor-pointer active:scale-95"
                >
                  Assumir NC sem iniciar análise
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MODAL ZOOM FOTO ── */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.18s_ease-out]"
          onClick={() => setFotoZoom(null)}
        >
          <div className="relative max-w-md w-full max-h-[80vh] flex flex-col items-center">
            <button
              type="button"
              className="absolute -top-12 right-2 text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-sm font-bold shadow-sm transition-colors cursor-pointer"
              onClick={() => setFotoZoom(null)}
            >
              Fechar ✕
            </button>
            <img
              src={fotoZoom}
              alt="Evidência expandida"
              className="w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
