'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import type { RespostaItem } from '@/lib/supabase/types'
import { criarClienteSupabase } from '@/lib/supabase/client'

export default function PaginaChecklist() {
  const router = useRouter()
  const params = useParams()
  const assetId = params.id as string

  const [ativo, setAtivo] = useState<any>(null)
  const [modelos, setModelos] = useState<any[]>([])
  const [modeloSelecionado, setModeloSelecionado] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  const [respostas, setRespostas] = useState<Record<string, { resposta: RespostaItem | null }>>({})
  const [expandida, setExpandida] = useState<string | null>(null)
  
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [iniciadoEm] = useState(() => new Date().toISOString())
  const [usuario, setUsuario] = useState<any>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDados() {
      try {
        const supabase = criarClienteSupabase() as any
        
        // 1. Obter usuário logado
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error(userError)
          setErro(`Erro ao obter usuário: ${userError.message}`)
          return
        }

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (profileError) {
            console.error(profileError)
            setErro(`Erro ao obter perfil: ${profileError.message} (Código ${profileError.code})`)
            return
          }
          setUsuario(profile)
        }

        // 2. Carregar ativo (se for prefixado com ronda-, busca o primeiro ativo da sala correspondente)
        const cleanAssetId = decodeURIComponent(assetId).trim().replace(/['"]/g, '')
        let targetAssetId = cleanAssetId

        if (cleanAssetId.includes('ronda-')) {
          const roomId = cleanAssetId.split('ronda-')[1].trim()
          const { data: roomAtivos, error: roomAtivosError } = await supabase
            .from('ativos')
            .select('id')
            .eq('local_id', roomId)
            .limit(1)

          if (roomAtivosError || !roomAtivos || roomAtivos.length === 0) {
            setErro('Não foi encontrado nenhum ativo cadastrado nesta sala para iniciar a ronda.')
            return
          }
          targetAssetId = roomAtivos[0].id
        }

        const { data: ativoData, error: ativoError } = await supabase
          .from('ativos')
          .select('*, locais(*)')
          .eq('id', targetAssetId)
          .single()

        if (ativoError) {
          console.error(ativoError)
          setErro(`Erro ao carregar ativo: ${ativoError.message} (Código ${ativoError.code})`)
          return
        }

        if (!ativoData) {
          setErro('Nenhum dado encontrado para este ativo.')
          return
        }
        setAtivo(ativoData)

        // 3. Carregar modelos vigentes para esta categoria
        const { data: modelosData, error: modelosError } = await supabase
          .from('modelos_checklist')
          .select('*')
          .eq('categoria_id', ativoData.categoria_id)
          .eq('vigente', true)

        if (modelosError) {
          console.error(modelosError)
          setErro(`Erro ao carregar modelos: ${modelosError.message} (Código ${modelosError.code})`)
          return
        }

        if (modelosData && modelosData.length > 0) {
          setModelos(modelosData)
          // Default to 'Completo' model if it exists, otherwise the first one
          const padrao = modelosData.find((m: any) => m.nome_variante === 'Completo') || modelosData[0]
          setModeloSelecionado(padrao)
        } else {
          setErro('Nenhum modelo de checklist vigente cadastrado para a categoria deste ativo.')
        }
      } catch (err: any) {
        console.error(err)
        setErro(`Erro de conexão: ${err.message || err}`)
      } finally {
        setCarregando(false)
      }
    }
    if (assetId) {
      carregarDados()
    }
  }, [assetId])

  useEffect(() => {
    async function carregarItens() {
      if (!modeloSelecionado) return
      try {
        const supabase = criarClienteSupabase()
        const { data: itemsData, error } = await supabase
          .from('itens_modelo_checklist')
          .select('*')
          .eq('modelo_id', modeloSelecionado.id)
          .order('ordem', { ascending: true })

        if (error) {
          console.error(error)
          return
        }

        if (itemsData) {
          const formatados = itemsData.map((item: any) => {
            const partes = item.descricao.split(' — itens_esperados: ')
            const secaoNome = partes[0]
            const materiaisTexto = partes[1] || ''
            const materiaisReferencia = materiaisTexto ? materiaisTexto.split('; ') : []
            return {
              id: item.id,
              nome: secaoNome,
              materiaisReferencia,
              criticidade: item.criticidade,
              rawDescricao: item.descricao,
              ordem: item.ordem
            }
          })
          setItens(formatados)
          setRespostas(Object.fromEntries(formatados.map(i => [i.id, { resposta: null }])))
          setExpandida(formatados[0]?.id || null)
        }
      } catch (err) {
        console.error(err)
      }
    }
    carregarItens()
  }, [modeloSelecionado])

  const totalRespondidos = Object.values(respostas).filter((r) => r.resposta !== null).length
  const progresso = itens.length > 0 ? Math.round((totalRespondidos / itens.length) * 100) : 0
  const todosRespondidos = itens.length > 0 && totalRespondidos === itens.length

  function setResposta(id: string, resposta: RespostaItem) {
    setRespostas((prev) => ({ ...prev, [id]: { resposta } }))
    if (resposta === 'nao_conforme') {
      const item = itens.find(i => i.id === id)
      router.push(`/inspetor/nc/nova?secao=${id}&secaoNome=${encodeURIComponent(item?.nome || '')}`)
    } else {
      const idx = itens.findIndex((s) => s.id === id)
      const proxima = itens.slice(idx + 1).find((s) => respostas[s.id]?.resposta === null)
      if (proxima) {
        setTimeout(() => {
          setExpandida(proxima.id)
          setTimeout(() => {
            const el = document.getElementById(`secao-${proxima.id}`)
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 150)
        }, 250)
      }
    }
  }

  async function handleConcluir() {
    setEnviando(true)
    try {
      const supabase = criarClienteSupabase() as any
      
      // 1. Criar execucoes_checklist
      const { data: exec, error: execError } = await supabase
        .from('execucoes_checklist')
        .insert({
          hospital_id: ativo.hospital_id,
          ativo_id: ativo.id,
          modelo_id: modeloSelecionado.id,
          usuario_id: usuario?.id || (await supabase.auth.getUser()).data.user?.id,
          status: 'concluida',
          iniciado_em: iniciadoEm,
          finalizado_em: new Date().toISOString()
        })
        .select('id')
        .single()

      if (execError || !exec) {
        console.error(execError)
        alert('Erro ao salvar a execução do checklist.')
        setEnviando(false)
        return
      }

      // 2. Criar itens_execucao_checklist
      const itensExecucao = itens.map(item => {
        // Tentar obter dados salvos na sessionStorage para esse item se for não conforme
        let evidenciaUrl = null
        let evidenciaTexto = null
        let crit = item.criticidade

        const storedNc = sessionStorage.getItem(`sentry_nc_${item.id}`)
        if (storedNc) {
          try {
            const parsed = JSON.parse(storedNc)
            evidenciaTexto = parsed.descricao || null
            crit = parsed.criticidade || item.criticidade
            evidenciaUrl = parsed.fotoPreview || null
          } catch (e) {
            console.error(e)
          }
        }

        return {
          execucao_id: exec.id,
          item_congelado: {
            ordem: item.ordem || 1,
            descricao: item.rawDescricao
          },
          criticidade: crit,
          resposta: respostas[item.id].resposta!,
          evidencia_url: evidenciaUrl,
          evidencia_texto: evidenciaTexto
        }
      })

      const { error: itensError } = await supabase
        .from('itens_execucao_checklist')
        .insert(itensExecucao)

      if (itensError) {
        console.error(itensError)
        alert('Erro ao salvar os itens do checklist.')
        setEnviando(false)
        return
      }

      // Enviar e-mails para cada item não conforme cadastrado
      const itensNaoConformes = itensExecucao.filter(it => it.resposta === 'nao_conforme')
      if (itensNaoConformes.length > 0) {
        for (const item of itensNaoConformes) {
          const descricao = item.evidencia_texto || 'Não conformidade registrada no checklist.'
          const criticidade = item.criticidade || 'critico'
          const localNome = `${ativo.locais?.unidade || ''} - ${ativo.locais?.nome || ''}`
          
          await enviarEmailResend({
            nomeAtivo: ativo.nome,
            local: localNome,
            descricao: descricao,
            criticidade: criticidade
          }).catch(err => console.error('Erro de envio de email:', err))
        }
      }

      router.push('/inspetor')
    } catch (err) {
      console.error(err)
      alert('Erro inesperado ao concluir checklist.')
      setEnviando(false)
    }
  }

  if (erro) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F4F6FA] p-6 space-y-4">
        <p className="text-sm font-semibold text-red-500 text-center">{erro}</p>
        <Link href="/inspetor" className="text-xs font-bold text-[#246BFD] underline">
          Voltar para Início
        </Link>
      </div>
    )
  }

  if (carregando || !ativo || !modeloSelecionado) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F4F6FA]">
        <p className="text-sm font-semibold text-gray-400 animate-pulse">Carregando checklist...</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-4 pb-10 space-y-5">
      {/* Voltar */}
      <Link
        href={`/inspetor/local/${ativo.local_id}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-600 hover:text-black transition-colors -ml-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Voltar
      </Link>

      {/* Card de Contexto */}
      <div className="bg-white rounded-[24px] p-6 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-[#0284C7] tracking-wider uppercase">
            {ativo.locais?.nome || 'Sala'}
          </p>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-1">{ativo.nome}</h1>
          
          {/* Seletor de Modelo */}
          {modelos.length > 1 && (
            <div className="mt-3 flex gap-2">
              {modelos.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModeloSelecionado(m)}
                  className={[
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer',
                    modeloSelecionado.id === m.id
                      ? 'bg-[#246BFD] border-[#246BFD] text-white shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  ].join(' ')}
                >
                  {m.nome_variante}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] font-semibold">
            <span className="text-gray-500">Progresso</span>
            <span className="text-gray-900 tabular-nums">{totalRespondidos} / {itens.length}</span>
          </div>
          <div className="w-full h-[6px] bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#246BFD] rounded-full transition-all duration-500 ease-out" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </div>

      {/* Lista de Seções — cards individuais */}
      <div className="space-y-3">
        {itens.map((secao) => {
          const resp = respostas[secao.id] || { resposta: null }
          const aberta = expandida === secao.id

          // Ícone de status baseado na resposta
          const StatusIcon = () => {
            if (resp.resposta === 'conforme') {
              return (
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )
            }
            if (resp.resposta === 'nao_conforme') {
              return (
                <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )
            }
            if (resp.resposta === 'nao_se_aplica') {
              return (
                <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                </div>
              )
            }
            // Pendente
            return (
              <div className="w-7 h-7 rounded-full border-2 border-gray-200 shrink-0" />
            )
          }

          return (
            <div
              key={secao.id}
              id={`secao-${secao.id}`}
              className={[
                'bg-white rounded-[20px] overflow-hidden transition-all duration-200',
                aberta
                  ? 'shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-gray-200/80'
                  : 'shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-gray-100/80',
              ].join(' ')}
            >
              {/* Header da seção */}
              <button
                type="button"
                onClick={() => setExpandida(aberta ? null : secao.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon />
                  <span className="text-[15px] font-semibold text-gray-900">{secao.nome}</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Conteúdo Expandido */}
              {aberta && (
                <div className="px-5 pb-5 space-y-4 animate-[fadeIn_0.15s_ease-out]">
                  {/* Separador sutil */}
                  <div className="h-px bg-gray-100" />

                  {/* Materiais em card inset */}
                  {secao.materiaisReferencia.length > 0 && (
                    <div className="bg-[#F4F6FA] rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 tracking-[0.08em] uppercase">
                        Verifique os materiais
                      </p>
                      <div className="space-y-1.5">
                        {secao.materiaisReferencia.map((mat: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-gray-300 mt-[9px] shrink-0" />
                            <span className="text-[15px] text-gray-600 leading-snug">{mat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações — botões estilo Apple */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Conforme */}
                    <button
                      type="button"
                      onClick={() => setResposta(secao.id, 'conforme')}
                      className={[
                        'relative py-3 rounded-2xl text-[11px] font-extrabold tracking-tight transition-all duration-200 cursor-pointer border',
                        'flex flex-col items-center justify-center gap-1',
                        resp.resposta === 'conforme'
                          ? 'bg-[#34C759] border-[#34C759] text-white shadow-[0_4px_12px_rgba(52,199,89,0.25)] scale-[1.02]'
                          : 'bg-white border-gray-200 text-[#34C759] hover:bg-[#34C759]/5 active:scale-95',
                      ].join(' ')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>Conforme</span>
                    </button>

                    {/* Não Conforme */}
                    <button
                      type="button"
                      onClick={() => setResposta(secao.id, 'nao_conforme')}
                      className={[
                        'relative py-3 rounded-2xl text-[11px] font-extrabold tracking-tight transition-all duration-200 cursor-pointer border',
                        'flex flex-col items-center justify-center gap-1',
                        resp.resposta === 'nao_conforme'
                          ? 'bg-[#FF3B30] border-[#FF3B30] text-white shadow-[0_4px_12px_rgba(255,59,48,0.25)] scale-[1.02]'
                          : 'bg-white border-gray-200 text-[#FF3B30] hover:bg-[#FF3B30]/5 active:scale-95',
                      ].join(' ')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Não conforme</span>
                    </button>

                    {/* Não se aplica */}
                    <button
                      type="button"
                      onClick={() => setResposta(secao.id, 'nao_se_aplica')}
                      className={[
                        'relative py-3 rounded-2xl text-[11px] font-extrabold tracking-tight transition-all duration-200 cursor-pointer border',
                        'flex flex-col items-center justify-center gap-1 text-center',
                        resp.resposta === 'nao_se_aplica'
                          ? 'bg-[#8E8E93] border-[#8E8E93] text-white shadow-[0_4px_12px_rgba(142,142,147,0.25)] scale-[1.02]'
                          : 'bg-white border-gray-200 text-[#8E8E93] hover:bg-[#8E8E93]/5 active:scale-95',
                      ].join(' ')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                      <span>Não se aplica</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botão de Conclusão */}
      <div className="pt-3 pb-6">
        <Botao
          variante="primario"
          tamanho="lg"
          larguraTotal
          carregando={enviando}
          disabled={!todosRespondidos}
          onClick={handleConcluir}
          icone={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          {todosRespondidos ? 'Concluir inspeção' : `Responda todas (${totalRespondidos}/${itens.length})`}
        </Botao>
      </div>
    </div>
  )
}

async function enviarEmailResend(dados: {
  nomeAtivo: string
  local: string
  descricao: string
  criticidade: string
}) {
  const apiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY || ''
  
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #e11d48; margin-top: 0;">⚠️ Nova Não Conformidade Aberta (NC)</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Uma nova Não Conformidade foi registrada pelo inspetor no Sentry.</p>
      
      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Detalhes do Ocorrido</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #475569; font-weight: bold; width: 120px;">Ativo:</td>
            <td style="padding: 4px 0; color: #0f172a;">${dados.nomeAtivo}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #475569; font-weight: bold;">Local / Sala:</td>
            <td style="padding: 4px 0; color: #0f172a;">${dados.local}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #475569; font-weight: bold;">Criticidade:</td>
            <td style="padding: 4px 0; color: #0f172a;">
              <span style="background-color: ${dados.criticidade === 'critico' ? '#fee2e2' : dados.criticidade === 'importante' ? '#fef3c7' : '#e0f2fe'}; color: ${dados.criticidade === 'critico' ? '#991b1b' : dados.criticidade === 'importante' ? '#92400e' : '#0369a1'}; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                ${dados.criticidade}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0 4px 0; color: #475569; font-weight: bold; vertical-align: top;">Descrição:</td>
            <td style="padding: 8px 0 4px 0; color: #334155; line-height: 1.4;">${dados.descricao}</td>
          </tr>
        </table>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Por favor, verifique a fila de atendimento no aplicativo Sentry para iniciar o diagnóstico ou validação.</p>
      
      <div style="text-align: center; margin: 25px 0 10px 0;">
        <a href="https://sentry-clinica.vercel.app/login" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Acessar Sentry</a>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 15px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Este é um e-mail automático gerado pelo sistema Sentry.</p>
    </div>
  `

  const destinatarios = ['pedro.ssoares05@icloud.com', 'pedrosoaress365@gmail.com']

  for (const to of destinatarios) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from: 'Sentry <onboarding@resend.dev>',
          to: to,
          subject: `[Sentry] Nova NC Registrada: ${dados.nomeAtivo}`,
          html: htmlContent
        })
      })
      if (!res.ok) {
        console.error(`Erro ao enviar para ${to}:`, await res.text())
      } else {
        console.log(`Email enviado para ${to}`)
      }
    } catch (err) {
      console.error(`Erro de rede ao enviar para ${to}:`, err)
    }
  }
}
