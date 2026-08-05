'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { PillTag } from '@/components/ui/PillTag'
import { Botao } from '@/components/ui/Botao'
import type { StatusAtivo } from '@/lib/supabase/types'

/**
 * Tela de detalhes do Local — mostra ativos, status de prontidão e permite iniciar ronda.
 * RN-025/028: inspeção padrão é por ambiente, não por equipamento isolado.
 */
export default function PaginaLocal() {
  const router = useRouter()

  // Dados mock — futuramente virão do Supabase via params.id
  const local = {
    id: '1',
    nome: 'Sala 01',
    setor: 'Centro Cirúrgico A',
    status: 'pronta_com_ressalvas' as const,
    tipo: 'sala' as const,
  }

  const ativos = [
    {
      id: 'a1',
      nome: 'Monitor Multiparamétrico #1',
      categoria: 'Monitor multiparamétrico',
      patrimonio: 'PAT-001234',
      status: 'operacional' as StatusAtivo,
      ultimaInspecao: 'Hoje 14:30',
    },
    {
      id: 'a2',
      nome: 'Aparelho de Anestesia #1',
      categoria: 'Aparelho de anestesia',
      patrimonio: 'PAT-001235',
      status: 'operacional_com_restricoes' as StatusAtivo,
      ultimaInspecao: 'Hoje 13:15',
    },
    {
      id: 'a3',
      nome: 'Carrinho de Parada #1',
      categoria: 'Carrinho de parada',
      patrimonio: 'PAT-001236',
      status: 'operacional' as StatusAtivo,
      ultimaInspecao: 'Ontem 18:00',
    },
    {
      id: 'a4',
      nome: 'Mesa Cirúrgica #1',
      categoria: 'Mesa cirúrgica',
      patrimonio: 'PAT-001237',
      status: 'indisponivel' as StatusAtivo,
      ultimaInspecao: 'Hoje 10:45',
    },
  ]

  const statusAtivoConfig: Record<StatusAtivo, { label: string; cor: 'verde' | 'laranja' | 'vermelho' | 'azul' }> = {
    operacional: { label: 'Operacional', cor: 'verde' },
    operacional_com_restricoes: { label: 'Com restrições', cor: 'laranja' },
    indisponivel: { label: 'Indisponível', cor: 'vermelho' },
    em_manutencao: { label: 'Em manutenção', cor: 'azul' },
  }

  const statusLocalConfig = {
    pronta: { label: 'Pronta', cor: 'verde' as const, icone: '✓' },
    pronta_com_ressalvas: { label: 'Com ressalvas', cor: 'laranja' as const, icone: '!' },
    nao_pronta: { label: 'Não pronta', cor: 'vermelho' as const, icone: '✗' },
    liberada_manualmente: { label: 'Liberada manualmente', cor: 'azul' as const, icone: '↑' },
  }

  const statusInfo = statusLocalConfig[local.status]

  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Botão voltar */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-primaria text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Voltar
      </button>

      {/* Header do local */}
      <Card className="!p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-texto">{local.nome}</h2>
            <p className="text-sm text-texto-secundario mt-0.5">{local.setor}</p>
          </div>
          <PillTag cor={statusInfo.cor}>{statusInfo.label}</PillTag>
        </div>

        {/* Resumo de prontidão */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-3 rounded-sm bg-sucesso-fundo">
            <p className="text-lg font-bold text-sucesso">
              {ativos.filter((a) => a.status === 'operacional').length}
            </p>
            <p className="text-[10px] font-medium text-sucesso/70 uppercase tracking-wide">
              Operacionais
            </p>
          </div>
          <div className="text-center p-3 rounded-sm bg-alerta-fundo">
            <p className="text-lg font-bold text-alerta">
              {ativos.filter((a) => a.status === 'operacional_com_restricoes').length}
            </p>
            <p className="text-[10px] font-medium text-alerta/70 uppercase tracking-wide">
              Restrições
            </p>
          </div>
          <div className="text-center p-3 rounded-sm bg-perigo-fundo">
            <p className="text-lg font-bold text-perigo">
              {ativos.filter((a) => ['indisponivel', 'em_manutencao'].includes(a.status)).length}
            </p>
            <p className="text-[10px] font-medium text-perigo/70 uppercase tracking-wide">
              Indisponíveis
            </p>
          </div>
        </div>
      </Card>

      {/* Botão iniciar ronda */}
      <Botao
        variante="primario"
        tamanho="lg"
        larguraTotal
        onClick={() => router.push(`/inspetor/checklist/ronda-${local.id}`)}
        icone={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      >
        Iniciar ronda
      </Botao>

      {/* Lista de ativos */}
      <section>
        <h3 className="text-sm font-semibold text-texto-secundario uppercase tracking-wider mb-3 ml-1">
          Ativos ({ativos.length})
        </h3>
        <Card className="!p-0 divide-y divide-separador overflow-hidden">
          {ativos.map((ativo) => {
            const statusCfg = statusAtivoConfig[ativo.status]
            return (
              <button
                key={ativo.id}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-texto/[0.02] active:bg-texto/[0.05] transition-colors"
                onClick={() => router.push(`/inspetor/checklist/${ativo.id}`)}
              >
                {/* Indicador de status */}
                <div
                  className={[
                    'w-2.5 h-2.5 rounded-full shrink-0',
                    statusCfg.cor === 'verde' ? 'bg-sucesso' : '',
                    statusCfg.cor === 'laranja' ? 'bg-alerta' : '',
                    statusCfg.cor === 'vermelho' ? 'bg-perigo' : '',
                    statusCfg.cor === 'azul' ? 'bg-primaria' : '',
                  ].join(' ')}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-texto truncate">
                    {ativo.nome}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <PillTag cor="cinza">{ativo.categoria}</PillTag>
                    <span className="text-xs text-texto-terciario">
                      {ativo.ultimaInspecao}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <svg
                  className="shrink-0 h-4 w-4 text-texto-terciario"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )
          })}
        </Card>
      </section>
    </div>
  )
}
