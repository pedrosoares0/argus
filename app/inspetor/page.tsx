'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { PillTag } from '@/components/ui/PillTag'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { dadosCache } from '@/lib/cache/dadosCache'

/**
 * Tela inicial do Inspetor — idêntica à 2ª imagem de referência.
 * Design refinado, sem ícone blob, bg #F4F6FA, badges pastéis e lista completa com responsável/horário.
 */
export default function PaginaInicialInspetor() {
  const router = useRouter()
  const [termoBusca, setTermoBusca] = useState('')
  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')

  const cacheKey = 'inspetor_ativos_lista'
  const [ativos, setAtivos] = useState<any[]>(() => dadosCache.get<any[]>(cacheKey) || [])
  const [carregando, setCarregando] = useState(() => !dadosCache.get(cacheKey))

  useEffect(() => {
    router.prefetch('/inspetor/scanner')
  }, [router])

  useEffect(() => {
    async function carregarAtivos() {
      if (!dadosCache.get(cacheKey)) {
        setCarregando(true)
      }
      try {
        const supabase = criarClienteSupabase() as any

        // Helper para formatar nome
        const formatarNome = (u: any): string => {
          if (!u) return 'Inspetor'
          const nomeCandidato = u.nome || u.full_name || u.name
          if (nomeCandidato && typeof nomeCandidato === 'string' && nomeCandidato.trim() && nomeCandidato.trim() !== 'Inspetor') {
            return nomeCandidato.trim()
          }
          if (u.email && typeof u.email === 'string') {
            const parte = u.email.split('@')[0]
            const partes = parte.split(/[\._\-]/).filter(Boolean)
            if (partes.length > 0) {
              return partes.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
            }
            return parte
          }
          return 'Inspetor'
        }

        // Buscar ativos, execuções e usuários em PARALELO com Promise.all
        const [ativosRes, execsRes, usuariosRes] = await Promise.all([
          supabase
            .from('ativos')
            .select('*, locais(*), categorias_ativos(*)'),
          supabase
            .from('execucoes_checklist')
            .select('id, ativo_id, usuario_id, status, iniciado_em, finalizado_em')
            .eq('status', 'concluida')
            .order('finalizado_em', { ascending: false }),
          supabase
            .from('usuarios')
            .select('id, nome, email'),
        ])

        const data = ativosRes.data
        const execsData = execsRes.data || []
        const usersData = usuariosRes.data || []

        if (data && data.length > 0) {
          const usuariosMapa = new Map()
          usersData.forEach((u: any) => usuariosMapa.set(u.id, formatarNome(u)))

          const execsIds = execsData.map((e: any) => e.id)
          let itemsData: any[] = []

          if (execsIds.length > 0) {
            const { data: itensRes } = await supabase
              .from('itens_execucao_checklist')
              .select('execucao_id, resposta, criticidade')
              .in('execucao_id', execsIds.slice(0, 100))

            if (itensRes) itemsData = itensRes
          }

          const execsNcMapa = new Map()
          itemsData.forEach((it: any) => {
            if (it.resposta === 'nao_conforme') {
              const currentHighest = execsNcMapa.get(it.execucao_id)
              if (
                !currentHighest ||
                it.criticidade === 'critico' ||
                (it.criticidade === 'importante' && currentHighest !== 'critico')
              ) {
                execsNcMapa.set(it.execucao_id, it.criticidade)
              }
            }
          })

          const formatados = data.map((ativo: any) => {
            const execsDoAtivo = execsData.filter((e: any) => e.ativo_id === ativo.id)
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
              corTag: (ativo.categorias_ativos?.nome?.toLowerCase().includes('carrinho') ? 'azul' : 'roxo') as 'azul' | 'roxo',
              nome: ativo.nome,
              localizacao: ativo.locais?.nome || 'Sem localização',
              ultimaInspecao: textoInspecao,
              statusUltima,
            }
          })

          setAtivos(formatados)
          dadosCache.set(cacheKey, formatados)
        } else {
          setAtivos([])
        }
      } catch (err) {
        console.error('Erro ao carregar ativos do inspetor:', err)
      } finally {
        setCarregando(false)
      }
    }
    carregarAtivos()
  }, [cacheKey])

  const ativosFiltrados = ativos.filter(item => 
    item.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
    item.localizacao.toLowerCase().includes(termoBusca.toLowerCase())
  )

  async function handleSubmeterCodigo(e: React.FormEvent) {
    e.preventDefault()
    const input = codigoInput.trim()
    if (!input) return

    try {
      const supabase = criarClienteSupabase() as any
      
      // 1. Tentar buscar local pelo código QR ou nome
      const { data: locais } = await supabase
        .from('locais')
        .select('id')
        .or(`codigo_qr.ilike.${input},nome.ilike.%${input}%`)
        .limit(1)

      if (locais && locais.length > 0) {
        setMostrarModalCodigo(false)
        router.push(`/inspetor/local/${locais[0].id}`)
        return
      }

      // 2. Tentar buscar ativo por codigo_qr, patrimonio ou nome
      const { data: ativos } = await supabase
        .from('ativos')
        .select('id, local_id')
        .or(`codigo_qr.ilike.${input},patrimonio.ilike.${input},nome.ilike.%${input}%`)
        .limit(1)

      if (ativos && ativos.length > 0) {
        setMostrarModalCodigo(false)
        router.push(`/inspetor/local/${ativos[0].local_id}`)
        return
      }

      alert(`Nenhum ativo ou sala encontrado com o código "${input}".`)
    } catch (err) {
      console.error(err)
      alert('Erro ao buscar o código.')
    }
  }

  return (
    <div className="px-4 sm:px-5 pt-2 space-y-4 sm:space-y-5">

      {/* Card Principal: Leitura do Carrinho / Scan Rápido (Glassmorphism limpo) */}
      <div 
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '280px',
          borderRadius: '41px',
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1), inset 1.5px 1.5px 0 rgba(255, 255, 255, 0.25), inset 0 0 8px rgba(255, 255, 255, 0.1), 0 8px 24px rgba(0, 0, 0, 0.05)'
        }}
        className="mx-auto flex flex-col justify-center items-center p-6 text-center space-y-4 select-none"
      >
        {/* Ícone de Câmera 3D macOS com cantos arredondados */}
        <div className="w-12 h-12 rounded-[12px] overflow-hidden drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)] active:scale-95 transition-transform shrink-0">
          <img 
            src="/icon-camera-macos.png" 
            alt="Câmera Scanner" 
            className="w-full h-full object-cover" 
          />
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-tight">
            Conferência Rápida
          </h2>
          <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-relaxed mt-1 max-w-xs mx-auto">
            Aponte a câmera para a etiqueta do equipamento para abrir a verificação de prontidão.
          </p>
        </div>

        {/* Botão de Câmera e Digitar código */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <LiquidMetalButton
            tamanho="md"
            onClick={() => router.push('/inspetor/scanner')}
            icone={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              </svg>
            }
            label="Escanear"
          />

          <button
            type="button"
            onClick={() => setMostrarModalCodigo(true)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors py-0.5 px-2 cursor-pointer"
          >
            Digitar código manualmente
          </button>
        </div>
      </div>

      {/* Input de Busca */}
      <BarraBusca
        placeholder="Buscar por ativos do hospital"
        valor={termoBusca}
        aoMudar={setTermoBusca}
      />

      {/* Lista de Carrinhos (Visual exato da 2ª imagem) */}
      <div className="space-y-2.5 pb-4">
        {carregando && ativos.length === 0 ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-[28px] p-3.5 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100/90 animate-pulse">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-[18px] bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/5 bg-gray-200 rounded" />
                    <div className="h-3 w-2/5 bg-gray-100 rounded" />
                    <div className="h-3 w-4/5 bg-gray-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : ativosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400 font-semibold">
            Nenhum ativo encontrado.
          </div>
        ) : (
          ativosFiltrados.map((item, i) => {
            const isAnestesia = item.tag?.toLowerCase().includes('anestesia') || item.nome?.toLowerCase().includes('anestesia')
            const isCarrinho = item.tag?.toLowerCase().includes('carrinho') || item.nome?.toLowerCase().includes('carrinho')
            const iconeAtivo = isAnestesia ? '/icon-anestesia.webp' : '/icon-carrinho.webp'
            return (
              <Link
                key={item.id}
                href={`/inspetor/local/${item.localId}`}
                prefetch={true}
                className="block bg-white rounded-[28px] p-3.5 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-gray-100/90 hover:border-gray-200 transition-all cursor-pointer select-none active:scale-[0.99]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between gap-3 w-full">
                  {/* Info Esquerda */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {isCarrinho && (
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-[18px] overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-gray-100/30">
                        <img 
                          src={iconeAtivo} 
                          alt={item.nome || 'Carrinho'} 
                          className="w-full h-full object-cover" 
                        />
                        {/* Sombra interna branca (innershadow branco) */}
                        <div className="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_2.5px_8px_rgba(255,255,255,0.95)] border border-white/25" />
                      </div>
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
              </Link>
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
