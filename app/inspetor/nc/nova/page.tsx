'use client'

import { useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CriticidadeItem } from '@/lib/supabase/types'

const CRITICIDADES: { valor: CriticidadeItem; label: string; desc: string; cor: string; corAtivo: string }[] = [
  { valor: 'critico', label: 'Crítico', desc: 'Pode indisponibilizar o ativo', cor: 'border-gray-200 bg-white text-gray-600', corAtivo: 'border-red-300 bg-red-50 text-red-700' },
  { valor: 'importante', label: 'Importante', desc: 'Requer ação em breve', cor: 'border-gray-200 bg-white text-gray-600', corAtivo: 'border-amber-300 bg-amber-50 text-amber-700' },
  { valor: 'informativo', label: 'Informativo', desc: 'Registro para acompanhamento', cor: 'border-gray-200 bg-white text-gray-600', corAtivo: 'border-sky-300 bg-sky-50 text-sky-700' },
]

function FormularioNC() {
  const router = useRouter()
  const params = useSearchParams()
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const secaoNome = params.get('secaoNome') ?? 'Seção'

  const [descricao, setDescricao] = useState('')
  const [criticidade, setCriticidade] = useState<CriticidadeItem>('critico')
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoPreview(URL.createObjectURL(file))
  }

  function removerFoto() {
    setFotoPreview(null)
    if (fotoInputRef.current) fotoInputRef.current.value = ''
  }

  async function handleRegistrar() {
    setEnviando(true)
    await new Promise((r) => setTimeout(r, 1000))
    router.back()
  }

  return (
    <div className="px-5 pt-4 pb-10 space-y-6">
      {/* Voltar */}
      <Link
        href="/inspetor"
        onClick={(e) => { e.preventDefault(); router.back() }}
        className="inline-flex items-center gap-1.5 text-[13px] font-bold text-gray-600 hover:text-black transition-colors -ml-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Voltar
      </Link>

      {/* Título */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Registrar não conformidade
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Seção: <span className="font-semibold text-gray-700">{secaoNome}</span>
        </p>
      </div>

      {/* ── Descrição ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Descreva a não conformidade
        </label>
        <textarea
          rows={4}
          autoFocus
          placeholder="Ex: Faltando 2 ampolas de Adrenalina 1mg/ml..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-2 focus:ring-[#246BFD]/10 resize-none transition-all"
        />
      </div>

      {/* ── Evidência ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Evidência
        </label>

        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFoto}
          className="hidden"
        />

        {fotoPreview ? (
          <div className="relative">
            <img
              src={fotoPreview}
              alt="Evidência fotográfica"
              className="w-full h-52 object-cover rounded-2xl border border-gray-200"
            />
            <button
              type="button"
              onClick={removerFoto}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center text-xs font-bold hover:bg-black/70 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fotoInputRef.current?.click()}
            className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center gap-2.5 text-gray-400 hover:border-[#246BFD] hover:text-[#246BFD] transition-colors cursor-pointer"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-[13px] font-semibold">Tirar foto ou anexar</span>
          </button>
        )}
      </div>

      {/* ── Criticidade ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Criticidade
        </label>
        <div className="space-y-2">
          {CRITICIDADES.map((c) => {
            const selecionado = criticidade === c.valor
            return (
              <button
                key={c.valor}
                type="button"
                onClick={() => setCriticidade(c.valor)}
                className={[
                  'w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all cursor-pointer',
                  selecionado ? c.corAtivo : c.cor,
                ].join(' ')}
              >
                <div className="text-left">
                  <p className="text-[14px] font-bold">{c.label}</p>
                  <p className="text-[11px] opacity-70 mt-0.5">{c.desc}</p>
                </div>
                <div className={[
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  selecionado ? 'border-current' : 'border-gray-300',
                ].join(' ')}>
                  {selecionado && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Assinatura do Responsável ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Registrado por
        </label>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3.5">
          {/* Avatar com iniciais */}
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
            PS
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-gray-900">Enf. Pedro Soares</p>
            <p className="text-[12px] text-gray-500">
              Inspetor · {new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Ações ── */}
      <div className="flex gap-3 pt-3 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3.5 rounded-full text-[14px] font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleRegistrar}
          disabled={!descricao.trim() || enviando}
          className="flex-1 py-3.5 rounded-full text-[14px] font-bold text-white bg-gradient-to-b from-[#246bfd] to-[#1253f6] border-[3px] border-white/90 shadow-[0_10px_24px_-4px_rgba(30,107,251,0.35)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {enviando ? 'Registrando...' : 'Registrar NC'}
        </button>
      </div>
    </div>
  )
}

export default function PaginaNovaNC() {
  return (
    <Suspense fallback={<div className="px-5 pt-8 text-center text-gray-400">Carregando...</div>}>
      <FormularioNC />
    </Suspense>
  )
}
