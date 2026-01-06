import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { CacheStrategy } from './CacheStrategy'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class StaticCacheStrategy implements CacheStrategy {
  private manifestPath: string
  private cache: Map<string, CacheEntry<any>>

  constructor(manifestPath = 'warps-manifest.json') {
    this.manifestPath = resolve(process.cwd(), manifestPath)
    this.cache = this.loadManifest()
  }

  private loadManifest(): Map<string, CacheEntry<any>> {
    try {
      const data = readFileSync(this.manifestPath, 'utf-8')
      const parsed = JSON.parse(data)
      return new Map(Object.entries(parsed))
    } catch (error) {
      return new Map()
    }
  }

  private saveManifest(): void {
    const data = JSON.stringify(Object.fromEntries(this.cache.entries()))
    writeFileSync(this.manifestPath, data, 'utf-8')
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.saveManifest()
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
    if (this.cache.has(key)) {
      this.cache.delete(key)
      this.saveManifest()
    }
  }

  clear(): void {
    this.cache.clear()
    this.saveManifest()
  }
}
