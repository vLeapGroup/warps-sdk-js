import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { CacheStrategy } from './CacheStrategy'
import { valueReplacer, valueReviver } from './helpers'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class StaticCacheStrategy implements CacheStrategy {
  private manifestPath: string
  private cache: Map<string, CacheEntry<any>>

  constructor(path?: string) {
    this.manifestPath = path ? resolve(path) : resolve(process.cwd(), 'warps-manifest.json')
    console.log('StaticCacheStrategy path', path)
    console.log('StaticCacheStrategy manifestPath', this.manifestPath)
    console.log('StaticCacheStrategy process.cwd()', process.cwd())
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
}
