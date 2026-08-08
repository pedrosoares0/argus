import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const dados = await request.json()
    const apiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY || ''

    if (!apiKey) {
      console.error('Erro: NEXT_PUBLIC_RESEND_API_KEY não configurada no servidor.')
      return NextResponse.json({ error: 'Resend API Key não configurada no servidor.' }, { status: 500 })
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #e11d48; margin-top: 0;">⚠️ Nova Não Conformidade Aberta (NC)</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">Uma nova Não Conformidade foi registrada pelo inspetor no Sentry.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Detalhes do Ocorrido</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #475569; font-weight: bold; width: 120px;">Ativo:</td>
              <td style="padding: 4px 0; color: #0f172a;">${dados.nomeAtivo}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475569; font-weight: bold;">Local / Sala:</td>
              <td style="padding: 4px 0; color: #0f172a;">${dados.local}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #475569; font-weight: bold;">Criticidade:</td>
              <td style="padding: 4px 0; color: #0f172a;">
                <span style="background-color: ${dados.criticidade === 'critico' ? '#fee2e2' : dados.criticidade === 'importante' ? '#fef3c7' : '#e0f2fe'}; color: ${dados.criticidade === 'critico' ? '#991b1b' : dados.criticidade === 'importante' ? '#92400e' : '#0369a1'}; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                  ${dados.criticidade}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0 4px 0; color: #475569; font-weight: bold; vertical-align: top;">Descrição:</td>
              <td style="padding: 8px 0 4px 0; color: #334155; line-height: 1.4;">${dados.descricao}</td>
            </tr>
          </table>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.5;">Por favor, verifique a fila de atendimento no aplicativo Sentry para iniciar o diagnóstico ou validação.</p>
        
        <div style="text-align: center; margin: 25px 0 10px 0;">
          <a href="https://sentry-clinica.vercel.app/login" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Acessar Sentry</a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 15px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Este é um e-mail automático gerado pelo sistema Sentry.</p>
      </div>
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
