import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { WarpChainEnv } from '../types'
import { ClientCacheConfig } from '../types/cache'
import { CacheStrategy } from './CacheStrategy'
import { valueReviver, valueReplacer } from './helpers'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

export class FileSystemCacheStrategy implements CacheStrategy {
  private cacheDir: string

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {
    const cacheDir = config?.path
    this.cacheDir = cacheDir ? resolve(cacheDir) : resolve(process.cwd(), '.warp-cache')
    this.ensureCacheDir()
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key to be filesystem-safe
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_')
    return join(this.cacheDir, `${safeKey}.json`)
  }

  get<T>(key: string): T | null {
    try {
      const filePath = this.getFilePath(key)
      if (!existsSync(filePath)) return null

      const data = readFileSync(filePath, 'utf-8')
      const entry: CacheEntry<T> = JSON.parse(data, valueReviver)

      if (Date.now() > entry.expiresAt) {
        unlinkSync(filePath)
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
    const filePath = this.getFilePath(key)
    writeFileSync(filePath, JSON.stringify(entry, valueReplacer), 'utf-8')
  }

  forget(key: string): void {
    try {
      const filePath = this.getFilePath(key)
      if (existsSync(filePath)) {
        unlinkSync(filePath)
      }
    } catch {
      // Ignore errors when deleting
    }
  }

  clear(): void {
    try {
      const files = readdirSync(this.cacheDir)
      files.forEach((file: string) => {
        if (file.endsWith('.json')) {
          unlinkSync(join(this.cacheDir, file))
        }
      })
    } catch {
      // Ignore errors when clearing
    }
  }
}
