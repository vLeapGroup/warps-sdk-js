import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { StaticCacheStrategy } from './StaticCacheStrategy'

describe('StaticCacheStrategy', () => {
  let manifestPath: string
  let strategy: StaticCacheStrategy

  beforeEach(() => {
    const testCacheRoot = resolve(process.cwd(), '.test-cache')
    if (!existsSync(testCacheRoot)) {
      mkdirSync(testCacheRoot, { recursive: true })
    }
    manifestPath = join(testCacheRoot, 'test-manifest-' + Date.now() + '.json')
    strategy = new StaticCacheStrategy('devnet', { path: manifestPath })
    strategy.clear()
  })

  afterEach(() => {
    try {
      if (existsSync(manifestPath)) {
        unlinkSync(manifestPath)
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should set and get a value in memory', () => {
    strategy.set('foo', 'bar', 10)
    expect(strategy.get('foo')).toBe('bar')
  })

  it('should load values from existing manifest file', () => {
    const testData = { foo: { value: 'bar', expiresAt: Date.now() + 10000 } }
    writeFileSync(manifestPath, JSON.stringify(testData), 'utf-8')
    const newStrategy = new StaticCacheStrategy('devnet', { path: manifestPath })
    expect(newStrategy.get('foo')).toBe('bar')
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

  it('should use default manifest path when not provided', () => {
    const defaultStrategy = new StaticCacheStrategy('devnet')
    expect(defaultStrategy).toBeDefined()
    defaultStrategy.clear()
  })

  it('should handle missing manifest file gracefully', () => {
    const testCacheRoot = resolve(process.cwd(), '.test-cache')
    const nonExistentBasePath = join(testCacheRoot, 'non-existent-manifest.json')
    const newStrategy = new StaticCacheStrategy('devnet', { path: nonExistentBasePath })
    expect(newStrategy.get('foo')).toBeNull()
  })
})
