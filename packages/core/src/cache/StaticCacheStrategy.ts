import { readFileSync, writeFileSync } from 'fs'
import { extname, resolve } from 'path'
import { WarpChainEnv } from '../types'
import { ClientCacheConfig } from '../types/cache'
import { CacheStrategy } from './CacheStrategy'
import { valueReplacer, valueReviver } from './helpers'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class StaticCacheStrategy implements CacheStrategy {
  private manifestPath: string
  private cache: Map<string, CacheEntry<any>>

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {
    this.manifestPath = this.resolveManifestPath(env, config)
    this.cache = this.loadManifest()
  }

  private loadManifest(): Map<string, CacheEntry<any>> {
    try {
      const data = readFileSync(this.manifestPath, 'utf-8')
      return new Map(Object.entries(JSON.parse(data, valueReviver)))
    } catch {
      return new Map()
    }
  }

  private saveManifest(): void {
    const data = JSON.stringify(Object.fromEntries(this.cache.entries()), valueReplacer)
    writeFileSync(this.manifestPath, data, 'utf-8')
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.cache.delete(key)
        this.saveManifest()
      }
      return null
    }
    return entry.value
  }

  set<T>(key: string, value: T, ttl: number): void {
    const expiresAt = Date.now() + ttl * 1000
    const entry: CacheEntry<T> = { value, expiresAt }
    this.cache.set(key, entry)
    this.saveManifest()
  }

  forget(key: string): void {
    if (this.cache.delete(key)) {
      this.saveManifest()
    }
  }

  clear(): void {
    this.cache.clear()
    this.saveManifest()
  }

  private resolveManifestPath(env: WarpChainEnv, config?: ClientCacheConfig): string {
    const path = config?.path
    if (path) {
      const resolvedPath = resolve(path)
      const ext = extname(resolvedPath)
      const base = ext ? resolvedPath.slice(0, -ext.length) : resolvedPath
      return `${base}-${env}${ext || '.json'}`
    }
    return resolve(process.cwd(), `warps-manifest-${env}.json`)
  }
}
