import { CacheStrategy } from './cache/CacheStrategy'
import { LocalStorageCacheStrategy } from './cache/LocalStorageCacheStrategy'
import { MemoryCacheStrategy } from './cache/MemoryCacheStrategy'
import { WarpChain } from './types'

export const CacheTtl = {
  OneMinute: 60,
  OneHour: 60 * 60,
  OneDay: 60 * 60 * 24,
  OneWeek: 60 * 60 * 24 * 7,
  OneMonth: 60 * 60 * 24 * 30,
  OneYear: 60 * 60 * 24 * 365,
}

export const CacheKey = {
  Warp: (id: string) => `warp:${id}`,
  WarpAbi: (id: string) => `warp-abi:${id}`,
  WarpExecutionInputs: (executionHash: string) => `warp-exec-inputs:${executionHash}`,
  RegistryInfo: (id: string) => `registry-info:${id}`,
  Brand: (hash: string) => `brand:${hash}`,
  ChainInfo: (chain: WarpChain) => `chain:${chain}`,
  ChainInfos: () => 'chains',
}

export type CacheType = 'memory' | 'localStorage'

export class WarpCache {
  private strategy: CacheStrategy

  constructor(type?: CacheType) {
    this.strategy = this.selectStrategy(type)
  }

  private selectStrategy(type?: CacheType): CacheStrategy {
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
