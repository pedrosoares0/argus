/**
 * Cache leve em memória com suporte a Stale-While-Revalidate (SWR)
 * Garante renderização em 0ms no retorno a telas ou troca de abas.
 */

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const memoryCache = new Map<string, CacheEntry<any>>()

// TTL padrão: 3 minutos antes de considerar obsoleto (mas ainda utilizável em SWR)
const DEFAULT_TTL = 3 * 60 * 1000

export const dadosCache = {
  get<T>(key: string): T | null {
    const entry = memoryCache.get(key)
    if (!entry) return null
    return entry.data as T
  },

  isFresh(key: string, ttl = DEFAULT_TTL): boolean {
    const entry = memoryCache.get(key)
    if (!entry) return false
    return Date.now() - entry.timestamp < ttl
  },

  set<T>(key: string, data: T): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    })
  },

  invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      memoryCache.clear()
      return
    }
    for (const key of memoryCache.keys()) {
      if (key.startsWith(keyPrefix)) {
        memoryCache.delete(key)
      }
    }
  },
}
