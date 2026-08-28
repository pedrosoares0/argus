import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilkqkqzhnlmhoxqavcfp.supabase.co'
const supabaseKey = 'sb_publishable_YdJO-z6DceNNxrixpmVShw_erxkPkKa'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarInsertUsuarios() {
  const randomId = crypto.randomUUID()
  console.log('--- TESTANDO INSERT EM PUBLIC.USUARIOS COM UUID:', randomId)
  const { data, error } = await supabase.from('usuarios').insert({
    id: randomId,
    nome: 'Teste Insert',
    email: `teste_${Date.now()}@teste.com`,
    perfil: 'coordenador',
    hospital_id: 'e632822a-0000-0000-0000-000000000001',
    numero_conselho: '12345'
  }).select()

  console.log('Insert data:', data)
  console.log('Insert error:', error)
}

testarInsertUsuarios()
