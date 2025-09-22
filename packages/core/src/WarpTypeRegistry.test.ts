import { WarpTypeRegistry } from './WarpTypeRegistry'

describe('WarpTypeRegistryImpl', () => {
  let registry: WarpTypeRegistry

  beforeEach(() => {
    registry = new WarpTypeRegistry()
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

    it('should handle type aliases correctly', () => {
      const vectorHandler = {
        stringToNative: (value: string) => {
          // Mock vector handler
          const [baseType, listValues] = value.split(':', 2)
          const values = listValues ? listValues.split(',') : []
          return values.map((v) => `${baseType}:${v}`)
        },
        nativeToString: (value: any) => {
          // Mock vector handler
          if (!Array.isArray(value)) return 'vector:'
          if (value.length === 0) return 'vector:'
          const firstValue = value[0]
          if (typeof firstValue === 'string' && firstValue.includes(':')) {
            const baseType = firstValue.split(':')[0]
            const values = value.map((v) => v.split(':')[1] || '')
            return `vector:${baseType}:${values.join(',')}`
          }
          return 'vector:'
        },
      }

      // Register the base type
      registry.registerType('vector', vectorHandler)

      // Register an alias
      registry.registerTypeAlias('list', 'vector')

      expect(registry.hasType('vector')).toBe(true)
      expect(registry.hasType('list')).toBe(true)

      const retrievedVectorHandler = registry.getHandler('vector')
      const retrievedListHandler = registry.getHandler('list')

      expect(retrievedVectorHandler).toBe(vectorHandler)
      expect(retrievedListHandler).toBe(vectorHandler) // Should be the same handler

      const registeredTypes = registry.getRegisteredTypes()
      expect(registeredTypes).toContain('vector')
      expect(registeredTypes).toContain('list')
    })

    it('should handle aliases to core types', () => {
      // Register an alias that points to a core type (not in registry)
      registry.registerTypeAlias('list', 'vector')

      expect(registry.hasType('list')).toBe(true)
      expect(registry.getAlias('list')).toBe('vector')
      expect(registry.resolveType('list')).toBe('vector')
      expect(registry.getHandler('list')).toBeUndefined() // No handler since vector is core type

      const registeredTypes = registry.getRegisteredTypes()
      expect(registeredTypes).toContain('list')
    })

    it('should handle chained aliases', () => {
      // Register chained aliases: list -> array -> vector
      registry.registerTypeAlias('list', 'array')
      registry.registerTypeAlias('array', 'vector')

      expect(registry.resolveType('list')).toBe('vector')
      expect(registry.resolveType('array')).toBe('vector')
      expect(registry.resolveType('vector')).toBe('vector') // No alias, returns itself
    })
  })
})
