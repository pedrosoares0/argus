import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilkqkqzhnlmhoxqavcfp.supabase.co'
const supabaseKey = 'sb_publishable_YdJO-z6DceNNxrixpmVShw_erxkPkKa'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listarColunasUsuarios() {
  console.log('--- TESTANDO COLUNAS DE USUARIOS ---')
  const { data, error } = await supabase.from('usuarios').select('*').limit(1)
  if (data && data[0]) {
    console.log('Colunas reais presentes em public.usuarios:', Object.keys(data[0]))
  } else {
    console.log('Erro ou vazio:', error)
  }
}

listarColunasUsuarios()
