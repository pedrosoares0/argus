'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import type { RespostaItem } from '@/lib/supabase/types'

interface SecaoChecklist {
  id: string
  nome: string
  materiaisReferencia: string[]
}

const SECOES: SecaoChecklist[] = [
  { id: 'via-aerea', nome: 'Via aérea', materiaisReferencia: ['Cânula orofaríngea (Guedel) nº 3, 4 e 5', 'Máscara laríngea nº 3 e 4', 'Tubo endotraqueal 6.5 a 8.0', 'Fio guia', 'Seringa 20ml p/ cuff', 'Cânula nasal tipo óculos'] },
  { id: 'laringoscopio', nome: 'Laringoscópio', materiaisReferencia: ['Cabo adulto em perfeito funcionamento', 'Lâminas curvas nº 3 e 4', 'Lâmina reta nº 4', 'Pilhas reservas testadas'] },
  { id: 'cilindro-o2', nome: 'Cilindro de oxigênio', materiaisReferencia: ['Cilindro cheio (manômetro > 150 kgf/cm²)', 'Válvula reguladora funcionante', 'Máscara de O₂ com reservatório', 'Extensão de O₂'] },
  { id: 'acesso-venoso', nome: 'Materiais de acesso venoso', materiaisReferencia: ['Jelco nº 14, 16, 18 e 20', 'Scalp nº 19, 21 e 23', 'Equipo macrogotas (2 unidades)', 'Torneira 3 vias', 'Garrote'] },
  { id: 'materiais-diversos', nome: 'Materiais diversos', materiaisReferencia: ['Luvas P, M e G', 'Gaze estéril', 'Micropore', 'Álcool 70%', 'Sondas de aspiração nº 12 e 14'] },
  { id: 'desfibrilador', nome: 'Desfibrilador', materiaisReferencia: ['Equipamento ligado e bateria testada', 'Pás adulto e pediátrico limpas', 'Gel condutor disponível', 'Cabo e eletrodos de monitorização'] },
  { id: 'medicamentos', nome: 'Medicamentos', materiaisReferencia: ['Adrenalina 1mg/ml (5 ampolas)', 'Atropina 0.25mg/ml (5 ampolas)', 'Amiodarona 150mg/3ml (3 ampolas)', 'Lidocaína 2% s/v (2 frascos)', 'Adenosina 6mg/ml (3 ampolas)'] },
  { id: 'solucoes', nome: 'Soluções', materiaisReferencia: ['SF 0.9% 250ml (2)', 'SF 0.9% 500ml (2)', 'Ringer Lactato 500ml (1)', 'SG 5% 250ml (1)'] },
  { id: 'itens-admin', nome: 'Itens administrativos', materiaisReferencia: ['Ficha de registro de parada', 'Caneta', 'Lacre numerado disponível', 'Checklist impresso de backup'] },
]

export default function PaginaChecklist() {
  const router = useRouter()

  const modelo = {
    setor: 'UTI Adulto - Bloco A',
    ativo: 'Carrinho UTI-A',
    tipo: 'Carrinho de Parada · Completo',
  }

  const [respostas, setRespostas] = useState<Record<string, { resposta: RespostaItem | null }>>(
    () => Object.fromEntries(SECOES.map((s) => [s.id, { resposta: null }]))
  )
  const [expandida, setExpandida] = useState<string | null>(SECOES[0].id)
  const [enviando, setEnviando] = useState(false)

  const totalRespondidos = Object.values(respostas).filter((r) => r.resposta !== null).length
  const progresso = Math.round((totalRespondidos / SECOES.length) * 100)
  const todosRespondidos = totalRespondidos === SECOES.length

  function setResposta(id: string, resposta: RespostaItem) {
    setRespostas((prev) => ({ ...prev, [id]: { resposta } }))
    if (resposta === 'nao_conforme') {
      router.push(`/inspetor/nc/nova?secao=${id}&secaoNome=${encodeURIComponent(SECOES.find(s => s.id === id)?.nome ?? '')}`)
    } else {
      const idx = SECOES.findIndex((s) => s.id === id)
      const proxima = SECOES.slice(idx + 1).find((s) => respostas[s.id]?.resposta === null)
      if (proxima) setTimeout(() => setExpandida(proxima.id), 250)
    }
  }

  async function handleConcluir() {
    setEnviando(true)
    await new Promise((r) => setTimeout(r, 1200))
    router.push('/inspetor')
  }

  return (
    <div className="px-5 pt-4 pb-10 space-y-5">
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

      {/* Card de Contexto */}
      <div className="bg-white rounded-[24px] p-6 shadow-[0_1px_8px_rgba(0,0,0,0.03)] border border-gray-100/80 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-[#0284C7] tracking-wider uppercase">{modelo.setor}</p>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-1">{modelo.ativo}</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">{modelo.tipo}</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] font-semibold">
            <span className="text-gray-500">Progresso</span>
            <span className="text-gray-900 tabular-nums">{totalRespondidos} / {SECOES.length}</span>
          </div>
          <div className="w-full h-[6px] bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#246BFD] rounded-full transition-all duration-500 ease-out" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </div>

      {/* Lista de Seções — cards individuais */}
      <div className="space-y-3">
        {SECOES.map((secao) => {
          const resp = respostas[secao.id]
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
                  <div className="bg-[#F4F6FA] rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 tracking-[0.08em] uppercase">
                      Verifique os materiais
                    </p>
                    <div className="space-y-1.5">
                      {secao.materiaisReferencia.map((mat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <div className="w-1 h-1 rounded-full bg-gray-300 mt-[7px] shrink-0" />
                          <span className="text-[13px] text-gray-600 leading-snug">{mat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ações — botões sólidos, não outlines fracos */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Conforme */}
                    <button
                      type="button"
                      onClick={() => setResposta(secao.id, 'conforme')}
                      className={[
                        'relative py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-200 cursor-pointer',
                        'flex flex-col items-center justify-center gap-1',
                        resp.resposta === 'conforme'
                          ? 'bg-emerald-500 text-white shadow-[0_6px_16px_-2px_rgba(5,150,105,0.4)]'
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
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
                        'relative py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-200 cursor-pointer',
                        'flex flex-col items-center justify-center gap-1',
                        resp.resposta === 'nao_conforme'
                          ? 'bg-red-500 text-white shadow-[0_6px_16px_-2px_rgba(239,68,68,0.4)]'
                          : 'bg-red-50 text-red-500 hover:bg-red-100',
                      ].join(' ')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Não Conf.</span>
                    </button>

                    {/* N/A */}
                    <button
                      type="button"
                      onClick={() => setResposta(secao.id, 'nao_se_aplica')}
                      className={[
                        'relative py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-200 cursor-pointer',
                        'flex flex-col items-center justify-center gap-1',
                        resp.resposta === 'nao_se_aplica'
                          ? 'bg-gray-500 text-white'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200',
                      ].join(' ')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                      <span>N/A</span>
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
          {todosRespondidos ? 'Concluir inspeção' : `Responda todas (${totalRespondidos}/${SECOES.length})`}
        </Botao>
      </div>
    </div>
  )
}
