import { CacheType, WarpCache } from './WarpCache'

describe('WarpCache', () => {
  let cacheTypes = ['memory']
  if (typeof window !== 'undefined' && window.localStorage) {
    cacheTypes.push('localStorage')
  }

  cacheTypes.forEach((type) => {
    describe(`${type} cache`, () => {
      let cache: any

      beforeEach(() => {
        cache = new WarpCache(type as CacheType)
        cache.clear()
      })

      it('should set and get a value', () => {
        cache.set('foo', 'bar', 10)
        expect(cache.get('foo')).toBe('bar')
      })

      it('should forget a value', () => {
        cache.set('foo', 'bar', 10)
        cache.forget('foo')
        expect(cache.get('foo')).toBeNull()
      })

      it('should not affect other keys when forgetting', () => {
        cache.set('foo', 'bar', 10)
        cache.set('baz', 'qux', 10)
        cache.forget('foo')
        expect(cache.get('foo')).toBeNull()
        expect(cache.get('baz')).toBe('qux')
      })
    })
  })
})
