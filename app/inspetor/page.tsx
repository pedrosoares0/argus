'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { PillTag } from '@/components/ui/PillTag'
import { criarClienteSupabase } from '@/lib/supabase/client'

/**
 * Tela inicial do Inspetor — idêntica à 2ª imagem de referência.
 * Design refinado, sem ícone blob, bg #F4F6FA, badges pastéis e lista completa com responsável/horário.
 */
export default function PaginaInicialInspetor() {
  const router = useRouter()
  const [termoBusca, setTermoBusca] = useState('')
  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')

  // Dados fieis à imagem de referência 2
  const [ativos, setAtivos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarAtivos() {
      try {
        const supabase = criarClienteSupabase() as any
        const { data, error } = await supabase
          .from('ativos')
          .select('*, locais(*), categorias_ativos(*)')
        
        if (error) {
          console.error(error)
          return
        }

        if (data) {
          if (data.length > 0) {
            const ativosIds = data.map((a: any) => a.id)
            
            // Buscar execuções concluídas para esses ativos
            const { data: execsData } = await supabase
              .from('execucoes_checklist')
              .select('*')
              .in('ativo_id', ativosIds)
              .eq('status', 'concluida')
              .order('finalizado_em', { ascending: false })

            const usuariosMapa = new Map()
            const execsNcMapa = new Map()

            if (execsData && execsData.length > 0) {
              const userIds = Array.from(new Set(execsData.map((e: any) => e.usuario_id)))
              const { data: usersData } = await supabase
                .from('usuarios')
                .select('id, nome')
                .in('id', userIds)

              if (usersData) {
                usersData.forEach((u: any) => usuariosMapa.set(u.id, u.nome))
              }

              const execsIds = execsData.map((e: any) => e.id)
              const { data: itemsData } = await supabase
                .from('itens_execucao_checklist')
                .select('execucao_id, resposta, criticidade')
                .in('execucao_id', execsIds)

              if (itemsData) {
                itemsData.forEach((it: any) => {
                  if (it.resposta === 'nao_conforme') {
                    const currentHighest = execsNcMapa.get(it.execucao_id)
                    if (!currentHighest || 
                        (it.criticidade === 'critico') || 
                        (it.criticidade === 'importante' && currentHighest !== 'critico')) {
                      execsNcMapa.set(it.execucao_id, it.criticidade)
                    }
                  }
                })
              }
            }

            const formatados = data.map((ativo: any) => {
              const execsDoAtivo = execsData?.filter((e: any) => e.ativo_id === ativo.id) || []
              const ultimaExec = execsDoAtivo[0]
              
              let textoInspecao = 'Sem inspeções registradas'
              let statusUltima = 'sem_inspecao'

              if (ultimaExec) {
                const dataInspecao = new Date(ultimaExec.finalizado_em || ultimaExec.iniciado_em)
                const diaMes = dataInspecao.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                const horaMin = dataInspecao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                const nomeInspetor = usuariosMapa.get(ultimaExec.usuario_id) || 'Inspetor'
                textoInspecao = `${nomeInspetor} em ${diaMes} às ${horaMin}`
                statusUltima = execsNcMapa.get(ultimaExec.id) || 'conforme'
              }

              return {
                id: ativo.id,
                localId: ativo.local_id,
                tag: ativo.categorias_ativos?.nome || 'Ativo',
                corTag: (ativo.categorias_ativos?.nome === 'Carrinho de parada' ? 'azul' : 'roxo') as 'azul' | 'roxo',
                nome: ativo.nome,
                localizacao: ativo.locais?.nome || 'Sem localização',
                ultimaInspecao: textoInspecao,
                statusUltima
              }
            })
            setAtivos(formatados)
          } else {
            setAtivos([])
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregarAtivos()
  }, [])

  const ativosFiltrados = ativos.filter(item => 
    item.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    item.localizacao.toLowerCase().includes(termoBusca.toLowerCase())
  )

  async function handleSubmeterCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!codigoInput.trim()) return

    try {
      const supabase = criarClienteSupabase() as any
      
      // Buscar local pelo QR
      const { data: local } = await supabase
        .from('locais')
        .select('id')
        .eq('codigo_qr', codigoInput.trim())
        .single()

      if (local) {
        setMostrarModalCodigo(false)
        router.push(`/inspetor/local/${local.id}`)
        return
      }

      // Buscar ativo pelo QR
      const { data: ativo } = await supabase
        .from('ativos')
        .select('id, local_id')
        .eq('codigo_qr', codigoInput.trim())
        .single()

      if (ativo) {
        setMostrarModalCodigo(false)
        router.push(`/inspetor/local/${ativo.local_id}`)
        return
      }

      alert('Código QR não encontrado.')
    } catch (err) {
      console.error(err)
      alert('Erro ao buscar o código.')
    }
  }

  return (
    <div className="px-4 sm:px-5 pt-2 space-y-4 sm:space-y-5">

      {/* Card Principal: Leitura do Carrinho / Scan Rápido */}
      <div className="bg-white rounded-2xl sm:rounded-[24px] p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 text-center space-y-3.5">
        {/* Ícone de Câmera 3D macOS */}
        <div className="mx-auto w-12 h-12 flex items-center justify-center">
          <img 
            src="/icon-camera-macos.png" 
            alt="Câmera Scanner" 
            className="w-12 h-12 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] active:scale-95 transition-transform" 
          />
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
            Conferência Rápida
          </h2>
          <p className="text-xs sm:text-[13px] text-gray-500 font-medium leading-relaxed mt-0.5 max-w-xs mx-auto">
            Aponte a câmera para a etiqueta do equipamento para abrir a verificação de prontidão.
          </p>
        </div>

        {/* Botão de Câmera */}
        <div className="pt-0.5 flex flex-col items-center gap-2.5">
          <Botao
            variante="primario"
            tamanho="md"
            onClick={() => router.push('/inspetor/scanner')}
            icone={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              </svg>
            }
          >
            Escanear etiqueta
          </Botao>

          {/* Botão Digitar Código */}
          <button
            type="button"
            onClick={() => setMostrarModalCodigo(true)}
            className="text-[11px] font-bold text-gray-500 hover:text-gray-900 transition-colors py-0.5 px-2 cursor-pointer"
          >
            Digitar código manualmente
          </button>
        </div>
      </div>

      {/* Divisora de Seção */}
      <div className="flex items-center gap-2.5 py-0.5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
          OU SELECIONE MANUALMENTE
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Input de Busca */}
      <BarraBusca
        placeholder="Buscar por carrinho ou setor..."
        valor={termoBusca}
        aoMudar={setTermoBusca}
      />

      {/* Lista de Carrinhos (Visual exato da 2ª imagem) */}
      <div className="space-y-2.5 pb-4">
        {carregando ? (
          <div className="text-center py-8 text-sm text-gray-400 font-semibold animate-pulse">
            Carregando ativos do hospital...
          </div>
        ) : ativosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400 font-semibold">
            Nenhum ativo encontrado.
          </div>
        ) : (
          ativosFiltrados.map((item, i) => {
            const isCarrinho = item.tag?.toLowerCase() === 'carrinho de parada' || item.nome?.toLowerCase().includes('carrinho')
            return (
              <div
                key={item.id}
                onClick={() => router.push(`/inspetor/local/${item.localId}`)}
                className="bg-white rounded-[20px] p-3.5 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100/90 hover:border-gray-200 transition-all cursor-pointer select-none active:scale-[0.99]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  {/* Info Esquerda */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {isCarrinho && (
                      <img 
                        src="/icon-carrinho.webp" 
                        alt="Carrinho de Parada" 
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0" 
                      />
                    )}
                    <div className="min-w-0 space-y-0.5">
                      {!isCarrinho && (
                        <div className="pb-1">
                          <PillTag cor={item.corTag}>
                            {item.tag}
                          </PillTag>
                        </div>
                      )}
                      <h3 className="text-sm sm:text-base font-bold text-[#1E293B] tracking-tight break-words">
                        {item.nome}
                      </h3>
                      
                      <div className="space-y-0.5 pt-0.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">
                          Última inspeção:
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.statusUltima !== 'sem_inspecao' && (
                            <span className={[
                              'w-2 h-2 rounded-full shrink-0',
                              item.statusUltima === 'critico' ? 'bg-red-500' :
                              item.statusUltima === 'importante' ? 'bg-amber-500' :
                              item.statusUltima === 'informativo' ? 'bg-blue-500' : 'bg-emerald-500'
                            ].join(' ')} />
                          )}
                          <span className="text-xs sm:text-[13px] font-medium text-slate-600 leading-none">
                            {item.ultimaInspecao}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botão Círculo com Seta (Direita) */}
                  <div className="w-8 h-8 rounded-full bg-[#F4F6FA] flex items-center justify-center text-gray-400 hover:text-texto transition-colors shrink-0">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Mock de Digitar Código */}
      {mostrarModalCodigo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[24px] p-6 max-w-sm w-full shadow-xl border border-gray-100 space-y-4">
            <h3 className="text-base font-bold text-texto">Digitar Código do QR</h3>
            <p className="text-xs text-gray-500">
              Insira o código gravado no QR Code do equipamento ou sala.
            </p>

            <form onSubmit={handleSubmeterCodigo} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Ex: QR-UTI-001"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                className="w-full bg-[#F4F6FA] border border-gray-200 rounded-full px-4 py-3 text-[16px] text-texto font-mono uppercase tracking-wider outline-none focus:border-[#246BFD]"
              />
              <div className="flex gap-2 pt-2">
                <Botao
                  type="button"
                  variante="secundario"
                  larguraTotal
                  onClick={() => setMostrarModalCodigo(false)}
                >
                  Cancelar
                </Botao>
                <Botao
                  type="submit"
                  variante="primario"
                  larguraTotal
                >
                  Acessar
                </Botao>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
