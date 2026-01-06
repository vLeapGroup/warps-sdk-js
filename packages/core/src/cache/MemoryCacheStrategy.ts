import { WarpChainEnv } from '../types'
import { ClientCacheConfig } from '../types/cache'
import { CacheStrategy } from './CacheStrategy'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class MemoryCacheStrategy implements CacheStrategy {
  private static cache: Map<string, CacheEntry<any>> = new Map()

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {}

  get<T>(key: string): T | null {
    const entry = MemoryCacheStrategy.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      MemoryCacheStrategy.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  set<T>(key: string, value: T, ttl: number): void {
    const expiresAt = Date.now() + ttl * 1000
    MemoryCacheStrategy.cache.set(key, { value, expiresAt })
  }

  forget(key: string): void {
    MemoryCacheStrategy.cache.delete(key)
  }

  clear(): void {
    MemoryCacheStrategy.cache.clear()
  }
}
