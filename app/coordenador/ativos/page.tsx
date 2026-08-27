'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GestaoAtivos } from '@/components/coordenador/GestaoAtivos'
import { criarClienteSupabase } from '@/lib/supabase/client'

export default function GestaoQRCodesCoordenador() {
  const [hospitalId, setHospitalId] = useState<string>('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarHospital() {
      try {
        const supabase = criarClienteSupabase() as any
        let idEncontrado = ''

        const stored = localStorage.getItem('argus_usuario_atual')
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed?.hospital_id) idEncontrado = parsed.hospital_id
          } catch (e) {
            console.error(e)
          }
        }

        if (!idEncontrado) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: perfilData } = await supabase
              .from('usuarios')
              .select('hospital_id')
              .eq('id', user.id)
              .single()

            if (perfilData?.hospital_id) {
              idEncontrado = perfilData.hospital_id
            }
          }
        }

        if (!idEncontrado) {
          const { data: primeiroHospital } = await supabase
            .from('hospitais')
            .select('id')
            .limit(1)
            .single()
          if (primeiroHospital) idEncontrado = primeiroHospital.id
        }

        setHospitalId(idEncontrado || 'e632822a-0000-0000-0000-000000000001')
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }

    carregarHospital()
  }, [])

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
          Voltar para Central de Comando
        </Link>
      </div>

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          Gestão de Ativos por Sala
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Equipamentos e etiquetas de QR Code organizados por localização e status operacional.
        </p>
      </div>

      {/* Componente de Gestão de Ativos Organizados por Sala */}
      {carregando ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 bg-white rounded-[24px] p-4 border border-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <GestaoAtivos hospitalId={hospitalId} />
      )}
    </div>
  )
}
