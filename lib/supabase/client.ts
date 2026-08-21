import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

let clienteSupabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function criarClienteSupabase() {
  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  if (!clienteSupabaseInstance) {
    clienteSupabaseInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return clienteSupabaseInstance
}
