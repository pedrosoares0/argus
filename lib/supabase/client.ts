import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

let clienteSupabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Obtém uma instância limpa e nativa de fetch, imune a interferências
 * de extensões do navegador (como Save Image As PNG, tradutores e adblockers)
 * que monkey-patcham o window.fetch e causam 'TypeError: Failed to fetch'.
 */
function obterFetchNativo(): typeof fetch {
  if (typeof window === 'undefined') return fetch
  try {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.documentElement.appendChild(iframe)
    const cleanFetch = iframe.contentWindow?.fetch
    if (cleanFetch) {
      const bound = cleanFetch.bind(window)
      document.documentElement.removeChild(iframe)
      return bound
    }
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
  } catch {
    // Fallback silencioso
  }
  return window.fetch.bind(window)
}

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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: obterFetchNativo(),
        },
      }
    )
  }

  return clienteSupabaseInstance
}
