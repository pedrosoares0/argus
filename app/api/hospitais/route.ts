import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('hospitais')
      .select('id, nome')
      .order('nome')

    if (error) {
      return NextResponse.json({ hospitais: [] }, { status: 200 })
    }

    return NextResponse.json({ hospitais: data || [] })
  } catch (err) {
    return NextResponse.json({ hospitais: [] }, { status: 200 })
  }
}
