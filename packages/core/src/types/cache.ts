export type ClientCacheConfig = {
  ttl?: number
  type?: WarpCacheType
}

export type WarpCacheType = 'memory' | 'localStorage'

export type WarpCache = {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}
