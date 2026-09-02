import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const dados = await request.json()

    // Carregar configurações SMTP do ambiente
    const smtpHost = process.env.SMTP_HOST || ''
    const smtpPortStr = process.env.SMTP_PORT || '587'
    const smtpUser = process.env.SMTP_USER || ''
    const smtpPass = process.env.SMTP_PASS || ''
    const smtpFrom = process.env.SMTP_FROM || 'Primus <alertas@primusclinica.com.br>'

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('Erro: Configurações SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) não configuradas no servidor.')
      return NextResponse.json({ error: 'Configurações SMTP não configuradas no servidor.' }, { status: 500 })
    }

    const smtpPort = parseInt(smtpPortStr, 10) || 587

    const criticidadeCor =
      dados.criticidade === 'critico' ? '#FF3B30' :
        dados.criticidade === 'importante' ? '#FF9500' : '#007AFF'

    const criticidadeBg =
      dados.criticidade === 'critico' ? '#FEF2F2' :
        dados.criticidade === 'importante' ? '#FFFBEB' : '#EFF6FF'

    const criticidadeLabel =
      dados.criticidade === 'critico' ? 'NC CRÍTICA' :
        dados.criticidade === 'importante' ? 'NC IMPORTANTE' : 'NC INFORMATIVA'

    const nomeAtivo = dados.nomeAtivo || 'Equipamento'
    const nomeInspetor = dados.nomeInspetor || 'Inspetor'
    const temFoto = Boolean(dados.evidenciaUrl && typeof dados.evidenciaUrl === 'string' && dados.evidenciaUrl.trim() !== '')

    // Configurar anexos do Nodemailer caso a imagem seja Base64
    const attachments: any[] = []
    if (temFoto && dados.evidenciaUrl.startsWith('data:image/')) {
      try {
        const matches = dados.evidenciaUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/)
        if (matches && matches.length === 3) {
          const ext = matches[1].split('/')[1] || 'png'
          const base64Content = matches[2]
          attachments.push({
            filename: `evidencia_nc.${ext}`,
            content: Buffer.from(base64Content, 'base64')
          })
        }
      } catch (e) {
        console.error('Erro ao processar anexo de imagem:', e)
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&display=swap" rel="stylesheet">
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
                        <span style="font-family: 'Space Grotesk', -apple-system, sans-serif; font-size: 20px; font-weight: 600; color: #0F172A; letter-spacing: -0.5px;">Primus</span>
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
                    Uma ocorrência foi registrada durante a inspeção e requer atenção imediata.
                  </p>

                  <!-- Card Detalhes -->
                  <div style="background-color: #F8FAFC; border-radius: 16px; padding: 18px; border: 1px solid #F1F5F9; margin-bottom: 20px;">
                    
                    <div style="margin-bottom: 14px;">
                      <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">REGISTRADO POR</div>
                      <div style="font-size: 15px; font-weight: 700; color: #0F172A;">${nomeInspetor}</div>
                    </div>

                    <div style="margin-bottom: 14px;">
                      <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">ATIVO</div>
                      <div style="font-size: 16px; font-weight: 700; color: #0F172A;">${nomeAtivo}</div>
                    </div>

                    <div>
                      <div style="font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">PROBLEMA RELATADO</div>
                      <div style="font-size: 14px; font-weight: 600; color: #1E293B; line-height: 1.5;">${dados.descricao}</div>
                    </div>

                  </div>

                  <!-- Botão CTA -->
                  <div style="padding-top: 4px; text-align: center;">
                    <a href="https://primus-clinica.vercel.app/login" style="display: block; width: 100%; padding: 14px 0; background-color: #246BFD; color: #ffffff; border-radius: 9999px; text-decoration: none; font-size: 14px; font-weight: 700; text-align: center; box-shadow: 0 4px 12px rgba(36,107,253,0.25);">
                      Acessar Primus
                    </a>
                  </div>

                </div>

                <!-- Footer -->
                <div style="padding: 16px 24px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9; text-align: center;">
                  <p style="margin: 0; font-size: 11px; color: #94A3B8; font-weight: 500;">
                    Primus · Plataforma de Prontidão Operacional do Centro Cirúrgico
                  </p>
                </div>

              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    const destinatarios = ['pedrosoaress365@gmail.com', 'p.moraisneto@outlook.com']
    if (dados.emailInspetor && typeof dados.emailInspetor === 'string' && dados.emailInspetor.trim() !== '') {
      const emailLimpo = dados.emailInspetor.trim()
      if (!destinatarios.includes(emailLimpo)) {
        destinatarios.push(emailLimpo)
      }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })

    const resultados = []

    for (const to of destinatarios) {
      try {
        console.log(`Enviando e-mail via SMTP/Nodemailer para: ${to}`)
        const mailOptions = {
          from: smtpFrom,
          to: to,
          subject: `[Primus - ${criticidadeLabel}] ${nomeAtivo}`,
          html: htmlContent,
          attachments: attachments
        }

        const info = await transporter.sendMail(mailOptions)
        console.log(`E-mail enviado com sucesso para ${to}:`, info.messageId)
        resultados.push({ to, status: 'sucesso', details: info.messageId })
      } catch (err: any) {
        console.error(`Erro de SMTP para ${to}:`, err)
        resultados.push({ to, status: 'erro', details: err.message || err })
      }
    }

    return NextResponse.json({ resultados })
  } catch (err: any) {
    console.error('Erro na rota send-email:', err)
    return NextResponse.json({ error: err.message || err }, { status: 500 })
  }
}
