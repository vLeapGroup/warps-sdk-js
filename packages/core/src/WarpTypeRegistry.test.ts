import { WarpTypeRegistryImpl } from './WarpTypeRegistry'

describe('WarpTypeRegistryImpl', () => {
  let registry: WarpTypeRegistryImpl

  beforeEach(() => {
    registry = new WarpTypeRegistryImpl()
  })

  describe('registerType', () => {
    it('should register a new type successfully', () => {
      const handler = {
        stringToNative: (value: string) => value,
        nativeToString: (value: any) => `token:${value}`,
      }

      expect(() => registry.registerType('token', handler)).not.toThrow()
      expect(registry.hasType('token')).toBe(true)
      expect(registry.getHandler('token')).toBe(handler)
    })

    it('should override existing registration', () => {
      const handler1 = {
        stringToNative: (value: string) => value,
        nativeToString: (value: any) => `token:${value}`,
      }

      const handler2 = {
        stringToNative: (value: string) => value.toUpperCase(),
        nativeToString: (value: any) => `TOKEN:${value}`,
      }

      registry.registerType('token', handler1)
      expect(registry.hasType('token')).toBe(true)
      expect(registry.getHandler('token')).toBe(handler1)

      registry.registerType('token', handler2)
      expect(registry.hasType('token')).toBe(true)
      expect(registry.getHandler('token')).toBe(handler2)
    })

    it('should return all registered types', () => {
      const handler = {
        stringToNative: (value: string) => value,
        nativeToString: (value: any) => `token:${value}`,
      }

      registry.registerType('token', handler)
      registry.registerType('codemeta', handler)

      const registeredTypes = registry.getRegisteredTypes()
      expect(registeredTypes).toContain('token')
      expect(registeredTypes).toContain('codemeta')
      expect(registeredTypes).toHaveLength(2)
    })

    it('should return undefined for non-existent handler', () => {
      expect(registry.getHandler('nonexistent')).toBeUndefined()
    })

    it('should return false for non-existent type', () => {
      expect(registry.hasType('nonexistent')).toBe(false)
    })
  })
})
