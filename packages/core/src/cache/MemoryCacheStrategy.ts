import { CacheStrategy } from './CacheStrategy'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class MemoryCacheStrategy implements CacheStrategy {
  private cache: Map<string, CacheEntry<any>> = new Map()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  set<T>(key: string, value: T, ttl: number): void {
    const expiresAt = Date.now() + ttl * 1000
    this.cache.set(key, { value, expiresAt })
  }

  forget(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}
