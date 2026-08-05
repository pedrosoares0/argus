'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { PillTag } from '@/components/ui/PillTag'
import { getNC, validarCorrecao, reabrirNC, getUsuarioLogado, MockNaoConformidadeExtended } from '@/lib/supabase/mockDb'
import type { StatusNaoConformidade, StatusAtivo } from '@/lib/supabase/types'

const STATUS_CORES: Record<StatusNaoConformidade, 'azul' | 'laranja' | 'verde' | 'vermelho' | 'cinza'> = {
  aberta: 'vermelho',
  em_analise: 'azul',
  em_correcao: 'laranja',
  aguardando_validacao: 'verde',
  encerrada: 'cinza',
}

const STATUS_LABELS: Record<StatusNaoConformidade, string> = {
  aberta: 'Aberta',
  em_analise: 'Em Análise',
  em_correcao: 'Em Correção',
  aguardando_validacao: 'Aguardando Validação',
  encerrada: 'Encerrada',
}

const STATUS_ATIVO: Record<StatusAtivo, { label: string; dot: string }> = {
  operacional: { label: 'Operacional', dot: 'bg-emerald-500' },
  operacional_com_restricoes: { label: 'Com restrições', dot: 'bg-amber-500' },
  indisponivel: { label: 'Indisponível', dot: 'bg-red-500' },
  em_manutencao: { label: 'Em manutenção', dot: 'bg-sky-500' },
}

