'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import type { RespostaItem, CriticidadeItem } from '@/lib/supabase/types'
import { criarClienteSupabase } from '@/lib/supabase/client'

export default function PaginaChecklist() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const assetId = params.id as string
  const execId = searchParams?.get('execId')
  const isReadOnly = !!execId

  const [ativo, setAtivo] = useState<any>(null)
  const [modelos, setModelos] = useState<any[]>([])
  const [modeloSelecionado, setModeloSelecionado] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  const [respostas, setRespostas] = useState<Record<string, any>>({})
  const [expandida, setExpandida] = useState<string | null>(null)
  
  const [modalNcItem, setModalNcItem] = useState<any | null>(null)
  const [ncDescricao, setNcDescricao] = useState('')
  const [ncCriticidade, setNcCriticidade] = useState<CriticidadeItem>('critico')
  const [ncFotoPreview, setNcFotoPreview] = useState<string | null>(null)
  const [ncFotoFile, setNcFotoFile] = useState<File | null>(null)
  const [ncEnviando, setNcEnviando] = useState(false)
  
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
          setErro('Nenhum dada encontrado para este ativo.')
          return
        }
        setAtivo(ativoData)

        // Se for modo somente leitura (histórico), carregar diretamente a execução e itens
        if (execId) {
          const { data: execData, error: execError } = await supabase
            .from('execucoes_checklist')
            .select('*, modelos_checklist(*)')
            .eq('id', execId)
            .single()

          if (execError) {
            console.error(execError)
            setErro(`Erro ao carregar execução: ${execError.message}`)
            return
          }

          if (execData) {
            setModeloSelecionado(execData.modelos_checklist)
            
            const { data: itemsExecData, error: itemsExecError } = await supabase
              .from('itens_execucao_checklist')
              .select('*')
              .eq('execucao_id', execId)

            if (itemsExecError) {
              console.error(itemsExecError)
              setErro(`Erro ao carregar itens da execução: ${itemsExecError.message}`)
              return
            }

            if (itemsExecData) {
              const sortedItems = [...itemsExecData].sort((a: any, b: any) => {
                const ordA = a.item_congelado?.ordem || 0
                const ordB = b.item_congelado?.ordem || 0
                return ordA - ordB
              })

              const formatados = sortedItems.map((item: any) => ({
                id: item.id,
                nome: item.item_congelado?.descricao || 'Seção',
                materiaisReferencia: [],
                criticidade: item.criticidade,
                rawDescricao: item.item_congelado?.descricao || 'Seção',
                ordem: item.item_congelado?.ordem || 1
              }))

              setItens(formatados)
              setRespostas(Object.fromEntries(sortedItems.map(i => [i.id, {
                resposta: i.resposta,
                evidencia_url: i.evidencia_url,
                evidencia_texto: i.evidencia_texto,
                criticidade: i.criticidade
              }])))
              setExpandida(formatados[0]?.id || null)
            }
          }
          return
        }

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
          // Default to 'Por plantão' model if it exists, otherwise the first one
          const padrao = modelosData.find((m: any) => m.nome_variante === 'Por plantão') || modelosData[0]
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
  }, [assetId, execId])

  useEffect(() => {
    async function carregarItens() {
      if (isReadOnly) return
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
  }, [modeloSelecionado, isReadOnly])

  const totalRespondidos = Object.values(respostas).filter((r) => r.resposta !== null).length
  const progresso = itens.length > 0 ? Math.round((totalRespondidos / itens.length) * 100) : 0
  const todosRespondidos = itens.length > 0 && totalRespondidos === itens.length

  function setResposta(id: string, resposta: RespostaItem) {
    if (resposta === 'nao_conforme') {
      const item = itens.find(i => i.id === id)
      setModalNcItem(item)
      setNcDescricao('')
      setNcCriticidade('critico')
      setNcFotoPreview(null)
      setNcFotoFile(null)
    } else {
      setRespostas((prev) => ({ ...prev, [id]: { resposta, evidencia_url: null, evidencia_texto: null } }))
      avancarProxima(id)
    }
  }

  function avancarProxima(id: string) {
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

  async function handleSalvarModalNc() {
    if (!modalNcItem) return
    setNcEnviando(true)
    try {
      let uploadedUrl = null
      if (ncFotoFile) {
        const supabase = criarClienteSupabase() as any
        const fileExt = ncFotoFile.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(filePath, ncFotoFile)

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('evidencias')
            .getPublicUrl(filePath)
          uploadedUrl = publicUrlData.publicUrl
        } else {
          console.error('Erro de upload:', uploadError)
          uploadedUrl = null
        }
      }

      setRespostas((prev) => ({
        ...prev,
        [modalNcItem.id]: {
          resposta: 'nao_conforme',
          evidencia_url: uploadedUrl || null,
          evidencia_texto: ncDescricao,
          criticidade: ncCriticidade
        }
      }))

      setModalNcItem(null)
      avancarProxima(modalNcItem.id)
    } catch (err) {
      console.error(err)
    } finally {
      setNcEnviando(false)
    }
  }

  function handleCancelarModalNc() {
    setModalNcItem(null)
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
        const respInfo = respostas[item.id] || { resposta: 'nao_se_aplica' }
        const resposta = respInfo.resposta || 'nao_se_aplica'

        let evidenciaUrl = null
        let evidenciaTexto = null
        let crit = item.criticidade

        if (resposta === 'nao_conforme') {
          evidenciaUrl = respInfo.evidencia_url || null
          evidenciaTexto = respInfo.evidencia_texto || null
          crit = respInfo.criticidade || item.criticidade
        }

        return {
          execucao_id: exec.id,
          item_congelado: {
            ordem: item.ordem || 1,
            descricao: item.rawDescricao
          },
          criticidade: crit,
          resposta: resposta,
          evidencia_url: evidenciaUrl,
          evidencia_texto: evidenciaTexto
        }
      })

      const { data: insertedItens, error: itensError } = await supabase
        .from('itens_execucao_checklist')
        .insert(itensExecucao)
        .select()

      if (itensError || !insertedItens) {
        console.error(itensError)
        alert('Erro ao salvar os itens do checklist.')
        setEnviando(false)
        return
      }

      // 3. Garantir a criação das Não Conformidades (fallback da trigger do Postgres) e atualizar status
      const itensNaoConformes = insertedItens.filter((it: any) => it.resposta === 'nao_conforme')
      
      if (itensNaoConformes.length > 0) {
        // Criar as NCs manualmente se a trigger falhar
        for (const item of itensNaoConformes) {
          const { data: triggerNc } = await supabase
            .from('nao_conformidades')
            .select('id')
            .eq('item_execucao_id', item.id)

          if (!triggerNc || triggerNc.length === 0) {
            console.log('Trigger de autocriação ausente no banco. Criando NC manualmente...');
            const { error: insertNcError } = await supabase
              .from('nao_conformidades')
              .insert({
                hospital_id: ativo.hospital_id,
                item_execucao_id: item.id,
                ativo_id: ativo.id,
                criticidade: item.criticidade,
                status: 'aberta',
                numero_unico: `NC-${new Date().getFullYear()}-${item.id.substring(0, 4).toUpperCase()}`
              })

            if (insertNcError) {
              console.error('Erro ao inserir NC manualmente:', insertNcError)
              throw insertNcError
            }
          }
        }

        // Atualizar status do ativo e do local de acordo com a criticidade
        const temCritico = itensNaoConformes.some((it: any) => it.criticidade === 'critico')
        const temImportante = itensNaoConformes.some((it: any) => it.criticidade === 'importante')

        let novoStatusAtivo = 'operacional'
        let novoStatusLocal = 'pronta'

        if (temCritico) {
          novoStatusAtivo = 'indisponivel'
          novoStatusLocal = 'nao_pronta'
        } else if (temImportante) {
          novoStatusAtivo = 'operacional_com_restricoes'
          novoStatusLocal = 'pronta_com_ressalvas'
        }

        // Atualizar ativo no banco
        await supabase
          .from('ativos')
          .update({ status: novoStatusAtivo })
          .eq('id', ativo.id)

        // Atualizar local no banco
        await supabase
          .from('locais')
          .update({ status: novoStatusLocal })
          .eq('id', ativo.local_id)

        // Limpar sessionStorage
        itens.forEach(item => {
          sessionStorage.removeItem(`sentry_nc_${item.id}`)
        })

        // Enviar e-mails de notificação pelo Resend
        for (const item of itensNaoConformes) {
          const descricao = item.evidencia_texto || 'Não conformidade registrada no checklist.'
          const criticidade = item.criticidade || 'critico'
          const localNome = `${ativo.locais?.unidade || ''} - ${ativo.locais?.nome || ''}`
          
          await enviarEmailResend({
            nomeAtivo: ativo.nome,
            local: localNome,
            descricao: descricao,
            criticidade: criticidade,
            evidenciaUrl: item.evidencia_url || null
          }).catch(err => console.error('Erro de envio de email:', err))
        }
      } else {
        // Se todas as respostas forem conformes, garantir que o ativo/local fiquem operacionais/prontos
        await supabase
          .from('ativos')
          .update({ status: 'operacional' })
          .eq('id', ativo.id)

        await supabase
          .from('locais')
          .update({ status: 'pronta' })
          .eq('id', ativo.local_id)
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
        href={isReadOnly ? '/inspetor/inspecoes' : `/inspetor/local/${ativo.local_id}`}
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
          {isReadOnly ? (
            <div className="mt-3">
              <span className="inline-flex px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#246BFD]/8 border border-[#246BFD]/15 text-[#246BFD]">
                Visualizando: {modeloSelecionado?.nome_variante || 'Checklist'}
              </span>
            </div>
          ) : (
            <div className="mt-3">
              <span className="inline-flex px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600">
                Variante: Por plantão
              </span>
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
                      onClick={() => !isReadOnly && setResposta(secao.id, 'conforme')}
                      className={[
                        'relative py-3 rounded-2xl text-[11px] font-extrabold tracking-tight transition-all duration-200 border',
                        'flex flex-col items-center justify-center gap-1',
                        isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-95',
                        resp.resposta === 'conforme'
                          ? 'bg-[#34C759] border-[#34C759] text-white shadow-[0_4px_12px_rgba(52,199,89,0.25)] scale-[1.02]'
                          : 'bg-white border-gray-200 text-[#34C759]' + (isReadOnly ? '' : ' hover:bg-[#34C759]/5'),
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
                      onClick={() => !isReadOnly && setResposta(secao.id, 'nao_conforme')}
                      className={[
                        'relative py-3 rounded-2xl text-[11px] font-extrabold tracking-tight transition-all duration-200 border',
                        'flex flex-col items-center justify-center gap-1',
                        isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-95',
                        resp.resposta === 'nao_conforme'
                          ? 'bg-[#FF3B30] border-[#FF3B30] text-white shadow-[0_4px_12px_rgba(255,59,48,0.25)] scale-[1.02]'
                          : 'bg-white border-gray-200 text-[#FF3B30]' + (isReadOnly ? '' : ' hover:bg-[#FF3B30]/5'),
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
                      onClick={() => !isReadOnly && setResposta(secao.id, 'nao_se_aplica')}
                      className={[
                        'relative py-3 rounded-2xl text-[11px] font-extrabold tracking-tight transition-all duration-200 border',
                        'flex flex-col items-center justify-center gap-1 text-center',
                        isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-95',
                        resp.resposta === 'nao_se_aplica'
                          ? 'bg-[#8E8E93] border-[#8E8E93] text-white shadow-[0_4px_12px_rgba(142,142,147,0.25)] scale-[1.02]'
                          : 'bg-white border-gray-200 text-[#8E8E93]' + (isReadOnly ? '' : ' hover:bg-[#8E8E93]/5'),
                      ].join(' ')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                      <span>Não se aplica</span>
                    </button>
                  </div>

                  {/* Evidências e Descrição da NC (mostrado quando resposta é nao_conforme e possui descrição/foto) */}
                  {resp.resposta === 'nao_conforme' && (resp.evidencia_texto || resp.evidencia_url) && (
                    <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100/50 space-y-3 mt-3">
                      {resp.evidencia_texto && (
                        <div>
                          <p className="text-[10px] font-bold text-red-400 tracking-[0.08em] uppercase">
                            Descrição da NC
                          </p>
                          <p className="text-[14px] text-gray-700 font-medium leading-relaxed mt-1">
                            {resp.evidencia_texto}
                          </p>
                        </div>
                      )}
                      {resp.evidencia_url && (
                        <div>
                          <p className="text-[10px] font-bold text-red-400 tracking-[0.08em] uppercase mb-1">
                            Evidência Fotográfica
                          </p>
                          <img
                            src={resp.evidencia_url}
                            alt="Evidência"
                            className="rounded-xl max-h-48 object-cover border border-gray-150"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botão de Conclusão */}
      {isReadOnly ? (
        <div className="pt-3 pb-6">
          <Botao
            variante="primario"
            tamanho="lg"
            larguraTotal
            onClick={() => router.push('/inspetor/inspecoes')}
            icone={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            }
          >
            Voltar ao Histórico
          </Botao>
        </div>
      ) : (
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
      )}

      {/* Modal de Registro de NC (In-Page para não perder o estado dos outros itens!) */}
      {modalNcItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-gray-100/80 space-y-5 animate-[scaleIn_0.15s_ease-out] overflow-y-auto max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Registrar Não Conformidade</h3>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">
                  Item: {modalNcItem.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelarModalNc}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                O que está inconforme?
              </label>
              <textarea
                rows={3}
                required
                placeholder="Ex: Faltando cânula de Guedel ou laringoscópio sem bateria..."
                value={ncDescricao}
                onChange={(e) => setNcDescricao(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200/80 rounded-2xl px-4 py-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-1 focus:ring-[#246BFD]/10 transition-all resize-none"
              />
            </div>

            {/* Evidência */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Evidência Fotográfica
              </label>
              
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setNcFotoFile(file)
                    setNcFotoPreview(URL.createObjectURL(file))
                  }
                }}
                className="hidden"
                id="modal-foto-input"
              />

              {ncFotoPreview ? (
                <div className="relative">
                  <img
                    src={ncFotoPreview}
                    alt="Preview"
                    className="w-full h-36 object-cover rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNcFotoPreview(null)
                      setNcFotoFile(null)
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] font-bold hover:bg-black/80 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('modal-foto-input')?.click()}
                  className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:border-[#246BFD] hover:text-[#246BFD] transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  </svg>
                  <span className="text-[11px] font-bold">Tirar foto ou anexar</span>
                </button>
              )}
            </div>

            {/* Criticidade */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Criticidade
              </label>
              <div className="flex gap-1.5">
                {[
                  { valor: 'critico', label: 'Crítico', cor: 'bg-red-50 text-red-700 border-red-200' },
                  { valor: 'importante', label: 'Importante', cor: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { valor: 'informativo', label: 'Informativo', cor: 'bg-sky-50 text-sky-700 border-sky-200' }
                ].map((c) => {
                  const sel = ncCriticidade === c.valor
                  return (
                    <button
                      key={c.valor}
                      type="button"
                      onClick={() => setNcCriticidade(c.valor as any)}
                      className={[
                        'flex-1 py-2 px-1 text-[11px] font-extrabold rounded-xl border text-center transition-all cursor-pointer',
                        sel ? `${c.cor} border-2 shadow-xs scale-[1.02]` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      ].join(' ')}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-2">
              <Botao
                type="button"
                variante="secundario"
                larguraTotal
                onClick={handleCancelarModalNc}
                disabled={ncEnviando}
              >
                Cancelar
              </Botao>
              <Botao
                type="button"
                variante="primario"
                larguraTotal
                onClick={handleSalvarModalNc}
                carregando={ncEnviando}
                disabled={!ncDescricao.trim()}
              >
                Confirmar
              </Botao>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

async function enviarEmailResend(dados: {
  nomeAtivo: string
  local: string
  descricao: string
  criticidade: string
  evidenciaUrl?: string | null
}) {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dados)
    })

    if (!res.ok) {
      console.error('Erro ao chamar API de e-mail:', await res.text())
    } else {
      console.log('Email enviado com sucesso (processado via API interna):', await res.json())
    }
  } catch (err) {
    console.error('Erro de rede ao enviar e-mail via API interna:', err)
  }
}
