'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CriticidadeItem, SetorTecnico } from '@/lib/supabase/types'
import { criarClienteSupabase } from '@/lib/supabase/client'
import { TODOS_SETORES, SETORES_LABELS, SETORES_ICONES } from '@/lib/roteamentoNC'

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
  const [setorResponsavel, setSetorResponsavel] = useState<SetorTecnico>('engenharia_clinica')
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const [dataHora, setDataHora] = useState('')

  useEffect(() => {
    setDataHora(new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
  }, [])

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
    try {
      const file = fotoInputRef.current?.files?.[0]
      let uploadedUrl = null

      if (file) {
        const supabase = criarClienteSupabase() as any
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(filePath, file)

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('evidencias')
            .getPublicUrl(filePath)
          uploadedUrl = publicUrlData.publicUrl
        } else {
          console.error('Erro de upload:', uploadError)
          uploadedUrl = null
        }
      }

      const secaoId = params.get('secao')
      if (secaoId) {
        sessionStorage.setItem(`argus_nc_${secaoId}`, JSON.stringify({
          descricao,
          criticidade,
          setor_responsavel: setorResponsavel,
          fotoPreview: uploadedUrl || null
        }))
      }
    } catch (err) {
      console.error('Erro ao registrar NC no sessionStorage:', err)
    } finally {
      setEnviando(false)
      router.back()
    }
  }

  return (
    <div className="px-4 sm:px-5 pt-3 pb-8 space-y-4 sm:space-y-6">
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
        <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          Registrar não conformidade
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Seção: <span className="font-semibold text-gray-700">{secaoNome}</span>
        </p>
      </div>

      {/* ── Setor Responsável (chips visuais) ── */}
      <div className="space-y-1.5">
        <label className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Setor Responsável
        </label>
        <div className="flex flex-wrap gap-2">
          {TODOS_SETORES.map((setor) => {
            const selecionado = setorResponsavel === setor
            return (
              <button
                key={setor}
                type="button"
                onClick={() => setSetorResponsavel(setor)}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer active:scale-95 select-none',
                  selecionado
                    ? 'bg-[#246BFD]/10 border-[#246BFD]/30 text-[#246BFD] shadow-[0_2px_8px_rgba(36,107,253,0.1)]'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
                ].join(' ')}
              >
                <span className="text-sm leading-none">{SETORES_ICONES[setor]}</span>
                {SETORES_LABELS[setor]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Descrição ── */}
      <div className="space-y-1.5">
        <label className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Descreva a não conformidade
        </label>
        <textarea
          rows={3}
          autoFocus
          placeholder="Ex: Faltando 2 ampolas de Adrenalina 1mg/ml..."
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#246BFD] focus:ring-2 focus:ring-[#246BFD]/10 resize-none transition-all"
        />
      </div>

      {/* ── Evidência ── */}
      <div className="space-y-1.5">
        <label className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wider uppercase">
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
              className="w-full h-36 object-cover rounded-xl border border-gray-200"
            />
            <button
              type="button"
              onClick={removerFoto}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center text-xs font-bold hover:bg-black/70 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fotoInputRef.current?.click()}
            className="w-full h-20 rounded-xl border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#246BFD] hover:text-[#246BFD] transition-colors cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-xs font-semibold">Tirar foto ou anexar</span>
          </button>
        )}
      </div>

      {/* ── Criticidade ── */}
      <div className="space-y-1.5">
        <label className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wider uppercase">
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
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer',
                  selecionado ? c.corAtivo : c.cor,
                ].join(' ')}
              >
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-bold">{c.label}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">{c.desc}</p>
                </div>
                <div className={[
                  'w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all',
                  selecionado ? 'border-current' : 'border-gray-300',
                ].join(' ')}>
                  {selecionado && <div className="w-2 h-2 rounded-full bg-current" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Assinatura do Responsável ── */}
      <div className="space-y-1.5">
        <label className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-wider uppercase">
          Registrado por
        </label>
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs shrink-0">
            PS
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-gray-900">Enf. Pedro Soares</p>
            <p className="text-[11px] text-gray-500">
              Inspetor · {dataHora}
            </p>
          </div>
        </div>
      </div>

      {/* ── Ações ── */}
      <div className="flex gap-2.5 pt-2 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-full text-xs sm:text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleRegistrar}
          disabled={!descricao.trim() || enviando}
          className="flex-1 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-b from-[#246bfd] to-[#1253f6] border-[3px] border-white/90 shadow-[0_10px_24px_-4px_rgba(30,107,251,0.35)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