export default function ValidarNC() {
  const params = useParams()
  const router = useRouter()
  const ncId = params.id as string

  const [nc, setNc] = useState<MockNaoConformidadeExtended | null>(null)
  const [usuario, setUsuario] = useState({ id: '', nome: '', perfil: '' })
  const [justificativa, setJustificativa] = useState('')
  const [mostrarFormReabertura, setMostrarFormReabertura] = useState(false)
  const [fotoZoom, setFotoZoom] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [avisoSucesso, setAvisoSucesso] = useState<string | null>(null)

  // Carrega dados iniciais
  useEffect(() => {
    if (!ncId) return
    const dadosNC = getNC(ncId)
    if (dadosNC) {
      setNc(dadosNC)
    } else {
      setErro('Não conformidade não encontrada.')
    }
    const user = getUsuarioLogado()
    setUsuario({ id: user.id, nome: user.nome, perfil: user.perfil })
  }, [ncId])

  function atualizarNC() {
    const dadosNC = getNC(ncId)
    if (dadosNC) {
      setNc({ ...dadosNC })
    }
  }

  // Ação 1: Validar e Encerrar
  function handleValidarEncerrar() {
    if (!nc) return
    const atualizado = validarCorrecao(nc.id, usuario.id, usuario.nome)
    if (atualizado) {
      setAvisoSucesso('Não Conformidade validada e encerrada com sucesso!')
      atualizarNC()
      setTimeout(() => {
        setAvisoSucesso(null)
        router.push('/coordenador')
      }, 2000)
    }
  }

  // Ação 2: Reabrir NC (Correção insuficiente)
  function handleReabrir(e: React.FormEvent) {
    e.preventDefault()
    if (!nc || !justificativa.trim()) return
    const atualizado = reabrirNC(nc.id, usuario.id, usuario.nome, justificativa)
    if (atualizado) {
      setAvisoSucesso('Não Conformidade reaberta e encaminhada para a Engenharia Clínica.')
      setMostrarFormReabertura(false)
      setJustificativa('')
      atualizarNC()
      setTimeout(() => {
        setAvisoSucesso(null)
        router.push('/coordenador')
      }, 2000)
    }
  }

  if (erro) {
    return (
      <div className="px-5 pt-10 text-center space-y-4 max-w-md mx-auto">
        <p className="text-red-500 font-bold">{erro}</p>
        <Link href="/coordenador" className="inline-block text-[#246BFD] font-bold">
          Voltar para o painel
        </Link>
      </div>
    )
  }

  if (!nc) {
    return <div className="px-5 pt-10 text-center text-gray-500 max-w-md mx-auto">Carregando...</div>
  }

  const corCriticidade =
    nc.criticidade === 'critico'
      ? 'vermelho'
      : nc.criticidade === 'importante'
      ? 'laranja'
      : 'azul'

  const corStatus = STATUS_CORES[nc.status]
  const labelStatus = STATUS_LABELS[nc.status]
  const ativoStatusCfg = nc.ativo ? STATUS_ATIVO[nc.ativo.status] : null
  const pendenteValidação = nc.status === 'aguardando_validacao'

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-36 max-w-md mx-auto">
      {/* Header compact com botão voltar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link
          href="/coordenador"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-600 hover:text-black transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Painel
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

        {/* ── CARD 1: O ATIVO E SUA LOCALIZAÇÃO ── */}
        <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4">
          <div>
            <span className="text-[10px] font-bold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {nc.ativo?.categoria || 'Equipamento'}
            </span>
            <h2 className="text-base font-extrabold text-gray-900 mt-2 leading-tight tracking-tight">
              {nc.ativo?.nome || 'Ativo desconhecido'}
            </h2>
            {nc.ativo?.codigo_qr && (
              <p className="text-[11px] font-mono text-gray-400 mt-1 uppercase tracking-wider">
                Código QR: {nc.ativo.codigo_qr}
              </p>
            )}
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

        {/* ── CARD 2: RELATO ORIGINAL (Inspetor) ── */}
        <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Relato do Inspetor</span>
            <PillTag cor={corCriticidade}>
              {nc.criticidade === 'critico' ? 'Urgente / Crítico' : nc.criticidade === 'importante' ? 'Importante' : 'Informativo'}
            </PillTag>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item/Seção com Falha</h4>
            <p className="text-[14px] font-bold text-gray-800 mt-0.5">{nc.item_execucao.item_congelado}</p>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição Detalhada</h4>
            <p className="text-xs text-gray-600 leading-relaxed font-normal bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              {nc.descricao}
            </p>
          </div>

          {/* Observação Adicional do Inspetor se houver */}
          {nc.item_execucao.evidencia_texto && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Observações do Inspetor</h4>
              <p className="text-xs text-gray-500 italic">"{nc.item_execucao.evidencia_texto}"</p>
            </div>
          )}

          {/* Evidência Fotográfica */}
          {nc.evidencia_url && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Evidência Fotográfica</h4>
              <div className="relative group cursor-zoom-in overflow-hidden rounded-2xl border border-gray-200">
                <img
                  src={nc.evidencia_url}
                  alt="Evidência da não conformidade"
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
              {nc.criado_por_nome.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{nc.criado_por_nome}</p>
              <p className="text-[10px] text-gray-400">
                Aberto em {new Date(nc.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* ── CARD 3: REGISTRO TÉCNICO DE MANUTENÇÃO (Engenharia) ── */}
        {nc.registro_manutencao ? (
          <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4">
            <span className="text-[10px] font-bold text-[#246BFD] bg-[#246BFD]/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Conserto Realizado (Eng. Clínica)
            </span>

            <div className="space-y-3">
              <div className="bg-blue-50/40 rounded-xl p-3 border border-blue-100/50">
                <h4 className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                  Resumo das Ações Corretivas
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed font-normal">
                  {nc.registro_manutencao.descricao}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                <span>Técnico Responsável:</span>
                <span className="font-bold text-gray-900">
                  {nc.responsavel_nome || 'Engenheiro Clínico'}
                </span>
              </div>

              {nc.registro_manutencao.finalizada_em && (
                <div className="text-[10px] text-gray-400 italic">
                  Manutenção finalizada em:{' '}
                  {new Date(nc.registro_manutencao.finalizada_em).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 text-center py-6">
            <p className="text-xs text-gray-400">Nenhum registro de conserto disponível ainda.</p>
          </div>
        )}

        {/* ── CARD 4: TIMELINE / HISTÓRICO COMPLETO ── */}
        <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4">
          <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Linha do Tempo</span>

          <div className="relative border-l border-gray-200 pl-4 ml-2.5 space-y-5 py-2">
            {nc.historico.map((hist, idx) => {
              const bolinhaCor =
                hist.status_novo === 'aberta'
                  ? 'bg-red-500 ring-4 ring-red-100'
                  : hist.status_novo === 'em_analise'
                  ? 'bg-[#246BFD] ring-4 ring-[#246BFD]/10'
                  : hist.status_novo === 'em_correcao'
                  ? 'bg-amber-500 ring-4 ring-amber-100'
                  : hist.status_novo === 'aguardando_validacao'
                  ? 'bg-emerald-500 ring-4 ring-emerald-100'
                  : 'bg-gray-500 ring-4 ring-gray-100'

              return (
                <div key={hist.id} className="relative animate-[fadeIn_0.3s_ease-out]" style={{ animationDelay: `${idx * 40}ms` }}>
                  <span className={`absolute -left-[25.5px] top-[3px] w-2.5 h-2.5 rounded-full ${bolinhaCor}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800">
                      {hist.status_anterior !== hist.status_novo ? (
                        <>
                          Status alterado para <span className="text-[#246BFD]">{STATUS_LABELS[hist.status_novo]}</span>
                        </>
                      ) : (
                        <>NC assumida por técnico</>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Por {hist.usuario_nome} · {new Date(hist.created_at).toLocaleString('pt-BR')}
                    </p>
                    {hist.justificativa && (
                      <div className="mt-1.5 p-2 bg-red-50 border border-red-100/50 rounded-lg text-red-700 text-xs font-normal">
                        <span className="font-bold">Motivo do retorno:</span> "{hist.justificativa}"
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── BARRA INFERIOR DE CTAs (Validar ou Reabrir) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#F4F6FA] via-[#F4F6FA]/95 to-transparent pt-6">
        <div className="bg-white/95 backdrop-blur-[20px] rounded-[24px] border border-white/80 shadow-[0_4px_30px_rgba(0,0,0,0.08)] p-4 flex flex-col gap-3">
          
          {pendenteValidação ? (
            <>
              {!mostrarFormReabertura ? (
                <div className="flex gap-3">
                  <Botao
                    variante="secundario"
                    tamanho="lg"
                    larguraTotal
                    onClick={() => setMostrarFormReabertura(true)}
                    className="border-gray-200 hover:border-gray-300 text-gray-700"
                  >
                    Reabrir Correção
                  </Botao>
                  <Botao
                    variante="primario"
                    tamanho="lg"
                    larguraTotal
                    onClick={handleValidarEncerrar}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Validar e Encerrar
                  </Botao>
                </div>
              ) : (
                /* Slide-down form para justificar reabertura */
                <form onSubmit={handleReabrir} className="space-y-3 animate-[fadeIn_0.2s_ease-out]">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      Justificativa da Reabertura *
                    </label>
                    <textarea
                      required
                      rows={3}
                      autoFocus
                      placeholder="Descreva por que a correção foi insuficiente (ex: peça inadequada, erro persiste)..."
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/10 resize-none transition-all"
                    />
                  </div>
                  <div className="flex gap-2.5">
                    <Botao
                      type="button"
                      variante="secundario"
                      tamanho="sm"
                      larguraTotal
                      onClick={() => {
                        setMostrarFormReabertura(false)
                        setJustificativa('')
                      }}
                    >
                      Voltar
                    </Botao>
                    <button
                      type="submit"
                      disabled={!justificativa.trim()}
                      className="flex-1 inline-flex items-center justify-center font-bold tracking-wide rounded-full text-xs px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 transition-colors"
                    >
                      Confirmar Reabertura
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {nc.status === 'encerrada' ? '✅ Esta Não Conformidade foi encerrada' : 'Esta NC está sendo tratada'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Não são permitidas ações adicionais para o seu perfil.
              </p>
            </div>
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
              alt="Evidência ampliada"
              className="w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
