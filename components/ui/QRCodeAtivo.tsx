'use client'

import { useState, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Botao } from './Botao'

interface QRCodeAtivoProps {
  ativoId: string
  nomeAtivo: string
  codigoQr: string
  patrimonio?: string | null
}

export function QRCodeAtivo({ ativoId, nomeAtivo, codigoQr, patrimonio }: QRCodeAtivoProps) {
  const [aberto, setAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const qrPrintRef = useRef<HTMLDivElement>(null)

  const valorQr = `sentry://ativo/${ativoId}`

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(codigoQr)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (err) {
      console.error('Falha ao copiar:', err)
    }
  }

  function handleImprimir() {
    const conteudoPrint = qrPrintRef.current?.innerHTML
    const telaImpressao = window.open('', '', 'width=800,height=900')
    if (telaImpressao && conteudoPrint) {
      telaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Imprimir QR Code - ${nomeAtivo}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                background-color: #fff;
                color: #000;
              }
              .container-etiqueta {
                border: 2px dashed #000;
                padding: 30px;
                border-radius: 16px;
                display: flex;
                flex-direction: column;
                align-items: center;
                background: #fff;
                max-width: 320px;
                text-align: center;
              }
              .qr-box {
                margin-bottom: 16px;
              }
              .titulo-ativo {
                font-size: 18px;
                font-weight: 800;
                margin: 0 0 6px 0;
                text-transform: uppercase;
                letter-spacing: -0.3px;
              }
              .info-linha {
                font-size: 13px;
                font-weight: 600;
                color: #333;
                margin: 2px 0;
              }
              .info-codigo {
                font-size: 14px;
                font-weight: 700;
                font-family: monospace;
                background-color: #f3f4f6;
                padding: 4px 8px;
                border-radius: 6px;
                margin: 8px 0 0 0;
                border: 1px solid #e5e7eb;
                letter-spacing: 0.5px;
              }
              @media print {
                body {
                  height: auto;
                }
                .container-etiqueta {
                  border: none;
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="container-etiqueta">
              <div class="qr-box">
                ${conteudoPrint}
              </div>
              <h2 class="titulo-ativo">${nomeAtivo}</h2>
              ${patrimonio ? `<div class="info-linha">Patrimônio: ${patrimonio}</div>` : ''}
              <div class="info-linha">ID: ${ativoId}</div>
              <div class="info-codigo">${codigoQr}</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `)
      telaImpressao.document.close()
    }
  }

  return (
    <>
      {/* Botão de Ação para Visualização */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#246BFD] hover:text-[#1C54D4] transition-colors py-1.5 px-3 rounded-xl bg-[#EBF4FF] hover:bg-[#EBF4FF]/80 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 8.25V4.875zM3.75 14.625c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125V18c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18v-3.375zM13.5 4.875c0-.621.504-1.125 1.125-1.125H18c.621 0 1.125.504 1.125 1.125v3.375c0 .621-.504 1.125-1.125 1.125h-3.375a1.125 1.125 0 01-1.125-1.125V4.875zM13.5 14.625c0-.621.504-1.125 1.125-1.125H18c.621 0 1.125.504 1.125 1.125V18c0 .621-.504 1.125-1.125 1.125h-3.375a1.125 1.125 0 01-1.125-1.125v-3.375z" />
        </svg>
        QR Code do Ativo
      </button>

      {/* Modal */}
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-gray-100/80 space-y-5 animate-[scaleIn_0.2s_ease-out]">
            
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-base font-extrabold text-gray-900 tracking-tight">QR Code do Ativo</h3>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">
                  Etiqueta de Identificação
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
              
              {/* O QR Code real (referência para impressão) */}
              <div ref={qrPrintRef} className="bg-white p-3 rounded-2xl shadow-xs border border-gray-100">
                <QRCodeSVG
                  value={valorQr}
                  size={144}
                  bgColor="#FFFFFF"
                  fgColor="#111827"
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Informações do Ativo */}
              <div className="mt-4 space-y-1 w-full">
                <h4 className="text-sm font-extrabold text-gray-900 leading-tight uppercase px-2 truncate">
                  {nomeAtivo}
                </h4>
                {patrimonio && (
                  <p className="text-[11px] text-gray-500 font-medium">
                    Patrimônio: <span className="font-bold">{patrimonio}</span>
                  </p>
                )}
                <p className="text-[10px] text-gray-400 font-semibold">
                  ID: {ativoId}
                </p>
              </div>

              {/* Código de Backup para digitação manual */}
              <div className="mt-4 w-full bg-white rounded-xl border border-gray-100 p-2.5 flex flex-col items-center gap-1.5 shadow-2xs">
                <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
                  Código para Digitação Manual
                </span>
                <span className="text-xs font-mono font-extrabold text-gray-800 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200/60 tracking-widest break-all select-all">
                  {codigoQr}
                </span>
                
                <button
                  type="button"
                  onClick={handleCopiar}
                  className="text-[10px] font-bold text-[#246BFD] hover:underline flex items-center gap-1 cursor-pointer"
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
              <Botao
                type="button"
                variante="primario"
                larguraTotal
                onClick={handleImprimir}
              >
                Imprimir
              </Botao>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
