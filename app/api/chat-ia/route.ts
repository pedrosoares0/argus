import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { criarClienteServidor } from '@/lib/supabase/server'
import { buscarResumoHospital } from '@/lib/ia/coletarDadosHospital'

const SYSTEM_PROMPT = `Você é o assistente inteligente da plataforma Argus — Prontidão Operacional do Centro Cirúrgico.

## Sua Função
- Analisar os dados operacionais REAIS do hospital fornecidos no contexto abaixo.
- Responder com precisão cirúrgica às perguntas do(a) coordenador(a).

## Formatação e Identação das Respostas
1. Estruture a resposta de forma limpa, elegante e bem espaçada.
2. Use tópicos com marcadores (\`• **Título:** Detalhes\`) para listar itens (NCs, salas, inspetores, equipamentos).
3. Nunca retorne blocos densos ou paredes de texto sem parágrafos.
4. Ao citar Não Conformidades, use o código exato (ex: \`NC-2026-E009\`), sua criticidade e o equipamento/local.
5. Seja direto, objetivo e profissional em português brasileiro.`

/**
 * Resolve o usuário autenticado via cookies ou header Authorization.
 */
async function resolverUsuarioAutenticado(request: NextRequest) {
  try {
    const supabase = await criarClienteServidor() as any
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user && !error) {
      return { supabase, user }
    }
  } catch {
    // Cookie auth falhou — segue para bearer token
  }

  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    )
    const { data: { user }, error } = await (supabase as any).auth.getUser(token)
    if (user && !error) {
      return { supabase: supabase as any, user }
    }
  }

  return null
}

const MODELOS_GEMINI = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
]

export async function POST(request: NextRequest) {
  try {
    // 1. Validar se a API Key do Gemini foi configurada
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'SUA_CHAVE_AQUI' || apiKey.trim() === '') {
      return NextResponse.json(
        {
          error: 'Chave GEMINI_API_KEY não configurada no .env.local.',
        },
        { status: 500 }
      )
    }

    // 2. Autenticar usuário
    const auth = await resolverUsuarioAutenticado(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Sessão não autenticada. Faça login no Argus.' },
        { status: 401 }
      )
    }
    const { supabase, user } = auth

    // 3. Verificar permissão de coordenador ou admin
    const { data: profiles } = await supabase
      .from('usuarios')
      .select('id, perfil, hospital_id, nome')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .limit(1)

    const profile = profiles?.[0] || null
    const perfilUsuario = profile?.perfil || user.user_metadata?.perfil || 'coordenador'

    if (perfilUsuario !== 'coordenador' && perfilUsuario !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso restrito ao perfil de Coordenador.' },
        { status: 403 }
      )
    }

    // 4. Obter hospital_id
    const hospitalId = profile?.hospital_id || user.user_metadata?.hospital_id || null

    // 5. Parsear mensagens enviadas pelo chat
    const body = await request.json()
    const { mensagens } = body as {
      mensagens: { role: 'user' | 'model'; content: string }[]
    }

    if (!mensagens || !Array.isArray(mensagens) || mensagens.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma mensagem enviada.' },
        { status: 400 }
      )
    }

    // 6. Buscar dados reais do hospital diretamente do Supabase
    const contextoHospital = await buscarResumoHospital(supabase, hospitalId)

    // Extrair primeiro nome do coordenador autenticado
    const nomeCompleto = profile?.nome || user.user_metadata?.nome_completo || user.user_metadata?.full_name || user.user_metadata?.nome || user.email?.split('@')[0] || ''
    const primeiroNome = nomeCompleto ? nomeCompleto.trim().split(' ')[0] : ''

    // 7. Montar System Prompt completo com os dados reais injetados e personalização
    const systemPromptCompleto = `${SYSTEM_PROMPT}

## Identificação do Usuário
- Nome do(a) Coordenador(a): ${primeiroNome || 'Coordenador(a)'}
- Personalização de Tom: Ocasionalmente e de forma natural (não em todas as frases, mas em momentos oportunos como início de análises ou conclusões), dirija-se a ele(a) pelo primeiro nome (${primeiroNome ? `"${primeiroNome}"` : '"coordenador(a)"'}).

---

# CONTEXTO OPERACIONAL REAL DO HOSPITAL (Extraído do banco de dados neste instante):

${contextoHospital}`

    // 8. Formatar histórico para a API do Gemini
    const historicoGemini = mensagens.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    // 9. Conectar à API REST do Google com fallback de modelo
    let geminiResponse: Response | null = null
    let lastError: string = ''

    for (const modelo of MODELOS_GEMINI) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:streamGenerateContent?alt=sse`
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPromptCompleto }] },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
            contents: historicoGemini,
          }),
        })

        if (res.ok && res.body) {
          geminiResponse = res
          break
        } else {
          const errData = await res.json().catch(() => ({}))
          lastError = errData?.error?.message || `HTTP ${res.status}`
          console.warn(`[Gemini] Falha no modelo ${modelo}:`, lastError)
        }
      } catch (err: any) {
        lastError = err?.message || 'Erro de conexão'
        console.warn(`[Gemini] Erro de rede no modelo ${modelo}:`, lastError)
      }
    }

    if (!geminiResponse || !geminiResponse.body) {
      return NextResponse.json(
        { error: `Falha ao conectar à API do Gemini: ${lastError}` },
        { status: 502 }
      )
    }

    // 10. Transformar SSE da Google para o formato do cliente
    const googleReader = geminiResponse.body.getReader()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = ''
        try {
          while (true) {
            const { done, value } = await googleReader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const jsonStr = line.slice(6).trim()
              if (!jsonStr) continue

              try {
                const parsed = JSON.parse(jsonStr)
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || ''
                if (text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                  )
                }
              } catch {
                // Ignore incomplete json chunks
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err: any) {
          console.error('Erro durante streaming SSE:', err)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: `Erro no streaming: ${err.message}` })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err: any) {
    console.error('Erro na rota chat-ia:', err)
    return NextResponse.json(
      { error: err.message || 'Erro interno ao consultar IA.' },
      { status: 500 }
    )
  }
}
