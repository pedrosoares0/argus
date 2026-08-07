'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { PillTag } from '@/components/ui/PillTag'
import type { StatusAtivo } from '@/lib/supabase/types'
import { criarClienteSupabase } from '@/lib/supabase/client'

/**
 * Tela de detalhes do Local / Sala — Apple-style, hierarquia clara.
 */

const STATUS_ATIVO: Record<StatusAtivo, { label: string; dot: string }> = {
  operacional: { label: 'Operacional', dot: 'bg-emerald-500' },
  operacional_com_restricoes: { label: 'Com restrição', dot: 'bg-amber-500' },
  indisponivel: { label: 'Indisponível', dot: 'bg-red-500' },
  em_manutencao: { label: 'Em manutenção', dot: 'bg-sky-500' },
}

const STATUS_LOCAL = {
  pronta: { label: 'Pronta', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pronta_com_ressalvas: { label: 'Com ressalvas', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  nao_pronta: { label: 'Não pronta', bg: 'bg-red-50 text-red-700 border-red-200' },
  liberada_manualmente: { label: 'Liberada', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
} as const

export default function PaginaLocal() {
  const router = useRouter()

  const params = useParams()
  const localId = params.id as string

  const [local, setLocal] = useState<any>(null)
  const [ativos, setAtivos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarDados() {
      try {
        const supabase = criarClienteSupabase() as any
        
        // Buscar detalhes do local
        const { data: localData, error: localError } = await supabase
          .from('locais')
          .select('*, centros_cirurgicos(*)')
          .eq('id', localId)
          .single()

        if (localError) {
          console.error(localError)
          setErro(`Erro ao carregar local: ${localError.message} (Código ${localError.code})`)
          return
        }

        if (!localData) {
          setErro('Nenhum dado encontrado para esta sala.')
          return
        }

        setLocal({
          id: localData.id,
          nome: localData.nome,
          setor: localData.centros_cirurgicos?.nome || 'Centro Cirúrgico',
          status: localData.status as keyof typeof STATUS_LOCAL,
        })

        // Buscar ativos desse local
        const { data: ativosData, error: ativosError } = await supabase
          .from('ativos')
          .select('*')
          .eq('local_id', localId)

        if (ativosError) {
          console.error(ativosError)
          setErro(`Erro ao carregar ativos: ${ativosError.message} (Código ${ativosError.code})`)
          return
        }

        if (ativosData) {
          setAtivos(ativosData.map((a: any) => ({
            id: a.id,
            nome: a.nome,
            status: a.status as StatusAtivo,
            ultimaInspecao: 'Sem inspeções hoje',
          })))
        }
      } catch (err: any) {
        console.error(err)
        setErro(`Erro de conexão: ${err.message || err}`)
      } finally {
        setCarregando(false)
      }
    }
    if (localId) {
      carregarDados()
    }
  }, [localId])

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

  if (carregando || !local) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F4F6FA]">
        <p className="text-sm font-semibold text-gray-400 animate-pulse">Carregando sala...</p>
      </div>
    )
  }

  const statusCfg = STATUS_LOCAL[local.status as keyof typeof STATUS_LOCAL]
  const corPill = local.status === 'pronta' ? 'verde' : local.status === 'pronta_com_ressalvas' ? 'laranja' : local.status === 'nao_pronta' ? 'vermelho' : 'azul'

  return (
    <div className="px-5 pt-3 pb-10 space-y-6">
      {/* Voltar */}
      <Link
        href="/inspetor"
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-600 hover:text-black transition-colors -ml-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Voltar
      </Link>

      {/* ── Card Principal: Sala ── */}
      <div className="bg-white rounded-[24px] p-6 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80">
        {/* Nome + Badge de Prontidão */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight leading-tight">
              {local.nome}
            </h1>
            <p className="text-[13px] text-gray-500 mt-0.5">{local.setor}</p>
          </div>
          <PillTag cor={corPill} className="shrink-0">
            {statusCfg.label}
          </PillTag>
        </div>

        {/* Separador */}
        <div className="h-px bg-gray-100 my-4" />

        {/* Prontidão Visual */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
            Prontidão dos Ativos
          </p>
          <div className="grid grid-cols-4 gap-1">
            {ativos.map((a) => {
              const cfg = STATUS_ATIVO[a.status as StatusAtivo]
              return (
                <div key={a.id} className="flex flex-col items-center gap-1.5 py-2">
                  <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                  <span className="text-[10px] font-medium text-gray-500 text-center leading-tight">
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA — Iniciar Ronda */}
        <div className="mt-5">
          <Botao
            variante="primario"
            tamanho="lg"
            larguraTotal
            onClick={() => router.push(`/inspetor/checklist/ronda-${local.id}`)}
            icone={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          >
            Iniciar ronda
          </Botao>
        </div>
      </div>

      {/* ── Lista de Equipamentos ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase px-1">
          Equipamentos ({ativos.length})
        </p>

        <div className="bg-white rounded-[24px] shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 divide-y divide-gray-100/80 overflow-hidden">
          {ativos.map((ativo) => {
            const cfg = STATUS_ATIVO[ativo.status as StatusAtivo]
            return (
              <button
                key={ativo.id}
                type="button"
                onClick={() => router.push(`/inspetor/checklist/${ativo.id}`)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors cursor-pointer active:bg-gray-100/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">
                      {ativo.nome}
                    </p>
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      {cfg.label} · {ativo.ultimaInspecao}
                    </p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
