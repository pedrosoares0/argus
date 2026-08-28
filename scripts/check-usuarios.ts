import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilkqkqzhnlmhoxqavcfp.supabase.co'
const supabaseKey = 'sb_publishable_YdJO-z6DceNNxrixpmVShw_erxkPkKa'

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspecionarTabelaUsuarios() {
  console.log('--- INSPECIONANDO TABELA PUBLIC.USUARIOS ---')
  const { data, error } = await supabase.from('usuarios').select('*').limit(3)
  console.log('Usuarios data:', data)
  console.log('Usuarios error:', error)
}

inspecionarTabelaUsuarios()
