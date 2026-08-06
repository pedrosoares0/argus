'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { PillTag } from '@/components/ui/PillTag'
import { getNC, validarEEncerrarNC, reabrirNC, getUsuarioLogado, MockNaoConformidadeExtended } from '@/lib/supabase/mockDb'
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
  const [usuario, setUsuario] = useState({ id: '', nome: '' })
  const [fotoZoom, setFotoZoom] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [avisoSucesso, setAvisoSucesso] = useState<string | null>(null)
  const [confirmandoReabertura, setConfirmandoReabertura] = useState(false)

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
    setUsuario({ id: user.id, nome: user.nome })
  }, [ncId])

  function atualizarNC() {
    const dadosNC = getNC(ncId)
    if (dadosNC) {
      setNc({ ...dadosNC })
    }
  }

  // Ação 1: Validar e Encerrar NC
  function handleValidarEncerrar() {
    if (!nc) return
    const atualizado = validarEEncerrarNC(nc.id, usuario.id, usuario.nome)
    if (atualizado) {
      setAvisoSucesso('NC validada e encerrada com sucesso.')
      setTimeout(() => setAvisoSucesso(null), 4000)
      atualizarNC()
    }
  }

  // Ação 2: Reabrir Correção (volta para em_correcao)
  function handleReabrirCorrecao() {
    if (!nc) return
    const atualizado = reabrirNC(nc.id, usuario.id, usuario.nome)
    if (atualizado) {
      setAvisoSucesso('NC reaberta. Enviada de volta para a Engenharia Clínica.')
      setConfirmandoReabertura(false)
      setTimeout(() => setAvisoSucesso(null), 4000)
      atualizarNC()
    }
  }

  if (erro) {
    return (
      <div className="px-5 pt-10 text-center space-y-4">
        <p className="text-red-500 font-bold">{erro}</p>
        <Link href="/coordenador" className="inline-block text-[#7C3AED] font-bold">
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
  const ncEncerrada = nc.status === 'encerrada'
  const ncAguardando = nc.status === 'aguardando_validacao'

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-32">
      {/* Header compact com botão voltar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link
          href="/coordenador"
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

        {/* Badge NC Encerrada */}
        {ncEncerrada && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-600 text-xs font-bold flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">NC Encerrada</p>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">Esta não conformidade foi validada e encerrada. Somente leitura.</p>
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

        {/* ── CARD 3: REGISTRO DE MANUTENÇÃO ── */}
        {nc.registro_manutencao && (
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
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
            {nc.historico.map((hist, idx) => {
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
                  {/* Bolinha da timeline */}
                  <span className={`absolute -left-[25.5px] top-[3px] w-2.5 h-2.5 rounded-full ${bolinhaCor}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800">
                      {hist.status_anterior !== hist.status_novo ? (
                        <>
                          Alterado para <span className="text-[#7C3AED]">{STATUS_LABELS[hist.status_novo]}</span>
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

      {/* ── BARRA INFERIOR DE CTAs (somente se aguardando_validacao) ── */}
      {ncAguardando && (
        <div className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#F4F6FA] via-[#F4F6FA]/90 to-transparent pt-6">
          <div className="bg-white/80 backdrop-blur-[18px] rounded-[24px] border border-white/50 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-3 flex flex-col gap-2.5">

            {/* Modal de confirmação de reabertura */}
            {confirmandoReabertura ? (
              <div className="space-y-3 animate-[fadeIn_0.15s_ease-out]">
                <p className="text-xs text-gray-600 font-medium text-center px-2">
                  Confirma a reabertura? A NC voltará para a fila da Engenharia Clínica com status <span className="font-bold text-amber-600">Em Correção</span>.
                </p>
                <div className="flex gap-2.5">
                  <Botao
                    variante="secundario"
                    tamanho="sm"
                    larguraTotal
                    onClick={() => setConfirmandoReabertura(false)}
                  >
                    Cancelar
                  </Botao>
                  <Botao
                    variante="perigo"
                    tamanho="sm"
                    larguraTotal
                    onClick={handleReabrirCorrecao}
                    icone={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                    }
                  >
                    Confirmar
                  </Botao>
                </div>
              </div>
            ) : (
              <>
                {/* Botão Primário: Validar e Encerrar */}
                <Botao
                  variante="primario"
                  tamanho="lg"
                  larguraTotal
                  onClick={handleValidarEncerrar}
                  icone={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                >
                  Validar e Encerrar
                </Botao>

                {/* Botão Secundário: Reabrir Correção */}
                <button
                  type="button"
                  onClick={() => setConfirmandoReabertura(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-colors border border-gray-200 cursor-pointer active:scale-95"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Reabrir Correção
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* NC encerrada → sem botões, apenas somente leitura */}

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
