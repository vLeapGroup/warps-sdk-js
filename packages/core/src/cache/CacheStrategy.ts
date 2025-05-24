export interface CacheStrategy {
  get<T>(key: string): T | null
  set<T>(key: string, value: T, ttl: number): void
  forget(key: string): void
  clear(): void
}
