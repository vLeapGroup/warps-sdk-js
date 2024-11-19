type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export const CacheKey = {
  Warp: (id: string) => `warp:${id}`,
  RegistryInfo: (id: string) => `registry-info:${id}`,
  Brand: (hash: string) => `brand:${hash}`,
}

export class WarpCache {
  private cache: Map<string, CacheEntry<any>> = new Map()

  set<T>(key: string, value: T, ttl: number): void {
    const expiresAt = Date.now() + ttl * 1000
    this.cache.set(key, { value, expiresAt })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  clear(): void {
    this.cache.clear()
  }
}
