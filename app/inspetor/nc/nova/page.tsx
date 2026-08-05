'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Botao } from '@/components/ui/Botao'

/**
 * Formulário de abertura de NC (Não Conformidade).
 * RN-009: vinculada ao item/seção que gerou a NC.
 * Status inicial sempre "Aberta" — inspetor não pode alterar.
 * Upload de foto via câmera para Supabase Storage.
 */
export default function PaginaNovaNaoConformidade() {
  const router = useRouter()
  const inputFotoRef = useRef<HTMLInputElement>(null)

  const [descricao, setDescricao] = useState('')
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function handleCapturarFoto() {
    inputFotoRef.current?.click()
  }

  function handleFotoSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setFotoPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(arquivo)
  }

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim()) return

    setEnviando(true)
    // Futuramente:
    // 1. Upload da foto para Supabase Storage
    // 2. Criar registro em nao_conformidades via Edge Function
    // 3. Status = 'aberta', criticidade herdada do item
    await new Promise((r) => setTimeout(r, 1500))
    router.back()
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-5">
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

      <div>
        <h2 className="text-xl font-bold text-texto">Nova Não Conformidade</h2>
        <p className="text-sm text-texto-secundario mt-1">
          Documente o problema encontrado com descrição e foto
        </p>
      </div>

      <form onSubmit={handleEnviar} className="space-y-5">
        {/* Captura de foto */}
        <Card className="!p-0 overflow-hidden">
          {fotoPreview ? (
            <div className="relative">
              <img
                src={fotoPreview}
                alt="Evidência capturada"
                className="w-full aspect-[4/3] object-cover"
              />
              <button
                type="button"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition"
                onClick={() => setFotoPreview(null)}
                aria-label="Remover foto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 bg-fundo hover:bg-texto/[0.03] transition-colors"
              onClick={handleCapturarFoto}
            >
              <div className="w-16 h-16 rounded-2xl bg-primaria/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primaria" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-texto">Tirar foto</p>
                <p className="text-sm text-texto-secundario mt-0.5">
                  Documente o problema encontrado
                </p>
              </div>
            </button>
          )}
        </Card>

        {/* Input oculto para captura de foto */}
        <input
          ref={inputFotoRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoSelecionada}
          className="hidden"
        />

        {/* Descrição */}
        <div>
          <label
            htmlFor="descricao-nc"
            className="block text-sm font-medium text-texto-secundario mb-1.5 ml-1"
          >
            Descrição do problema
          </label>
          <textarea
            id="descricao-nc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={4}
            className={[
              'w-full',
              'bg-superficie',
              'rounded-input',
              'border border-separador',
              'px-4 py-3',
              'text-base text-texto',
              'placeholder:text-texto-terciario',
              'outline-none',
              'transition-all duration-200',
              'focus:border-primaria/30 focus:shadow-[var(--shadow-glow)]',
              'resize-none',
            ].join(' ')}
            placeholder="Descreva o que foi encontrado fora de conformidade..."
          />
        </div>

        {/* Info fixa */}
        <Card className="!p-4 bg-alerta-fundo border border-alerta/20">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-alerta shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-alerta">
                NC será registrada como &quot;Aberta&quot;
              </p>
              <p className="text-xs text-alerta/80 mt-0.5">
                A criticidade será herdada do item do checklist. O coordenador será notificado para atribuir um responsável.
              </p>
            </div>
          </div>
        </Card>

        {/* Botão enviar */}
        <Botao
          type="submit"
          variante="primario"
          tamanho="lg"
          larguraTotal
          carregando={enviando}
          disabled={!descricao.trim()}
        >
          Registrar não conformidade
        </Botao>
      </form>
    </div>
  )
}
