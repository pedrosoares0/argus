'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { PillTag } from '@/components/ui/PillTag'
import { getNC, assumirNC, iniciarAnalise, registrarCorrecao, finalizarReparo, getUsuarioLogado, MockNaoConformidadeExtended } from '@/lib/supabase/mockDb'
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

export default function DetalheNC() {
  const params = useParams()
  const router = useRouter()
  const ncId = params.id as string

  const [nc, setNc] = useState<MockNaoConformidadeExtended | null>(null)
  const [usuario, setUsuario] = useState({ id: '', nome: '' })
  const [descricaoReparo, setDescricaoReparo] = useState('')
  const [mostrarFormManutencao, setMostrarFormManutencao] = useState(false)
  const [fotoZoom, setFotoZoom] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [avisoSucesso, setAvisoSucesso] = useState<string | null>(null)

  // Carrega dados iniciais
  useEffect(() => {
    if (!ncId) return
    const dadosNC = getNC(ncId)
    if (dadosNC) {
      setNc(dadosNC)
      if (dadosNC.registro_manutencao) {
        setDescricaoReparo(dadosNC.registro_manutencao.descricao)
      }
    } else {
      setErro('Não conformidade não encontrada.')
    }
    const user = getUsuarioLogado()
    setUsuario({ id: user.id, nome: user.nome })
  }, [ncId])

  function atualizarNC() {
    const dadosNC = getNC(ncId)
    if (dadosNC) {
      setNc({ ...dadosNC })
      if (dadosNC.registro_manutencao) {
        setDescricaoReparo(dadosNC.registro_manutencao.descricao)
      }
    }
  }

  // Ação 1: Assumir NC
  function handleAssumir() {
    if (!nc) return
    const atualizado = assumirNC(nc.id, usuario.id, usuario.nome)
    if (atualizado) {
      setAvisoSucesso('Você assumiu a responsabilidade por esta NC.')
      setTimeout(() => setAvisoSucesso(null), 3000)
      atualizarNC()
    }
  }

  // Ação 2: Iniciar Análise
  function handleIniciarAnalise() {
    if (!nc) return
    const atualizado = iniciarAnalise(nc.id, usuario.id, usuario.nome)
    if (atualizado) {
      setAvisoSucesso('Análise técnica iniciada.')
      setTimeout(() => setAvisoSucesso(null), 3000)
      atualizarNC()
    }
  }

  // Ação 3: Confirmar Correção (Mudar para Em Correção com descrição)
  function handleConfirmarCorrecao(e: React.FormEvent) {
    e.preventDefault()
    if (!nc || !descricaoReparo.trim()) return
    const atualizado = registrarCorrecao(nc.id, usuario.id, usuario.nome, descricaoReparo)
    if (atualizado) {
      setAvisoSucesso('Registro de manutenção criado e status do ativo atualizado.')
      setTimeout(() => setAvisoSucesso(null), 3000)
      setMostrarFormManutencao(false)
      atualizarNC()
    }
  }

  // Ação 4: Finalizar Reparo (Mudar para Aguardando Validação)
  function handleFinalizarReparo() {
    if (!nc) return
    const atualizado = finalizarReparo(nc.id, usuario.id, usuario.nome)
    if (atualizado) {
      setAvisoSucesso('Reparo finalizado. Enviado para validação do Coordenador.')
      setTimeout(() => setAvisoSucesso(null), 3000)
      atualizarNC()
    }
  }

  // Escalar Chamado
  function handleEscalar() {
    alert('⚠️ Alerta prioritário enviado ao Coordenador com sucesso!')
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

  const corStatus = STATUS_CORES[nc.status]
  const labelStatus = STATUS_LABELS[nc.status]
  const ativoStatusCfg = nc.ativo ? STATUS_ATIVO[nc.ativo.status] : null
  const pertenceAoUsuario = nc.responsavel_id === usuario.id
  const semResponsavel = nc.responsavel_id === null

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-32">
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

        {/* Alerta de Propriedade se for de outro profissional */}
        {!pertenceAoUsuario && !semResponsavel && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs font-medium leading-relaxed flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.03V3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              Esta Não Conformidade está sob responsabilidade de <span className="font-bold">{nc.responsavel_nome}</span>. Suas ações de alteração foram bloqueadas.
            </div>
          </div>
        )}

        {/* ── CARD 1: O ATIVO ── */}
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

        {/* ── CARD 2: A NÃO CONFORMIDADE (Abertura do Inspetor) ── */}
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

          {/* Observação Adicional do Inspetor se houver */}
          {nc.item_execucao.evidencia_texto && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Observações do Inspetor</h4>
              <p className="text-xs text-gray-500 italic">"{nc.item_execucao.evidencia_texto}"</p>
            </div>
          )}

          {/* Evidência URL (Foto) */}
          {nc.evidencia_url && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Evidência Fotográfica</h4>
              <div className="relative group cursor-zoom-in overflow-hidden rounded-2xl border border-gray-200">
                <img
                  src={nc.evidencia_url}
                  alt="Foto de evidência da não conformidade"
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

        {/* ── CARD 3: REGISTRO DE MANUTENÇÃO (Se ativo ou em formulário) ── */}
        {(nc.registro_manutencao || (pertenceAoUsuario && mostrarFormManutencao)) && (
          <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Registro Técnico de Manutenção</span>

            {pertenceAoUsuario && mostrarFormManutencao ? (
              /* Formulário de Preenchimento */
              <form onSubmit={handleConfirmarCorrecao} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Descrição do reparo/diagnóstico *
                  </label>
                  <textarea
                    required
                    rows={4}
                    autoFocus
                    placeholder="Descreva detalhadamente o diagnóstico, peças substituídas ou ações tomadas para corrigir o ativo..."
                    value={descricaoReparo}
                    onChange={(e) => setDescricaoReparo(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-800 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 resize-none transition-all"
                  />
                </div>
                <div className="flex gap-2.5">
                  <Botao
                    type="button"
                    variante="secundario"
                    tamanho="sm"
                    larguraTotal
                    onClick={() => setMostrarFormManutencao(false)}
                  >
                    Cancelar
                  </Botao>
                  <Botao
                    type="submit"
                    variante="primario"
                    tamanho="sm"
                    larguraTotal
                    disabled={!descricaoReparo.trim()}
                  >
                    Confirmar Registro
                  </Botao>
                </div>
              </form>
            ) : (
              /* Visualização do Registro Existente */
              <div className="space-y-3">
                <div className="bg-sky-50/50 rounded-xl p-3 border border-sky-100/60">
                  <p className="text-xs text-gray-700 leading-relaxed font-normal">
                    {nc.registro_manutencao?.descricao}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
                  <span>Status do Conserto:</span>
                  <span className={`font-bold uppercase tracking-wider ${nc.registro_manutencao?.status === 'finalizada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {nc.registro_manutencao?.status === 'finalizada' ? 'Finalizado' : 'Em andamento'}
                  </span>
                </div>
                {nc.registro_manutencao?.finalizada_em && (
                  <div className="text-[10px] text-gray-400 italic">
                    Finalizado em: {new Date(nc.registro_manutencao.finalizada_em).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CARD 4: TIMELINE / HISTÓRICO ── */}
        <div className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100/80 space-y-4">
          <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Histórico de Alterações</span>

          <div className="relative border-l border-gray-200 pl-4 ml-2.5 space-y-4 py-2">
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
                  {/* Bolinha da timeline */}
                  <span className={`absolute -left-[25.5px] top-[3px] w-2.5 h-2.5 rounded-full ${bolinhaCor}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800">
                      {hist.status_anterior !== hist.status_novo ? (
                        <>
                          Alterado para <span className="text-[#246BFD]">{STATUS_LABELS[hist.status_novo]}</span>
                        </>
                      ) : (
                        <>NC assumida por técnico</>
                      )}
                    </p>
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

      {/* ── BARRA INFERIOR DE CTAs iOS-STYLE (Ancorada) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#F4F6FA] via-[#F4F6FA]/90 to-transparent pt-6">
        <div className="bg-white/80 backdrop-blur-[18px] rounded-[24px] border border-white/50 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-3 flex flex-col gap-2.5">
          {semResponsavel ? (
            /* Ação Inicial: Assumir */
            <Botao
              variante="primario"
              tamanho="lg"
              larguraTotal
              onClick={handleAssumir}
              icone={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
            >
              Assumir Não Conformidade
            </Botao>
          ) : pertenceAoUsuario ? (
            /* Ações Dinâmicas para o Responsável */
            <>
              {nc.status === 'aberta' && (
                <Botao
                  variante="primario"
                  tamanho="lg"
                  larguraTotal
                  onClick={handleIniciarAnalise}
                  icone={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  }
                >
                  Iniciar Análise
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
                  Finalizar Reparo
                </Botao>
              )}
            </>
          ) : null}

          {/* Botão Secundário: Chamar Coordenador (Sempre disponível) */}
          <button
            type="button"
            onClick={handleEscalar}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200/50 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Chamar Coordenador
          </button>
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
