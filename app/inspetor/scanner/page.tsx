'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/Botao'

/**
 * Scanner de QR Code usando getUserMedia do navegador.
 * Sem dependência de app nativo (RN-026).
 *
 * Usa a biblioteca html5-qrcode para decodificação.
 * Fallback: se a câmera não estiver disponível, mostra mensagem.
 */
export default function PaginaScanner() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)

  const [erro, setErro] = useState<string | null>(null)
  const [escaneando, setEscaneando] = useState(true)

  useEffect(() => {
    iniciarCamera()
    return () => pararCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function iniciarCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        escanear()
      }
    } catch {
      setErro('Não foi possível acessar a câmera. Verifique as permissões.')
      setEscaneando(false)
    }
  }

  function pararCamera() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }

  function escanear() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function tick() {
      if (!video || !canvas || !ctx) return
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(tick)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)

      // Placeholder: aqui seria a decodificação com jsQR ou html5-qrcode
      // Por enquanto, simulamos a detecção após 3 segundos
      // Em produção, instalar e usar: import jsQR from 'jsqr'
      // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      // const code = jsQR(imageData.data, imageData.width, imageData.height)
      // if (code) { handleQrDetectado(code.data) }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
  }

  function handleQrDetectado(dados: string) {
    setEscaneando(false)
    pararCamera()

    // O QR Code contém referência ao local ou ativo
    // Formato esperado: sentry://local/{id} ou sentry://ativo/{id}
    const match = dados.match(/sentry:\/\/(local|ativo)\/(.+)/)
    if (match) {
      const [, tipo, id] = match
      if (tipo === 'local') {
        router.push(`/inspetor/local/${id}`)
      } else {
        router.push(`/inspetor/checklist/${id}`)
      }
    }
  }

  // Simular detecção para desenvolvimento
  function handleSimularDeteccao() {
    handleQrDetectado('sentry://local/1')
  }

  return (
    <div className="min-h-[calc(100dvh-8rem)] flex flex-col">
      {/* Botão voltar */}
      <div className="px-4 pt-4">
        <button
          onClick={() => {
            pararCamera()
            router.back()
          }}
          className="flex items-center gap-1 text-primaria text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Voltar
        </button>
      </div>

      {/* Área do scanner */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        {erro ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-perigo/10 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-perigo" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <p className="text-base font-medium text-texto">{erro}</p>
            <Botao variante="primario" onClick={iniciarCamera}>
              Tentar novamente
            </Botao>
          </div>
        ) : (
          <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden bg-black">
            {/* Vídeo da câmera */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Canvas oculto para processamento */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay com guias visuais */}
            {escaneando && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Quadrado guia */}
                <div className="w-56 h-56 relative">
                  {/* Cantos do quadrado */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-lg" />
                  {/* Linha de escaneamento animada */}
                  <div className="absolute left-2 right-2 h-0.5 bg-primaria shadow-[0_0_8px_var(--color-primaria)] animate-[scanLine_2s_ease-in-out_infinite]" />
                </div>
                {/* Sombra ao redor */}
                <div className="absolute inset-0 bg-black/40" style={{
                  maskImage: 'radial-gradient(circle at center, transparent 35%, black 65%)',
                  WebkitMaskImage: 'radial-gradient(circle at center, transparent 35%, black 65%)',
                }} />
              </div>
            )}
          </div>
        )}

        {/* Instrução */}
        {!erro && (
          <p className="text-sm text-texto-secundario text-center mt-4">
            Aponte a câmera para o QR Code do equipamento ou sala
          </p>
        )}

        {/* Botão de simulação (dev only) */}
        {!erro && (
          <div className="mt-6">
            <Botao
              variante="fantasma"
              tamanho="sm"
              onClick={handleSimularDeteccao}
            >
              Simular detecção (dev)
            </Botao>
          </div>
        )}
      </div>
    </div>
  )
}
