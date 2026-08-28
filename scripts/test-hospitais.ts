import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilkqkqzhnlmhoxqavcfp.supabase.co'
const supabaseKey = 'sb_publishable_YdJO-z6DceNNxrixpmVShw_erxkPkKa'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testarHospitais() {
  console.log('--- TESTANDO QUERY NA TABELA HOSPITAIS ---')
  const { data, error } = await supabase.from('hospitais').select('id, nome')
  console.log('Data:', data)
  console.log('Error:', error)
}

testarHospitais()
