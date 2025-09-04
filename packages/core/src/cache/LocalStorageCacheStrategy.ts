import { WarpSerializer } from '../WarpSerializer'
import { WarpInputTypes } from '../constants'
import { CacheStrategy } from './CacheStrategy'

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

const serializer = new WarpSerializer()

// JSON replacer for value serialization (handles BigInts and other special types)
const valueReplacer = (key: string, value: any): any => {
  if (typeof value === 'bigint') return serializer.nativeToString('biguint', value)
  return value
}

// JSON reviver for value deserialization (handles BigInts and other special types)
const valueReviver = (key: string, value: any): any => {
  if (typeof value === 'string') {
    if (value.startsWith(WarpInputTypes.Biguint + ':')) return serializer.stringToNative(value)[1]
  }
  return value
}
