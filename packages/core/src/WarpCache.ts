import { CacheStrategy } from './cache/CacheStrategy'
import { LocalStorageCacheStrategy } from './cache/LocalStorageCacheStrategy'
import { MemoryCacheStrategy } from './cache/MemoryCacheStrategy'
import { WarpChainEnv } from './types'
import { WarpCacheType } from './types/cache'

export const CacheTtl = {
  OneMinute: 60,
  OneHour: 60 * 60,
  OneDay: 60 * 60 * 24,
  OneWeek: 60 * 60 * 24 * 7,
  OneMonth: 60 * 60 * 24 * 30,
  OneYear: 60 * 60 * 24 * 365,
}

export const WarpCacheKey = {
  Warp: (env: WarpChainEnv, id: string) => `warp:${env}:${id}`,
  WarpAbi: (env: WarpChainEnv, id: string) => `warp-abi:${env}:${id}`,
  WarpExecutable: (env: WarpChainEnv, id: string, action: number) => `warp-exec:${env}:${id}:${action}`,
  RegistryInfo: (env: WarpChainEnv, id: string) => `registry-info:${env}:${id}`,
  Brand: (env: WarpChainEnv, hash: string) => `brand:${env}:${hash}`,
  Asset: (env: WarpChainEnv, chain: string, identifier: string) => `asset:${env}:${chain}:${identifier}`,
}

export class WarpCache {
  private strategy: CacheStrategy

  constructor(type?: WarpCacheType) {
    this.strategy = this.selectStrategy(type)
  }

  private selectStrategy(type?: WarpCacheType): CacheStrategy {
    if (type === 'localStorage') return new LocalStorageCacheStrategy()
    if (type === 'memory') return new MemoryCacheStrategy()

    // Default to localStorage in browser environments
    if (typeof window !== 'undefined' && window.localStorage) return new LocalStorageCacheStrategy()

    return new MemoryCacheStrategy()
  }

  set<T>(key: string, value: T, ttl: number): void {
    this.strategy.set(key, value, ttl)
  }

  get<T>(key: string): T | null {
    return this.strategy.get(key)
  }

  forget(key: string): void {
    this.strategy.forget(key)
  }

  clear(): void {
    this.strategy.clear()
  }
}
