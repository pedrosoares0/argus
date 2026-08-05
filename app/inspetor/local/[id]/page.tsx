'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import type { StatusAtivo } from '@/lib/supabase/types'

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

  // Mock
  const local = {
    id: '1',
    nome: 'Sala 01',
    setor: 'Centro Cirúrgico A',
    status: 'pronta_com_ressalvas' as keyof typeof STATUS_LOCAL,
  }

  const ativos = [
    { id: 'a1', nome: 'Monitor Multiparamétrico #1', status: 'operacional' as StatusAtivo, ultimaInspecao: 'Hoje 14:30' },
    { id: 'a2', nome: 'Aparelho de Anestesia #1', status: 'operacional_com_restricoes' as StatusAtivo, ultimaInspecao: 'Hoje 13:15' },
    { id: 'a3', nome: 'Carrinho de Parada #1', status: 'operacional' as StatusAtivo, ultimaInspecao: 'Ontem 18:00' },
    { id: 'a4', nome: 'Mesa Cirúrgica #1', status: 'indisponivel' as StatusAtivo, ultimaInspecao: 'Hoje 10:45' },
  ]

  const statusCfg = STATUS_LOCAL[local.status]

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
          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${statusCfg.bg}`}>
            {statusCfg.label}
          </span>
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
              const cfg = STATUS_ATIVO[a.status]
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
            const cfg = STATUS_ATIVO[ativo.status]
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
