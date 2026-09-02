'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { dadosCache } from '@/lib/cache/dadosCache'
import { TODOS_SETORES, SETORES_LABELS, SETORES_ICONES } from '@/lib/roteamentoNC'
import type { RespostaItem, CriticidadeItem, SetorTecnico } from '@/lib/supabase/types'

const SETORES_CORES_ATIVAS: Record<string, string> = {
  engenharia_clinica: 'bg-amber-100/90 border-amber-300 text-amber-900 shadow-xs scale-[1.02]',
  manutencao: 'bg-slate-200/90 border-slate-300 text-slate-800 shadow-xs scale-[1.02]',
  farmacia: 'bg-red-100/90 border-red-300 text-red-900 shadow-xs scale-[1.02]',
  almoxarifado: 'bg-[#F2E8E1] border-[#D9C3B0] text-[#6E3516] shadow-xs scale-[1.02]'
}

function ComponenteChecklist() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const assetId = params.id as string
  const execId = searchParams?.get('execId')
  const isReadOnly = !!execId

  const cacheKey = execId ? `inspetor_checklist_exec_${execId}` : `inspetor_checklist_ativo_${assetId}`
  const cached = dadosCache.get<any>(cacheKey)

  const [ativo, setAtivo] = useState<any>(() => cached?.ativo || null)
  const [modelos, setModelos] = useState<any[]>(() => cached?.modelos || [])
  const [modeloSelecionado, setModeloSelecionado] = useState<any>(() => cached?.modeloSelecionado || null)
  const [itens, setItens] = useState<any[]>(() => cached?.itens || [])
  const [respostas, setRespostas] = useState<Record<string, any>>(() => cached?.respostas || {})
  const [expandida, setExpandida] = useState<string | null>(() => cached?.expandida || null)

  const [modalNcItem, setModalNcItem] = useState<any | null>(null)
  const [ncDescricao, setNcDescricao] = useState('')
  const [ncCriticidade, setNcCriticidade] = useState<CriticidadeItem>('critico')
  const [ncSetor, setNcSetor] = useState<SetorTecnico>('engenharia_clinica')
  const [ncFotoPreview, setNcFotoPreview] = useState<string | null>(null)
  const [ncFotoFile, setNcFotoFile] = useState<File | null>(null)
  const [ncEnviando, setNcEnviando] = useState(false)

  const [carregando, setCarregando] = useState(() => !cached)
  const [enviando, setEnviando] = useState(false)
  const [iniciadoEm] = useState(() => new Date().toISOString())
  const [usuario, setUsuario] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = (localStorage.getItem('primus_usuario_atual') || localStorage.getItem('argus_usuario_atual'))
        if (stored) return JSON.parse(stored)
      } catch (e) {
        console.error(e)
      }
    }
    return null
  })
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [proximoAtivo, setProximoAtivo] = useState<{ id: string; nome: string } | null>(null)
  const [executorInspecao, setExecutorInspecao] = useState<{ nome: string; perfil: string } | null>(null)
  const [fotoZoom, setFotoZoom] = useState<{ url: string; autorNome?: string; autorPerfil?: string } | string | null>(null)

  function formatarPerfil(perfil?: string | null) {
    if (!perfil) return 'Inspetor'
    const p = perfil.toLowerCase()
    if (p === 'inspetor') return 'Inspetor'
    if (p === 'coordenador') return 'Coordenador'
    if (p === 'engenharia') return 'Engenharia Clínica'
    if (p === 'tecnico') return 'Técnico'
    return perfil.charAt(0).toUpperCase() + perfil.slice(1)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setFotoZoom(null)
      }
    }
    if (fotoZoom) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [fotoZoom])

  const primeiroNome = (() => {
    if (!usuario?.nome) return ''
    const limpo = String(usuario.nome)
      .replace(/^(Enf\.?|Enfermeiro\(a\)|Enfermeiro|Enfermeira|Téc\.?|Técnico|Técnica|Dr\.?|Dra\.?|Doutor|Doutora)\s+/i, '')
      .trim()
    return limpo.split(' ')[0] || ''
  })()

  useEffect(() => {
    async function carregarDados() {
      try {
        const supabase = criarClienteSupabase() as any

        // 1. Obter usuário (se não estiver em cache local)
        let currentUser = usuario
        if (!currentUser) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase
              .from('usuarios')
              .select('*')
              .eq('id', user.id)
              .single()
            if (profile) {
              currentUser = profile
              setUsuario(profile)
            }
          }
        }

        // 2. Se for modo histórico (somente leitura com execId)
        if (execId) {
          const [execRes, itemsExecRes] = await Promise.all([
            supabase
              .from('execucoes_checklist')
              .select('*, usuarios(nome, perfil), modelos_checklist(*), ativos(*, locais(*))')
              .eq('id', execId)
              .single(),
            supabase
              .from('itens_execucao_checklist')
              .select('*')
              .eq('execucao_id', execId)
          ])

          if (execRes.error) {
            setErro(`Erro ao carregar execução: ${execRes.error.message}`)
            return
          }

          const execData = execRes.data
          const itemsExecData = itemsExecRes.data || []

          if (execData) {
            if (execData.usuarios) {
              setExecutorInspecao({
                nome: execData.usuarios.nome,
                perfil: execData.usuarios.perfil
              })
            }
            if (execData.ativos) setAtivo(execData.ativos)
            setModeloSelecionado(execData.modelos_checklist)

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

            const respMap = Object.fromEntries(sortedItems.map(i => [i.id, {
              resposta: i.resposta,
              evidencia_url: i.evidencia_url,
              evidencia_texto: i.evidencia_texto,
              criticidade: i.criticidade
            }]))

            setItens(formatados)
            setRespostas(respMap)
            setExpandida(formatados[0]?.id || null)

            dadosCache.set(cacheKey, {
              ativo: execData.ativos,
              modeloSelecionado: execData.modelos_checklist,
              itens: formatados,
              respostas: respMap,
              expandida: formatados[0]?.id || null,
            })
          }
          return
        }

        // 3. Modo Inspeção Normal: Carregar ativo e modelos em paralelo
        const cleanAssetId = decodeURIComponent(assetId).trim().replace(/['"]/g, '')
        let targetAssetId = cleanAssetId

        if (cleanAssetId.includes('ronda-')) {
          const roomId = cleanAssetId.split('ronda-')[1].trim()
          const { data: roomAtivos } = await supabase
            .from('ativos')
            .select('id')
            .eq('local_id', roomId)
            .limit(1)

          if (!roomAtivos || roomAtivos.length === 0) {
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

        if (ativoError || !ativoData) {
          console.error(ativoError)
          setErro('Ativo não encontrado.')
          return
        }

        setAtivo(ativoData)

        // 4. Carregar modelos vigentes para a categoria do ativo
        const { data: modelosData, error: modelosError } = await supabase
          .from('modelos_checklist')
          .select('*')
          .eq('categoria_id', ativoData.categoria_id)
          .eq('vigente', true)

        if (modelosError || !modelosData || modelosData.length === 0) {
          setErro('Nenhum modelo de checklist vigente cadastrado para a categoria deste ativo.')
          return
        }

        setModelos(modelosData)
        const padrao = modelosData.find((m: any) => m.nome_variante === 'Por plantão') || modelosData[0]
        setModeloSelecionado(padrao)

        // 5. Carregar itens do modelo padrão imediatamente
        const { data: itemsData } = await supabase
          .from('itens_modelo_checklist')
          .select('*')
          .eq('modelo_id', padrao.id)
          .order('ordem', { ascending: true })

        if (itemsData && itemsData.length > 0) {
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

          const initialResps = Object.fromEntries(formatados.map((i: any) => [i.id, { resposta: null }]))
          let respsFinais = initialResps

          // Buscar se este ativo já foi inspecionado HOJE para pré-preencher as respostas salvas
          try {
            const inicioHoje = new Date()
            inicioHoje.setHours(0, 0, 0, 0)

            const { data: ultimaExecHoje } = await supabase
              .from('execucoes_checklist')
              .select('id, iniciado_em, finalizado_em, usuarios(nome, perfil)')
              .eq('ativo_id', targetAssetId)
              .eq('status', 'concluida')
              .gte('finalizado_em', inicioHoje.toISOString())
              .order('finalizado_em', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (ultimaExecHoje) {
              if (ultimaExecHoje.usuarios) {
                setExecutorInspecao({
                  nome: (ultimaExecHoje as any).usuarios?.nome,
                  perfil: (ultimaExecHoje as any).usuarios?.perfil
                })
              }
              const { data: itensExecSalvos } = await supabase
                .from('itens_execucao_checklist')
                .select('*, nao_conformidades(*)')
                .eq('execucao_id', ultimaExecHoje.id)

              if (itensExecSalvos && itensExecSalvos.length > 0) {
                const respSalvasMap: Record<string, any> = {}
                formatados.forEach((itemFormatado: any) => {
                  const match = itensExecSalvos.find(
                    (it: any) => 
                      it.item_congelado?.descricao === itemFormatado.rawDescricao ||
                      it.item_congelado?.ordem === itemFormatado.ordem
                  )

                  if (match) {
                    respSalvasMap[itemFormatado.id] = {
                      resposta: match.resposta,
                      evidencia_url: match.evidencia_url || null,
                      evidencia_texto: match.evidencia_texto || null,
                      criticidade: match.criticidade,
                      setor_responsavel: match.nao_conformidades?.[0]?.setor_responsavel || 'engenharia_clinica'
                    }
                  } else {
                    respSalvasMap[itemFormatado.id] = { resposta: null }
                  }
                })
                respsFinais = respSalvasMap
              }
            }
          } catch (errExecAnterior) {
            console.error('Erro ao verificar execução anterior de hoje:', errExecAnterior)
          }

          setItens(formatados)
          setRespostas(respsFinais)
          setExpandida((prev) => prev || formatados[0]?.id || null)

          dadosCache.set(cacheKey, {
            ativo: ativoData,
            modelos: modelosData,
            modeloSelecionado: padrao,
            itens: formatados,
            respostas: respsFinais,
            expandida: formatados[0]?.id || null,
          })
        }

        // 6. Buscar outros ativos desta mesma sala para identificar o próximo equipamento da ronda
        if (ativoData.local_id) {
          try {
            const inicioHoje = new Date()
            inicioHoje.setHours(0, 0, 0, 0)

            const [salaAtivosRes, execsHojeRes] = await Promise.all([
              supabase
                .from('sala_ativos')
                .select('ativo_id, ativos(id, nome)')
                .eq('local_id', ativoData.local_id),
              supabase
                .from('execucoes_checklist')
                .select('ativo_id')
                .eq('status', 'concluida')
                .gte('finalizado_em', inicioHoje.toISOString())
            ])

            const salaAtivosData = (salaAtivosRes.data || [])
              .filter((sa: any) => sa.ativos)
              .map((sa: any) => sa.ativos)

            const inspecionadosHoje = new Set((execsHojeRes.data || []).map((e: any) => e.ativo_id))

            // 1º Prioridade: Próximo ativo da sala que AINDA NÃO foi inspecionado hoje (e diferente do atual)
            const pendentes = salaAtivosData.filter(
              (a: any) => a.id !== targetAssetId && !inspecionadosHoje.has(a.id)
            )

            if (pendentes.length > 0) {
              setProximoAtivo(pendentes[0])
            } else {
              // 2º Se todos os outros já foram inspecionados, pega o próximo pela sequência da lista
              const idxAtual = salaAtivosData.findIndex((a: any) => a.id !== targetAssetId)
              const outros = salaAtivosData.filter((a: any) => a.id !== targetAssetId)
              if (outros.length > 0 && idxAtual !== -1) {
                const proximoOrdem = salaAtivosData[(idxAtual + 1) % salaAtivosData.length]
                if (proximoOrdem && proximoOrdem.id !== targetAssetId) {
                  setProximoAtivo(proximoOrdem)
                } else {
                  setProximoAtivo(null)
                }
              } else {
                setProximoAtivo(null)
              }
            }
          } catch (errProximo) {
            console.error('Erro ao calcular próximo ativo da sala:', errProximo)
          }
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
  }, [assetId, execId, cacheKey])

  // Troca dinâmica de modelo (se o usuário alterar entre variantes)
  useEffect(() => {
    async function trocarItensModelo() {
      if (isReadOnly || !modeloSelecionado?.id) return
      // Se já temos itens para este modelo selecionado, não recarregar
      if (cached?.modeloSelecionado?.id === modeloSelecionado.id && cached?.itens?.length > 0) return

      try {
        const supabase = criarClienteSupabase()
        const { data: itemsData } = await supabase
          .from('itens_modelo_checklist')
          .select('*')
          .eq('modelo_id', modeloSelecionado.id)
          .order('ordem', { ascending: true })

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
    trocarItensModelo()
  }, [modeloSelecionado?.id, isReadOnly])

  const localIdRetorno = ativo?.local_id

  const totalRespondidos = Object.values(respostas).filter((r) => r.resposta !== null).length
  const progresso = itens.length > 0 ? Math.round((totalRespondidos / itens.length) * 100) : 0
  const todosRespondidos = itens.length > 0 && totalRespondidos === itens.length

  function setResposta(id: string, resposta: RespostaItem) {
    if (resposta === 'nao_conforme') {
      const item = itens.find(i => i.id === id)
      // Remove qualquer resposta anterior deste item para garantir exclusividade mútua imediata
      setRespostas((prev) => ({
        ...prev,
        [id]: { resposta: 'nao_conforme', evidencia_url: null, evidencia_texto: '' }
      }))
      setModalNcItem(item)
      setNcDescricao('')
      setNcCriticidade('critico')
      setNcSetor('engenharia_clinica')
      setNcFotoPreview(null)
      setNcFotoFile(null)

      // Rolar a tela suavemente para centralizar o formulário de NC inline aberto
      setTimeout(() => {
        const el = document.getElementById(`nc-form-${id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 150)
    } else {
      if (modalNcItem?.id === id) {
        setModalNcItem(null)
      }
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
        try {
          const supabase = criarClienteSupabase() as any
          const fileExt = ncFotoFile.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('evidencias')
            .upload(fileName, ncFotoFile)

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('evidencias')
              .getPublicUrl(fileName)
            uploadedUrl = publicUrlData.publicUrl
          } else {
            console.error('Erro de upload Supabase Storage:', uploadError)
          }
        } catch (e) {
          console.error('Erro no upload de foto:', e)
        }

        // Fallback de segurança: se o bucket do Supabase não retornar a URL pública, converte para Base64 Data URL
        if (!uploadedUrl) {
          uploadedUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(ncFotoFile)
          })
        }
      }

      setRespostas((prev) => ({
        ...prev,
        [modalNcItem.id]: {
          resposta: 'nao_conforme',
          evidencia_url: uploadedUrl || null,
          evidencia_texto: ncDescricao,
          criticidade: ncCriticidade,
          setor_responsavel: ncSetor
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
    if (modalNcItem) {
      setRespostas((prev) => {
        const atual = prev[modalNcItem.id]
        if (atual?.resposta === 'nao_conforme' && !atual?.evidencia_texto) {
          return { ...prev, [modalNcItem.id]: { resposta: null } }
        }
        return prev
      })
    }
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
        let setorResp: SetorTecnico = 'engenharia_clinica'

        if (resposta === 'nao_conforme') {
          evidenciaUrl = respInfo.evidencia_url || null
          evidenciaTexto = respInfo.evidencia_texto || null
          crit = respInfo.criticidade || item.criticidade
          setorResp = respInfo.setor_responsavel || 'engenharia_clinica'
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
        // Criar as NCs manualmente se a trigger falhar (em paralelo)
        await Promise.all(
          itensNaoConformes.map(async (item: any) => {
            try {
              const { data: triggerNc } = await supabase
                .from('nao_conformidades')
                .select('id')
                .eq('item_execucao_id', item.id)

              if (!triggerNc || triggerNc.length === 0) {
                console.log('Trigger de autocriação ausente no banco. Criando NC manualmente...')
                const setorFinal = item.setor_responsavel || 'engenharia_clinica'

                await supabase
                  .from('nao_conformidades')
                  .insert({
                    hospital_id: ativo.hospital_id,
                    item_execucao_id: item.id,
                    ativo_id: ativo.id,
                    criticidade: item.criticidade,
                    setor_responsavel: setorFinal,
                    tipo: 'equipamento',
                    status: 'aberta',
                    numero_unico: `NC-${new Date().getFullYear()}-${item.id.substring(0, 4).toUpperCase()}`
                  })
              }
            } catch (ncErr) {
              console.error('Erro ao sincronizar NC:', ncErr)
            }
          })
        )

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

        // Executar atualizações no banco em paralelo
        await Promise.all([
          supabase
            .from('ativos')
            .update({ status: novoStatusAtivo })
            .eq('id', ativo.id),
          supabase
            .from('locais')
            .update({ status: novoStatusLocal })
            .eq('id', ativo.local_id)
        ])

        // Limpar sessionStorage
        itens.forEach(item => {
          sessionStorage.removeItem(`primus_nc_${item.id}`)
        })

        // Enviar e-mails de notificação pelo Resend em paralelo (background)
        Promise.all(
          itensNaoConformes.map(async (item: any) => {
            const descricao = item.evidencia_texto || 'Não conformidade registrada no checklist.'
            const criticidade = item.criticidade || 'critico'
            const localNome = `${ativo.locais?.unidade || ''} - ${ativo.locais?.nome || ''}`

            try {
              await enviarEmailResend({
                nomeAtivo: ativo.nome,
                local: localNome,
                descricao: descricao,
                criticidade: criticidade,
                evidenciaUrl: item.evidencia_url || null,
                nomeInspetor: usuario?.nome || 'Inspetor',
                emailInspetor: usuario?.email || null
              })
            } catch (err) {
              console.error('Erro de envio de email:', err)
            }
          })
        )
      } else {
        // Se todas as respostas forem conformes, garantir que o ativo/local fiquem operacionais/prontos (em paralelo)
        await Promise.all([
          supabase
            .from('ativos')
            .update({ status: 'operacional' })
            .eq('id', ativo.id),
          supabase
            .from('locais')
            .update({ status: 'pronta' })
            .eq('id', ativo.local_id)
        ])
      }

      // Invalidar cache para atualizar salas, lista de ativos e histórico imediatamente
      dadosCache.invalidate('inspetor_')

      setSucesso(true)
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
    <div className="px-4 sm:px-5 pt-3 pb-10 space-y-4">
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
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 space-y-3.5">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">{ativo.nome?.replace(/\bSala\s+(\d+)/i, 'S. $1')}</h1>

          {/* Seletor de Modelo */}
          {isReadOnly ? (
            <div className="mt-2">
              <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold bg-[#246BFD]/8 border border-[#246BFD]/15 text-[#246BFD]">
                Visualizando: {modeloSelecionado?.nome_variante || 'Checklist'}
              </span>
            </div>
          ) : (
            <div className="mt-2">
              <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100/80 border border-slate-200/60 text-slate-600">
                Modalidade: {modeloSelecionado?.nome_variante || 'Padrão'}
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-500">Progresso</span>
            <span className="text-gray-900 tabular-nums">{totalRespondidos} / {itens.length}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#246BFD] rounded-full transition-all duration-500 ease-out" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </div>

      {/* Lista de Seções — cards individuais */}
      <div className="space-y-2.5">
        {itens.map((secao) => {
          const resp = respostas[secao.id] || { resposta: null }
          const aberta = expandida === secao.id
          const isOpeningNc = modalNcItem?.id === secao.id
          const hasResp = resp.resposta !== null || isOpeningNc
          const isConf = resp.resposta === 'conforme' && !isOpeningNc
          const isNc = isOpeningNc || (resp.resposta === 'nao_conforme' && !isOpeningNc)
          const isNsa = resp.resposta === 'nao_se_aplica' && !isOpeningNc

          // Ícone de status baseado na resposta
          const StatusIcon = () => {
            if (isConf) {
              return (
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#54D362] to-[#31B44A] shadow-[0_2px_6px_rgba(49,180,74,0.3)] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )
            }
            if (isNc) {
              return (
                <div className="w-6 h-6 rounded-full bg-gradient-to-b from-[#F45F63] to-[#EA3A3A] shadow-[0_2px_6px_rgba(234,58,58,0.3)] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )
            }
            if (isNsa) {
              return (
                <div className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                </div>
              )
            }
            // Pendente — bullet discreto (sem parecer botão/checkbox clicável)
            return (
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
              </div>
            )
          }

          return (
            <div
              key={secao.id}
              id={`secao-${secao.id}`}
              className={[
                'bg-white rounded-xl sm:rounded-[20px] overflow-hidden transition-all duration-200',
                aberta
                  ? 'shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-gray-200/80'
                  : 'shadow-[0_1px_4px_rgba(0,0,0,0.03)] border border-gray-100/80',
              ].join(' ')}
            >
              {/* Header da seção */}
              <button
                type="button"
                onClick={() => setExpandida(aberta ? null : secao.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left cursor-pointer hover:bg-gray-50/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <StatusIcon />
                  <span className="text-sm font-semibold text-gray-900">{secao.nome}</span>
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
                <div className="px-4 pb-4 space-y-3.5 animate-[fadeIn_0.15s_ease-out]">
                  {/* Separador sutil */}
                  <div className="h-px bg-gray-100" />

                  {/* Materiais em card inset */}
                  {secao.materiaisReferencia.length > 0 && (
                    <div className="bg-[#F4F6FA] rounded-xl p-3 space-y-1.5">
                      <p className="text-[9px] font-bold text-gray-400 tracking-[0.08em] uppercase">
                        Verifique os materiais
                      </p>
                      <div className="space-y-1">
                        {secao.materiaisReferencia.map((mat: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-gray-300 mt-[7px] shrink-0" />
                            <span className="text-sm text-gray-600 leading-snug">{mat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações — botões estilo Apple */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Conforme */}
                    <button
                      type="button"
                      onClick={() => !isReadOnly && setResposta(secao.id, 'conforme')}
                      className={[
                        'relative py-3 rounded-2xl text-[11px] font-extrabold tracking-tight transition-all duration-200 border',
                        'flex flex-col items-center justify-center gap-1.5',
                        isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-95',
                        isConf
                          ? 'bg-gradient-to-b from-[#54D362] to-[#31B44A] border-[#31B44A] text-white shadow-[0_4px_12px_rgba(49,180,74,0.35)] scale-[1.03] z-10'
                          : hasResp
                            ? 'bg-slate-50/50 border-slate-100 text-slate-500 opacity-45 scale-[0.97]'
                            : 'bg-white border-[#31B44A]/35 text-[#31B44A] hover:bg-[#31B44A]/5',
                      ].join(' ')}
                    >
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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
                        'flex flex-col items-center justify-center gap-1.5',
                        isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-95',
                        isNc
                          ? 'bg-gradient-to-b from-[#F45F63] to-[#EA3A3A] border-[#EA3A3A] text-white shadow-[0_4px_12px_rgba(234,58,58,0.35)] scale-[1.03] z-10'
                          : hasResp
                            ? 'bg-slate-50/50 border-slate-100 text-slate-500 opacity-45 scale-[0.97]'
                            : 'bg-white border-[#EA3A3A]/35 text-[#EA3A3A] hover:bg-[#EA3A3A]/5',
                      ].join(' ')}
                    >
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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
                        'flex flex-col items-center justify-center gap-1.5 text-center',
                        isReadOnly ? 'cursor-default' : 'cursor-pointer active:scale-95',
                        isNsa
                          ? 'bg-[#8E8E93] border-[#8E8E93] text-white shadow-[0_4px_12px_rgba(142,142,147,0.25)] scale-[1.03] z-10'
                          : hasResp
                            ? 'bg-slate-50/50 border-slate-100 text-slate-500 opacity-45 scale-[0.97]'
                            : 'bg-white border-[#8E8E93]/30 text-[#8E8E93] hover:bg-[#8E8E93]/5',
                      ].join(' ')}
                    >
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                      <span>Não se aplica</span>
                    </button>
                  </div>

                  {/* Formulário Inline de Registro de Não Conformidade (Design Apple / Linear) */}
                  {!isReadOnly && modalNcItem?.id === secao.id && (
                    <div
                      id={`nc-form-${secao.id}`}
                      className="bg-[#FAFBFD] border border-slate-200/90 rounded-[22px] p-4 sm:p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] animate-[fadeIn_0.2s_ease-out] mt-3"
                    >
                      {/* Header do Form — Título em linha única e maior */}
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#EA3A3A] animate-pulse shrink-0" />
                        <h4 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight whitespace-nowrap">
                          Registro de Não Conformidade
                        </h4>
                      </div>

                      {/* Setor Responsável — Categorizados por cor suave */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Setor Responsável
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {TODOS_SETORES.map((s) => {
                            const sel = ncSetor === s
                            const corAtiva = SETORES_CORES_ATIVAS[s] || 'bg-slate-200 text-slate-800 border-slate-300'
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setNcSetor(s)}
                                className={[
                                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer select-none',
                                  sel
                                    ? corAtiva
                                    : 'bg-white border-slate-200/90 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                ].join(' ')}
                              >
                                <span className="text-xs">{SETORES_ICONES[s]}</span>
                                <span>{SETORES_LABELS[s]}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Descrição — Campo ampliado e placeholder limpo */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          O que está inconforme?
                        </label>
                        <textarea
                          rows={3.5}
                          required
                          placeholder="Descreva o motivo da não conformidade..."
                          value={ncDescricao}
                          onChange={(e) => setNcDescricao(e.target.value)}
                          className="w-full min-h-[85px] bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#EA3A3A] focus:ring-2 focus:ring-[#EA3A3A]/10 transition-all resize-none shadow-2xs font-medium leading-relaxed"
                        />
                      </div>

                      {/* Evidência Fotográfica */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
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
                          id={`foto-input-${secao.id}`}
                        />

                        {ncFotoPreview ? (
                          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs group">
                            <img
                              src={ncFotoPreview}
                              alt="Preview da evidência"
                              className="w-full h-32 object-cover cursor-zoom-in"
                              onClick={() => setFotoZoom(ncFotoPreview)}
                            />
                            <div
                              onClick={() => setFotoZoom(ncFotoPreview)}
                              className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in"
                            >
                              <span className="bg-white/95 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 pointer-events-none">
                                <svg className="w-3.5 h-3.5 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                </svg>
                                Toque para ampliar
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setNcFotoPreview(null)
                                setNcFotoFile(null)
                              }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center text-xs font-bold hover:bg-black/85 cursor-pointer shadow-md transition-all z-10 active:scale-95"
                              title="Remover foto"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => document.getElementById(`foto-input-${secao.id}`)?.click()}
                            className="w-full h-16 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50/80 hover:border-[#EA3A3A]/50 flex items-center justify-center gap-2.5 text-slate-500 hover:text-[#EA3A3A] transition-all cursor-pointer shadow-2xs group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-red-50 flex items-center justify-center text-slate-600 group-hover:text-[#EA3A3A] transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" />
                              </svg>
                            </div>
                            <span className="text-xs font-bold tracking-tight">Tirar foto ou anexar evidência</span>
                          </button>
                        )}
                      </div>

                      {/* Criticidade */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Criticidade do Chamado
                        </label>
                        <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60">
                          {[
                            { valor: 'critico', label: 'Crítico', cor: 'bg-[#EA3A3A] text-white shadow-xs' },
                            { valor: 'importante', label: 'Importante', cor: 'bg-[#F78725] text-white shadow-xs' },
                            { valor: 'informativo', label: 'Informativo', cor: 'bg-[#007AFF] text-white shadow-xs' }
                          ].map((c) => {
                            const sel = ncCriticidade === c.valor
                            return (
                              <button
                                key={c.valor}
                                type="button"
                                onClick={() => setNcCriticidade(c.valor as any)}
                                className={[
                                  'flex-1 py-2 px-1 text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center',
                                  sel ? `${c.cor} font-black scale-[1.01]` : 'text-slate-500 hover:text-slate-800'
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
                          tamanho="sm"
                        >
                          Cancelar
                        </Botao>
                        <LiquidMetalButton
                          type="button"
                          larguraTotal
                          onClick={handleSalvarModalNc}
                          carregando={ncEnviando}
                          disabled={!ncDescricao.trim()}
                          tamanho="sm"
                          label="Confirmar NC"
                        />
                      </div>
                    </div>
                  )}

                  {/* Evidências e Descrição da NC (mostrado quando resposta é nao_conforme e possui descrição/foto) */}
                  {resp.resposta === 'nao_conforme' && (resp.evidencia_texto || resp.evidencia_url) && (
                    <div className="bg-red-50/50 rounded-xl p-3.5 space-y-2.5 mt-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                      {resp.evidencia_texto && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-900 tracking-[0.08em] uppercase">
                            Descrição da NC
                          </p>
                          <p className="text-sm text-red-500 font-medium leading-relaxed mt-0.5">
                            {resp.evidencia_texto}
                          </p>
                        </div>
                      )}
                      {resp.evidencia_url && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-900 tracking-[0.08em] uppercase mb-1.5">
                            Evidência Fotográfica
                          </p>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              const autor = executorInspecao || { nome: usuario?.nome || 'Inspetor', perfil: usuario?.perfil || 'inspetor' }
                              setFotoZoom({ url: resp.evidencia_url, autorNome: autor.nome, autorPerfil: formatarPerfil(autor.perfil) })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                const autor = executorInspecao || { nome: usuario?.nome || 'Inspetor', perfil: usuario?.perfil || 'inspetor' }
                                setFotoZoom({ url: resp.evidencia_url, autorNome: autor.nome, autorPerfil: formatarPerfil(autor.perfil) })
                              }
                            }}
                            className="relative group cursor-zoom-in overflow-hidden rounded-xl border border-gray-200/60 bg-black/5 active:scale-[0.98] transition-all max-w-xs shadow-2xs"
                          >
                            <img
                              src={resp.evidencia_url}
                              alt="Evidência fotográfica da não conformidade"
                              className="rounded-xl max-h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="bg-white/95 backdrop-blur-md text-gray-900 font-bold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 scale-95 group-hover:scale-100 transition-transform">
                                <svg className="w-3.5 h-3.5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                                </svg>
                                Ampliar foto
                              </span>
                            </div>
                            {/* Always visible indicator for mobile/touch */}
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg shadow-sm group-hover:opacity-0 transition-opacity flex items-center gap-1 text-[10px] font-medium">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                              </svg>
                              Ampliar
                            </div>
                          </div>

                          {/* Autor discreto embaixo da imagem */}
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-1.5 px-0.5">
                            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                            </svg>
                            <span className="truncate">
                              Foto registrada por <strong className="text-gray-700 font-semibold">{executorInspecao?.nome || usuario?.nome || 'Inspetor'}</strong> · <span className="text-gray-500">{formatarPerfil(executorInspecao?.perfil || usuario?.perfil)}</span>
                            </span>
                          </div>
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
        <div className="pt-2 pb-6">
          <LiquidMetalButton
            tamanho="md"
            larguraTotal
            onClick={() => router.push('/inspetor/inspecoes')}
            icone={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            }
            label="Voltar ao Histórico"
          />
        </div>
      ) : (
        <div className="pt-2 pb-6">
          <LiquidMetalButton
            tamanho="md"
            larguraTotal
            carregando={enviando}
            disabled={!todosRespondidos}
            onClick={handleConcluir}
            icone={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label={todosRespondidos ? 'Concluir inspeção' : `Responda todas (${totalRespondidos}/${itens.length})`}
          />
        </div>
      )}

      {/* Alerta de Sucesso Apple-style */}
      {sucesso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white/95 backdrop-blur-xl rounded-[28px] p-6 max-w-sm w-full shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-white/40 flex flex-col items-center text-center space-y-4 animate-[scaleIn_0.25s_ease-out]">
            
            {/* Animated Success Checkmark Ring */}
            <div className="w-16 h-16 rounded-full bg-[#31B44A]/10 flex items-center justify-center text-[#31B44A] shadow-inner border border-[#31B44A]/20 relative overflow-hidden group">
              <svg className="w-8 h-8 animate-[scaleIn_0.3s_ease-out]" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            {/* Typography */}
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {primeiroNome ? `Inspeção Concluída, ${primeiroNome}!` : 'Inspeção Concluída!'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                {proximoAtivo
                  ? `Ronda salva com sucesso. Deseja continuar para o próximo equipamento da sala?`
                  : `Ronda finalizada com sucesso! Todos os equipamentos desta sala foram verificados.`}
              </p>
            </div>

            {/* Ações (Próximo Ativo + Voltar para a Sala) */}
            <div className="w-full pt-2 flex flex-col gap-2.5">
              {proximoAtivo && (
                <LiquidMetalButton
                  tamanho="md"
                  larguraTotal
                  onClick={() => {
                    dadosCache.invalidate('inspetor_')
                    setSucesso(false)
                    setAtivo(null)
                    setModeloSelecionado(null)
                    setItens([])
                    setRespostas({})
                    setCarregando(true)
                    router.push(`/inspetor/checklist/${proximoAtivo.id}`)
                  }}
                  label={`Próxima ronda: ${proximoAtivo.nome.split(' - ')[0].replace('Carrinho de ', 'Car. ')}`}
                />
              )}

              <Botao
                variante={proximoAtivo ? 'secundario' : 'primario'}
                tamanho="md"
                larguraTotal
                onClick={() => {
                  dadosCache.invalidate('inspetor_')
                  router.push(`/inspetor/local/${localIdRetorno}`)
                }}
              >
                Voltar para a Sala
              </Botao>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL ZOOM FOTO (Apple Lightbox Style) ── */}
      {fotoZoom && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] select-none"
          onClick={() => setFotoZoom(null)}
        >
          {/* Header Controls */}
          <div 
            className="w-full max-w-md sm:max-w-lg flex items-center justify-between py-2 text-white mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">
                Evidência Fotográfica
              </span>
            </div>
            <button
              type="button"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 text-white flex items-center justify-center backdrop-blur-xl transition-all shadow-md cursor-pointer border border-white/20"
              onClick={() => setFotoZoom(null)}
              aria-label="Fechar visualização"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Foto Expandida */}
          <div 
            className="relative max-w-md sm:max-w-lg w-full flex items-center justify-center overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/15 bg-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={typeof fotoZoom === 'string' ? fotoZoom : fotoZoom.url}
              alt="Evidência ampliada"
              className="w-full max-h-[75vh] object-contain select-none"
            />
          </div>

          {/* Legenda/Autor discreto */}
          <div className="flex flex-col items-center gap-1.5 mt-3 text-center">
            {typeof fotoZoom !== 'string' && fotoZoom.autorNome && (
              <div className="flex items-center gap-1.5 text-xs text-white/90 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 shadow-sm">
                <svg className="w-3.5 h-3.5 text-white/70 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                <span>
                  Foto por <strong className="text-white font-semibold">{fotoZoom.autorNome}</strong> · <span className="text-white/80">{fotoZoom.autorPerfil}</span>
                </span>
              </div>
            )}
            <p className="text-[10.5px] font-medium text-white/50 tracking-wide">
              Toque em qualquer lugar fora da foto para fechar
            </p>
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
  nomeInspetor?: string
  emailInspetor?: string | null
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

export default function PaginaChecklist() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-[#F4F6FA] text-sm text-gray-400 animate-pulse">Carregando checklist...</div>}>
      <ComponenteChecklist />
    </Suspense>
  )
}
