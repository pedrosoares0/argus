'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { PillTag } from '@/components/ui/PillTag'
import { QRCodeAtivo } from '@/components/ui/QRCodeAtivo'
import { criarClienteSupabase } from '@/lib/supabase/client'
import type { StatusAtivo } from '@/lib/supabase/types'

const STATUS_ATIVO_MAPA: Record<StatusAtivo, { label: string; dot: string; cor: 'verde' | 'laranja' | 'vermelho' | 'azul' }> = {
  operacional: { label: 'Operacional', dot: 'bg-emerald-500', cor: 'verde' },
  operacional_com_restricoes: { label: 'Com restrições', dot: 'bg-amber-500', cor: 'laranja' },
  indisponivel: { label: 'Indisponível', dot: 'bg-red-500', cor: 'vermelho' },
  em_manutencao: { label: 'Em manutenção', dot: 'bg-sky-500', cor: 'azul' },
}

export default function GestaoAtivosCoordenador() {
  const [ativos, setAtivos] = useState<any[]>([])
  const [termoBusca, setTermoBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarAtivos() {
      try {
        const supabase = criarClienteSupabase() as any
        
        // 1. Obter usuário autenticado
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        let hospitalId = 'e632822a-0000-0000-0000-000000000001' // ID Padrão do seed.sql como fallback

        if (user) {
          // 2. Buscar perfil do usuário para obter o hospital_id real
          const { data: perfilData, error: perfilError } = await supabase
            .from('usuarios')
            .select('hospital_id')
            .eq('id', user.id)
            .single()

          if (!perfilError && perfilData?.hospital_id) {
            hospitalId = perfilData.hospital_id
          }
        }

        // 3. Buscar todos os ativos com relacionamentos
        const { data: ativosData, error: ativosError } = await supabase
          .from('ativos')
          .select('*, locais(*), categorias_ativos(*)')
          .eq('hospital_id', hospitalId)
          .order('nome', { ascending: true })

        if (ativosError) {
          console.error(ativosError)
          setErro(`Erro ao carregar ativos: ${ativosError.message}`)
          return
        }

        if (ativosData) {
          setAtivos(ativosData)
        }
      } catch (err: any) {
        console.error(err)
        setErro(`Erro de conexão: ${err.message || err}`)
      } finally {
        setCarregando(false)
      }
    }

    carregarAtivos()
  }, [])

  // Filtragem local baseada na busca digitada
  const ativosFiltrados = ativos.filter((ativo) => {
    const termo = termoBusca.toLowerCase()
    return (
      ativo.nome.toLowerCase().includes(termo) ||
      (ativo.patrimonio ?? '').toLowerCase().includes(termo) ||
      (ativo.codigo_qr ?? '').toLowerCase().includes(termo) ||
      (ativo.categorias_ativos?.nome ?? '').toLowerCase().includes(termo) ||
      (ativo.locais?.nome ?? '').toLowerCase().includes(termo)
    )
  })

  return (
    <div className="px-5 pt-3 pb-24 space-y-5">
      {/* Botão Voltar */}
      <div>
        <Link
          href="/coordenador"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-600 hover:text-black transition-colors -ml-1 py-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar para Validação
        </Link>
      </div>

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Gestão de Ativos & Etiquetas
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Visualize informações, códigos de segurança e imprima etiquetas de QR Code.
        </p>
      </div>

      {/* Barra de Busca */}
      <BarraBusca
        placeholder="Buscar por nome, patrimônio, QR ou sala..."
        valor={termoBusca}
        aoMudar={setTermoBusca}
      />

      {/* Status da Carga */}
      {carregando ? (
        <div className="space-y-3.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-[24px] p-5 border border-gray-100/80 animate-pulse space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/6" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : erro ? (
        <div className="p-5 bg-red-50 border border-red-200 rounded-3xl text-red-800 text-xs font-bold flex flex-col items-center gap-2">
          <span>{erro}</span>
        </div>
      ) : ativosFiltrados.length === 0 ? (
        <div className="py-12 px-6 bg-white rounded-[28px] border border-gray-100/80 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#246BFD]/5 flex items-center justify-center text-[#246BFD]">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900">Nenhum ativo encontrado</h3>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
              Tente reajustar os termos da sua pesquisa ou verifique a conexão com o banco de dados.
            </p>
          </div>
        </div>
      ) : (
        /* Lista de Ativos */
        <div className="space-y-3.5">
          {ativosFiltrados.map((ativo) => {
            const configStatus = STATUS_ATIVO_MAPA[ativo.status as StatusAtivo] || {
              label: ativo.status,
              dot: 'bg-gray-400',
              cor: 'cinza'
            }

            return (
              <div
                key={ativo.id}
                className="bg-white rounded-[24px] p-5 shadow-[var(--shadow-card)] border border-gray-100 hover:border-gray-200/80 transition-all select-none"
              >
                <div className="space-y-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex items-center justify-between">
                    <PillTag cor="azul">
                      {ativo.categorias_ativos?.nome || 'Ativo'}
                    </PillTag>
                    
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${configStatus.dot}`} />
                      <span className="text-[11px] text-gray-500 font-bold">
                        {configStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* Nome do Ativo */}
                  <div>
                    <h3 className="text-[15px] font-extrabold text-gray-900 leading-snug tracking-tight uppercase">
                      {ativo.nome}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-400 mt-1 font-medium">
                      <span>Localização:</span>
                      <span className="font-bold text-gray-600">{ativo.locais?.nome || 'Sem localização'}</span>
                    </div>
                  </div>

                  {/* Info códigos */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50/50 rounded-xl p-2.5 border border-gray-100">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Patrimônio</span>
                      <p className="text-[11px] font-mono font-bold text-gray-700 truncate">
                        {ativo.patrimonio || 'Não informado'}
                      </p>
                    </div>
                    <div className="space-y-0.5 border-l border-gray-200 pl-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Código Segurança</span>
                      <p className="text-[11px] font-mono font-bold text-gray-700 truncate">
                        {ativo.codigo_qr}
                      </p>
                    </div>
                  </div>

                  {/* Rodapé: QR Code Trigger */}
                  <div className="h-px bg-gray-100 pt-1" />
                  <div className="flex justify-end pt-1">
                    <QRCodeAtivo
                      ativoId={ativo.id}
                      nomeAtivo={ativo.nome}
                      codigoQr={ativo.codigo_qr}
                      patrimonio={ativo.patrimonio}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
