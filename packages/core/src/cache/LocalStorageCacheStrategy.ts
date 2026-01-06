import { CacheStrategy } from './CacheStrategy'
import { valueReviver, valueReplacer } from './helpers'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class LocalStorageCacheStrategy implements CacheStrategy {
  private readonly prefix: string

  constructor(prefix = 'warp-cache') {
    this.prefix = prefix
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`
  }

  get<T>(key: string): T | null {
    try {
      const entryStr = localStorage.getItem(this.getKey(key))
      if (!entryStr) return null

      const entry: CacheEntry<T> = JSON.parse(entryStr, valueReviver)
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(this.getKey(key))
        return null
      }

      return entry.value
    } catch {
      return null
    }
  }

  set<T>(key: string, value: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
    }
    localStorage.setItem(this.getKey(key), JSON.stringify(entry, valueReplacer))
  }

  forget(key: string): void {
    localStorage.removeItem(this.getKey(key))
  }

  clear(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        localStorage.removeItem(key)
      }
    }
  }
}
