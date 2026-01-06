import { existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import { FileSystemCacheStrategy } from './FileSystemCacheStrategy'

describe('FileSystemCacheStrategy', () => {
  let cacheDir: string
  let strategy: FileSystemCacheStrategy

  beforeEach(() => {
    const testCacheRoot = resolve(process.cwd(), '.test-cache')
    if (!existsSync(testCacheRoot)) {
      mkdirSync(testCacheRoot, { recursive: true })
    }
    cacheDir = join(testCacheRoot, 'filesystem-cache-' + Date.now())
    strategy = new FileSystemCacheStrategy('devnet', { path: cacheDir })
  })

  afterEach(() => {
    try {
      if (existsSync(cacheDir)) {
        const files = readdirSync(cacheDir)
        files.forEach((file) => unlinkSync(join(cacheDir, file)))
        rmdirSync(cacheDir)
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should create cache directory if it does not exist', () => {
    expect(existsSync(cacheDir)).toBe(true)
  })

  it('should set and get a value', () => {
    strategy.set('foo', 'bar', 10)
    expect(strategy.get('foo')).toBe('bar')
  })

  it('should return null for non-existent keys', () => {
    expect(strategy.get('nonexistent')).toBeNull()
  })

  it('should forget a value', () => {
    strategy.set('foo', 'bar', 10)
    strategy.forget('foo')
    expect(strategy.get('foo')).toBeNull()
  })

  it('should not affect other keys when forgetting', () => {
    strategy.set('foo', 'bar', 10)
    strategy.set('baz', 'qux', 10)
    strategy.forget('foo')
    expect(strategy.get('foo')).toBeNull()
    expect(strategy.get('baz')).toBe('qux')
  })

  it('should clear all values', () => {
    strategy.set('foo', 'bar', 10)
    strategy.set('baz', 'qux', 10)
    strategy.clear()
    expect(strategy.get('foo')).toBeNull()
    expect(strategy.get('baz')).toBeNull()
  })

  it('should expire values after TTL', (done) => {
    strategy.set('foo', 'bar', 1) // 1 second TTL
    expect(strategy.get('foo')).toBe('bar')
    setTimeout(() => {
      expect(strategy.get('foo')).toBeNull()
      done()
    }, 1100)
  })

  it('should handle BigInt values', () => {
    const bigValue = BigInt('12345678901234567890')
    strategy.set('bigint', bigValue, 10)
    const retrieved = strategy.get<bigint>('bigint')
    expect(retrieved).toBe(bigValue)
  })

  it('should handle complex objects', () => {
    const obj = {
      string: 'test',
      number: 42,
      bool: true,
      nested: { value: 'nested' },
      array: [1, 2, 3],
    }
    strategy.set('complex', obj, 10)
    const retrieved = strategy.get<typeof obj>('complex')
    expect(retrieved).toEqual(obj)
  })

  it('should sanitize keys to be filesystem-safe', () => {
    strategy.set('key/with/slashes', 'value1', 10)
    strategy.set('key:with:colons', 'value2', 10)
    strategy.set('key with spaces', 'value3', 10)
    expect(strategy.get('key/with/slashes')).toBe('value1')
    expect(strategy.get('key:with:colons')).toBe('value2')
    expect(strategy.get('key with spaces')).toBe('value3')
  })

  it('should use default cache directory when not provided', () => {
    const defaultStrategy = new FileSystemCacheStrategy('devnet')
    expect(defaultStrategy).toBeDefined()
    defaultStrategy.clear()
  })

  it('should handle errors gracefully when reading invalid files', () => {
    // Create an invalid JSON file
    const invalidPath = join(cacheDir, 'invalid.json')
    require('fs').writeFileSync(invalidPath, 'invalid json')
    // Should not throw, just return null
    expect(() => strategy.get('invalid')).not.toThrow()
  })
})
