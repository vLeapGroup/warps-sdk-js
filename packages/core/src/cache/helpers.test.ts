import { valueReplacer, valueReviver } from './helpers'

describe('cache helpers', () => {
  describe('valueReplacer', () => {
    it('should serialize BigInt values', () => {
      const obj = { value: BigInt('12345678901234567890') }
      const result = JSON.stringify(obj, valueReplacer)
      const parsed = JSON.parse(result)
      expect(parsed.value).toBe('biguint:12345678901234567890')
    })

    it('should leave non-BigInt values unchanged', () => {
      const obj = { string: 'test', number: 42, bool: true, null: null }
      const result = JSON.stringify(obj, valueReplacer)
      const parsed = JSON.parse(result)
      expect(parsed.string).toBe('test')
      expect(parsed.number).toBe(42)
      expect(parsed.bool).toBe(true)
      expect(parsed.null).toBeNull()
    })

    it('should handle nested objects with BigInt', () => {
      const obj = {
        nested: {
          bigint: BigInt('999999999999999999'),
          regular: 'value',
        },
      }
      const result = JSON.stringify(obj, valueReplacer)
      const parsed = JSON.parse(result)
      expect(parsed.nested.bigint).toBe('biguint:999999999999999999')
      expect(parsed.nested.regular).toBe('value')
    })

    it('should handle arrays with BigInt', () => {
      const obj = { items: [BigInt('1'), BigInt('2'), BigInt('3')] }
      const result = JSON.stringify(obj, valueReplacer)
      const parsed = JSON.parse(result)
      expect(parsed.items).toEqual(['biguint:1', 'biguint:2', 'biguint:3'])
    })
  })

  describe('valueReviver', () => {
    it('should deserialize biguint strings to BigInt', () => {
      const json = '{"value":"biguint:12345678901234567890"}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.value).toBe(BigInt('12345678901234567890'))
    })

    it('should leave non-biguint strings unchanged', () => {
      const json = '{"value":"string:test","number":42}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.value).toBe('string:test')
      expect(parsed.number).toBe(42)
    })

    it('should handle nested objects with biguint', () => {
      const json = '{"nested":{"bigint":"biguint:999999999999999999","regular":"value"}}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.nested.bigint).toBe(BigInt('999999999999999999'))
      expect(parsed.nested.regular).toBe('value')
    })

    it('should handle arrays with biguint strings', () => {
      const json = '{"items":["biguint:1","biguint:2","biguint:3"]}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.items).toEqual([BigInt('1'), BigInt('2'), BigInt('3')])
    })
  })

  describe('round-trip serialization', () => {
    it('should preserve BigInt values through serialize/deserialize', () => {
      const original = {
        bigint: BigInt('12345678901234567890'),
        string: 'test',
        number: 42,
      }
      const serialized = JSON.stringify(original, valueReplacer)
      const deserialized = JSON.parse(serialized, valueReviver)
      expect(deserialized.bigint).toBe(original.bigint)
      expect(deserialized.string).toBe(original.string)
      expect(deserialized.number).toBe(original.number)
    })

    it('should handle complex nested structures', () => {
      const original = {
        level1: {
          level2: {
            bigint: BigInt('98765432109876543210'),
            items: [BigInt('1'), BigInt('2')],
          },
          regular: 'value',
        },
      }
      const serialized = JSON.stringify(original, valueReplacer)
      const deserialized = JSON.parse(serialized, valueReviver)
      expect(deserialized.level1.level2.bigint).toBe(original.level1.level2.bigint)
      expect(deserialized.level1.level2.items).toEqual(original.level1.level2.items)
      expect(deserialized.level1.regular).toBe(original.level1.regular)
    })
  })
})
