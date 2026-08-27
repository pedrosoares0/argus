'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Botao } from './Botao'
import { LiquidMetalButton } from './liquid-metal-button'

interface QRCodeAtivoProps {
  ativoId: string
  localId: string
  nomeAtivo: string
  codigoQr: string
  patrimonio?: string | null
}

export function QRCodeAtivo({ ativoId, localId, nomeAtivo, codigoQr, patrimonio }: QRCodeAtivoProps) {
  const [aberto, setAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const qrPrintRef = useRef<HTMLDivElement>(null)

  // URL real acessível por qualquer câmera de celular — abre direto no navegador
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const valorQr = `${origin}/inspetor/local/${localId}`

  async function handleCopiar() {
    try {
      const codigoExibicao = codigoQr || patrimonio || 'Car.Par1'
      await navigator.clipboard.writeText(codigoExibicao)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (err) {
      console.error('Falha ao copiar:', err)
    }
  }

  function handleImprimir() {
    const qrSvgHtml = qrPrintRef.current?.innerHTML || ''
    const codigoExibicao = codigoQr || patrimonio || 'Car.Par1'

    const telaImpressao = window.open('', '', 'width=700,height=800')
    if (telaImpressao) {
      telaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Etiqueta Argus - ${nomeAtivo}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet" />
            <style>
              @page {
                size: auto;
                margin: 0mm;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                height: 100vh;
                background-color: #ffffff;
                color: #0f172a;
              }
              .etiqueta-wrapper {
                padding: 20px;
              }
              .etiqueta-card {
                width: 320px;
                border: 2.5px solid #0f172a;
                border-radius: 20px;
                padding: 20px 18px;
                background: #ffffff;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                box-shadow: none;
                position: relative;
              }
              .header-logo {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                border-bottom: 1.5px solid #e2e8f0;
                padding-bottom: 10px;
                margin-bottom: 14px;
              }
              .brand-title {
                font-family: "Space Grotesk", sans-serif;
                font-size: 15px;
                font-weight: 600;
                letter-spacing: -0.4px;
                color: #0f172a;
                text-transform: none;
              }
              .brand-subtitle {
                font-size: 9px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .qr-box {
                margin: 4px 0 12px 0;
                padding: 10px;
                background: #ffffff;
                border: 1.5px solid #cbd5e1;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .qr-box svg {
                width: 170px !important;
                height: 170px !important;
                display: block;
              }
              .titulo-ativo {
                font-size: 15px;
                font-weight: 900;
                color: #0f172a;
                margin: 0 0 4px 0;
                text-transform: uppercase;
                letter-spacing: -0.3px;
                line-height: 1.25;
              }
              .badge-digitacao {
                margin-top: 10px;
                width: 100%;
                background-color: #f8fafc;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
              }
              .badge-label {
                font-size: 8px;
                font-weight: 800;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.8px;
              }
              .badge-code {
                font-size: 16px;
                font-weight: 900;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                color: #246BFD;
                letter-spacing: 1px;
              }
              .patrimonio-txt {
                font-size: 10px;
                font-weight: 700;
                color: #475569;
                margin-top: 2px;
              }
              @media print {
                body {
                  height: auto;
                  min-height: auto;
                  background: transparent;
                }
                .etiqueta-wrapper {
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="etiqueta-wrapper">
              <div class="etiqueta-card">
                <div class="header-logo">
                  <span class="brand-title">Argus</span>
                  <span class="brand-subtitle">Identificação de Ativo</span>
                </div>
                
                <div class="qr-box">
                  ${qrSvgHtml}
                </div>
                
                <h2 class="titulo-ativo">${nomeAtivo}</h2>
                ${patrimonio ? `<div class="patrimonio-txt">Patrimônio: <b>${patrimonio}</b></div>` : ''}

                <div class="badge-digitacao">
                  <span class="badge-label">Código para Digitação Manual</span>
                  <span class="badge-code">${codigoExibicao}</span>
                </div>
              </div>
            </div>

            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 150);
              };
            <\/script>
          </body>
        </html>
      `)
      telaImpressao.document.close()
    }
  }

  const codigoExibicao = codigoQr || patrimonio || 'Car.Par1'

  return (
    <>
      {/* Botão de Ação para Visualização */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#246BFD] hover:text-[#1C54D4] transition-colors py-1.5 px-2.5 rounded-xl bg-[#EBF4FF] hover:bg-[#EBF4FF]/80 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          {/* Top-left scan marker */}
          <path d="M3 3h5v2H5v3H3V3z" />
          {/* Top-right scan marker */}
          <path d="M16 3h5v5h-2V5h-3V3z" />
          {/* Bottom-left scan marker */}
          <path d="M3 16v5h5v-2H5v-3H3z" />
          {/* Bottom-right scan marker */}
          <path d="M21 16v5h-5v-2h3v-3h2z" />
          {/* Inner QR pattern */}
          <rect x="7" y="7" width="4" height="4" rx="0.5" />
          <rect x="13" y="7" width="4" height="4" rx="0.5" />
          <rect x="7" y="13" width="4" height="4" rx="0.5" />
          <rect x="14" y="14" width="2" height="2" rx="0.3" />
        </svg>
        QRCode
      </button>

      {/* Modal */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-gray-100/80 space-y-5 animate-[scaleIn_0.2s_ease-out]">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Etiqueta de Identificação</h3>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">
                  QR Code e Código Manual
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo Principal */}
            <div className="flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl p-5 border border-gray-100 text-center">
              
              {/* O QR Code real */}
              <div ref={qrPrintRef} className="bg-white p-3 rounded-2xl shadow-xs border border-gray-100">
                <QRCodeSVG
                  value={valorQr}
                  size={150}
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Informações do Ativo */}
              <div className="mt-4 space-y-0.5 w-full">
                <h4 className="text-sm font-extrabold text-gray-900 leading-tight uppercase px-2 truncate">
                  {nomeAtivo}
                </h4>
                {patrimonio && (
                  <p className="text-[11px] text-gray-500 font-medium">
                    Patrimônio: <span className="font-bold">{patrimonio}</span>
                  </p>
                )}
              </div>

              {/* Código de Backup para digitação manual */}
              <div className="mt-4 w-full bg-white rounded-xl border border-gray-200/80 p-3 flex flex-col items-center gap-1.5 shadow-2xs">
                <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
                  Código para Digitação Manual
                </span>
                <span className="text-base font-mono font-black text-[#246BFD] bg-[#EBF4FF] px-3 py-1 rounded-lg border border-[#246BFD]/20 tracking-wider select-all">
                  {codigoExibicao}
                </span>
                
                <button
                  type="button"
                  onClick={handleCopiar}
                  className="text-[10px] font-bold text-[#246BFD] hover:underline flex items-center gap-1 cursor-pointer mt-0.5"
                >
                  {copiado ? (
                    <>
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Copiado!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.375c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v.75m-12 1.5h12m-12 3h12m-12 3h12" />
                      </svg>
                      Copiar Código
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Ações de Impressão */}
            <div className="flex gap-2">
              <Botao
                type="button"
                variante="secundario"
                larguraTotal
                onClick={() => setAberto(false)}
              >
                Voltar
              </Botao>
              <LiquidMetalButton
                type="button"
                larguraTotal
                onClick={handleImprimir}
                label="Imprimir Etiqueta"
              />
            </div>

          </div>
        </div>
      )}
    </>
  )
}
