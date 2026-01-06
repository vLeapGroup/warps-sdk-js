import { readFileSync } from 'fs'
import { resolve } from 'path'
import { WarpChainEnv } from '../types'
import { ClientCacheConfig } from '../types/cache'
import { WarpLogger } from '../WarpLogger'
import { CacheStrategy } from './CacheStrategy'
import { valueReviver } from './helpers'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class StaticCacheStrategy implements CacheStrategy {
  private cache: Map<string, CacheEntry<any>>

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {
    const manifestPath = config?.path ? resolve(config.path) : resolve(process.cwd(), `warps-manifest-${env}.json`)
    this.cache = this.loadManifest(manifestPath)
  }

  private loadManifest(manifestPath: string): Map<string, CacheEntry<any>> {
    try {
      const data = readFileSync(manifestPath, 'utf-8')
      const cache = new Map(Object.entries(JSON.parse(data, valueReviver))) as Map<string, CacheEntry<any>>
      return cache
    } catch (error) {
      WarpLogger.warn(`StaticCacheStrategy (loadManifest): Failed to load manifest from ${manifestPath}:`, error)
      return new Map()
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.cache.delete(key)
      }
      return null
    }
    return entry.value
  }

  set<T>(key: string, value: T, ttl: number): void {
    const expiresAt = Date.now() + ttl * 1000
    const entry: CacheEntry<T> = { value, expiresAt }
    this.cache.set(key, entry)
  }

  forget(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}
