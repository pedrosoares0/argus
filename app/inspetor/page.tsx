'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'
import { BarraBusca } from '@/components/ui/BarraBusca'
import { Card } from '@/components/ui/Card'
import { PillTag } from '@/components/ui/PillTag'
import { IconeMascote } from '@/components/ui/IconeMascote'

/**
 * Tela inicial do Inspetor — idêntica ao design de referência do protótipo.
 */
export default function PaginaInicialInspetor() {
  const router = useRouter()
  const [termoBusca, setTermoBusca] = useState('')
  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')

  // Dados mock — futuramente virão do Supabase
  const carrinhosRecentes = [
    {
      id: '1',
      nome: 'Carrinho UTI-A',
      setor: 'UTI',
      corTag: 'roxo' as const,
      status: 'pronta' as const,
    },
    {
      id: '2',
      nome: 'Carrinho Sala 02',
      setor: 'Centro Cirúrgico',
      corTag: 'azul' as const,
      status: 'pronta_com_ressalvas' as const,
    },
    {
      id: '3',
      nome: 'Carrinho Emergência',
      setor: 'Pronto Socorro',
      corTag: 'vermelho' as const,
      status: 'nao_pronta' as const,
    },
  ]

  function handleSubmeterCodigo(e: React.FormEvent) {
    e.preventDefault()
    if (!codigoInput.trim()) return
    // Redireciona para o local/ativo correspondente ao código digitado
    setMostrarModalCodigo(false)
    router.push(`/inspetor/local/1`)
  }

  return (
    <div className="px-5 pt-4 space-y-6">
      {/* Seção Branding Superior */}
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        <IconeMascote tamanho={64} className="mb-3" />
        <h1 className="text-2xl font-bold text-texto tracking-tight">
          Health Tech
        </h1>
        <p className="text-sm font-medium text-texto-secundario mt-1">
          Gestão Digital do Carrinho de Parada
        </p>
      </div>

      {/* Card Principal: Leitura do Carrinho */}
      <div className="bg-white/90 backdrop-blur-md rounded-[28px] p-6 shadow-[var(--shadow-elevado)] border border-white/80 text-center space-y-4">
        {/* Ícone de QR Code interno */}
        <div className="mx-auto w-16 h-16 rounded-[22px] bg-[#EBF4FF] border border-[#D0E4FF] flex items-center justify-center text-primaria">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 8.25V4.875zM3.75 14.625c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125V18c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18v-3.375zM13.5 4.875c0-.621.504-1.125 1.125-1.125H18c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125h-3.375a1.125 1.125 0 01-1.125-1.125V4.875zM13.5 14.625c0-.621.504-1.125 1.125-1.125H18c.621 0 1.125.504 1.125 1.125V18c0 .621-.504 1.125-1.125 1.125h-3.375a1.125 1.125 0 01-1.125-1.125v-3.375z" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-bold text-texto tracking-tight">
            Leitura do Carrinho
          </h2>
          <p className="text-[13px] text-texto-secundario leading-relaxed mt-1.5 max-w-xs mx-auto">
            Aproxime a câmera do QR Code afixado no carrinho de parada para iniciar a conferência imediata.
          </p>
        </div>

        {/* Botão de Câmera (Com glow e glass border) */}
        <div className="pt-2 flex flex-col items-center gap-2.5">
          <Botao
            variante="primario"
            tamanho="lg"
            onClick={() => router.push('/inspetor/scanner')}
            className="w-full max-w-[240px]"
            icone={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            }
          >
            Escanear QR Code
          </Botao>

          {/* NOVO: Botão Digitar Código solicitado pelo usuário */}
          <button
            type="button"
            onClick={() => setMostrarModalCodigo(true)}
            className="text-xs font-semibold text-primaria hover:text-primaria-escura transition-colors py-1 px-3 rounded-full hover:bg-primaria/5"
          >
            Digitar código
          </button>
        </div>
      </div>

      {/* Divisora de Seção */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-separador" />
        <span className="text-[11px] font-semibold text-texto-terciario tracking-wider uppercase">
          OU SELECIONE MANUALMENTE
        </span>
        <div className="flex-1 h-px bg-separador" />
      </div>

      {/* Input de Busca */}
      <BarraBusca
        placeholder="Buscar por carrinho ou setor..."
        valor={termoBusca}
        aoMudar={setTermoBusca}
      />

      {/* Lista de Carrinhos */}
      <div className="space-y-3">
        {carrinhosRecentes.map((item, i) => (
          <Card
            key={item.id}
            onClick={() => router.push(`/inspetor/local/${item.id}`)}
            className="!p-4 bg-white/90 backdrop-blur-sm border-white/60 hover:border-primaria/20 transition-all"
          >
            <div
              className="flex items-center justify-between"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="space-y-1.5">
                <PillTag cor={item.corTag}>
                  {item.setor}
                </PillTag>
                <h3 className="text-base font-bold text-texto tracking-tight">
                  {item.nome}
                </h3>
              </div>

              {/* Botão Círculo com Seta */}
              <div className="w-9 h-9 rounded-full bg-superficie-secundaria flex items-center justify-center text-texto-secundario hover:bg-primaria hover:text-white transition-all shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Mock de Digitar Código */}
      {mostrarModalCodigo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-card-lg p-6 max-w-sm w-full shadow-2xl border border-white/80 space-y-4">
            <h3 className="text-lg font-bold text-texto">Digitar Código do QR</h3>
            <p className="text-xs text-texto-secundario">
              Insira a senha/código específico gravado no QR Code do equipamento.
            </p>

            <form onSubmit={handleSubmeterCodigo} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Ex: QR-UTI-001"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value)}
                className="w-full bg-fundo border border-separador rounded-input px-4 py-3 text-base text-texto font-mono uppercase tracking-wider outline-none focus:border-primaria"
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
