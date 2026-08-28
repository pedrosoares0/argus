const supabaseUrl = 'https://ilkqkqzhnlmhoxqavcfp.supabase.co'
const supabaseKey = 'sb_publishable_YdJO-z6DceNNxrixpmVShw_erxkPkKa'

async function inspecionarSignupRaw() {
  const email = `teste_${Date.now()}@gmail.com`
  console.log('--- ENVIANDO FETCH DIRETO PARA /auth/v1/signup ---')
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: 'senhaSegura123',
        data: {
          nome: 'Teste Direto',
          perfil: 'coordenador',
        }
      })
    })

    console.log('HTTP Status:', res.status, res.statusText)
    const text = await res.text()
    console.log('Response body:', text)
  } catch (e) {
    console.error('Fetch error:', e)
  }
}

inspecionarSignupRaw()
