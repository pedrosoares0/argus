import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const dados = await request.json()
    const apiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY || ''

    if (!apiKey) {
      console.error('Erro: NEXT_PUBLIC_RESEND_API_KEY não configurada no servidor.')
      return NextResponse.json({ error: 'Resend API Key não configurada no servidor.' }, { status: 500 })
    }

    const criticidadeCor = 
      dados.criticidade === 'critico' ? '#FF3B30' :
      dados.criticidade === 'importante' ? '#FF9500' : '#007AFF'

    const criticidadeBg = 
      dados.criticidade === 'critico' ? '#FEF2F2' :
      dados.criticidade === 'importante' ? '#FFFBEB' : '#EFF6FF'

    const criticidadeLabel = 
      dados.criticidade === 'critico' ? 'NC CRÍTICA' :
      dados.criticidade === 'importante' ? 'NC IMPORTANTE' : 'NC INFORMATIVA'

    const temFoto = dados.evidenciaUrl && typeof dados.evidenciaUrl === 'string' && dados.evidenciaUrl.trim() !== '' && !dados.evidenciaUrl.includes('unsplash.com')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px 0; background-color: #F4F6FA; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.03); text-align: left;">
                
                <!-- Header -->
                <div style="padding: 20px 24px; border-bottom: 1px solid #F1F5F9; background-color: #ffffff;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left">
                        <span style="font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">Sentry</span>
                      </td>
                      <td align="right">
                        <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: ${criticidadeBg}; color: ${criticidadeCor}; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; border: 1px solid ${criticidadeCor}30;">
                          ${criticidadeLabel}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Conteúdo -->
                <div style="padding: 24px;">
                  
                  <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px; line-height: 1.2;">
                    Nova Não Conformidade Aberta
                  </h1>
                  <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748B; font-weight: 500;">
                    Uma ocorrência foi registrada durante a inspeção e requer atenção.
                  </p>

                  <!-- Card Detalhes -->
                  <div style="background-color: #F8FAFC; border-radius: 16px; padding: 18px; border: 1px solid #F1F5F9; margin-bottom: 20px;">
                    
                    <div style="margin-bottom: 14px;">
                      <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">ATIVO</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0F172A;">${dados.nomeAtivo}</div>
                    </div>

                    <div>
                      <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">PROBLEMA RELATADO</div>
                      <div style="font-size: 14px; font-weight: 600; color: #1E293B; line-height: 1.5;">${dados.descricao}</div>
                    </div>

                  </div>

                  <!-- Foto de Evidência -->
                  ${temFoto ? `
                  <div style="margin-bottom: 20px;">
                    <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">FOTO DE EVIDÊNCIA</div>
                    <div style="border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0; background-color: #000000;">
                      <img src="${dados.evidenciaUrl}" alt="Evidência NC" style="width: 100%; max-height: 320px; object-fit: cover; display: block;" />
                    </div>
                  </div>
                  ` : ''}

                  <!-- Botão CTA -->
                  <div style="padding-top: 4px; text-align: center;">
                    <a href="https://sentry-clinica.vercel.app/login" style="display: block; width: 100%; padding: 14px 0; background-color: #246BFD; color: #ffffff; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 700; text-align: center; box-shadow: 0 4px 12px rgba(36,107,253,0.25);">
                      Acessar Sentry
                    </a>
                  </div>

                </div>

                <!-- Footer -->
                <div style="padding: 16px 24px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; text-align: center;">
                  <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                    Sentry · Plataforma de Prontidão Operacional do Centro Cirúrgico
                  </p>
                </div>

              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    const destinatarios = ['pedro.ssoares05@icloud.com', 'pedrosoaress365@gmail.com']
    const resultados = []

    for (const to of destinatarios) {
      try {
        console.log(`Enviando email via Resend para: ${to}`)
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            from: 'Sentry <onboarding@resend.dev>',
            to: to,
            subject: `[Sentry] Nova NC Registrada: ${dados.nomeAtivo}`,
            html: htmlContent
          })
        })

        const text = await res.text()
        if (!res.ok) {
          console.error(`Erro de resposta do Resend para ${to}:`, text)
          resultados.push({ to, status: 'erro', details: text })
        } else {
          console.log(`Email enviado com sucesso para ${to}:`, text)
          resultados.push({ to, status: 'sucesso', details: text })
        }
      } catch (err: any) {
        console.error(`Erro de rede do Resend para ${to}:`, err)
        resultados.push({ to, status: 'erro', details: err.message || err })
      }
    }

    return NextResponse.json({ resultados })
  } catch (err: any) {
    console.error('Erro na rota send-email:', err)
    return NextResponse.json({ error: err.message || err }, { status: 500 })
  }
}
