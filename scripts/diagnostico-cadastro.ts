import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilkqkqzhnlmhoxqavcfp.supabase.co'
const supabaseKey = 'sb_publishable_YdJO-z6DceNNxrixpmVShw_erxkPkKa'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarCadastro() {
  console.log('--- TESTANDO SIGNUP NO SUPABASE ---')
  const emailTeste = `teste_${Date.now()}@gmail.com`
  console.log('Tentando cadastrar:', emailTeste)
  
  const { data, error } = await supabase.auth.signUp({
    email: emailTeste,
    password: 'senhaSegura123',
    options: {
      data: {
        nome: 'Usuario Teste',
        perfil: 'coordenador',
        hospital_id: 'e632822a-0000-0000-0000-000000000001',
        numero_conselho: '123456',
      }
    }
  })

  console.log('Retorno data:', JSON.stringify(data, null, 2))
  console.log('Retorno error:', error)
  if (error) {
    console.log('Error keys:', Object.keys(error))
    console.log('Error status:', error.status)
    console.log('Error name:', error.name)
    console.log('Error message:', error.message)
  }
}

testarCadastro()
