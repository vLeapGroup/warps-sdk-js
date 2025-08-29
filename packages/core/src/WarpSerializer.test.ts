import { WarpSerializer } from './WarpSerializer'

describe('WarpSerializer', () => {
  let serializer: WarpSerializer

  beforeEach(() => {
    serializer = new WarpSerializer()
  })

  describe('nativeToString', () => {
    it('serializes address values', () => {
      const result = serializer.nativeToString('address', 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l')
      expect(result).toBe('address:erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l')
    })

    it('serializes bool values', () => {
      expect(serializer.nativeToString('bool', true)).toBe('bool:true')
      expect(serializer.nativeToString('bool', false)).toBe('bool:false')
    })

    it('serializes biguint values', () => {
      const bigValue = BigInt('1234567890')
      expect(serializer.nativeToString('biguint', bigValue)).toBe('biguint:1234567890')
    })

    it('serializes uint values', () => {
      expect(serializer.nativeToString('uint64', 123)).toBe('uint64:123')
      expect(serializer.nativeToString('uint32', 456)).toBe('uint32:456')
      expect(serializer.nativeToString('uint16', 789)).toBe('uint16:789')
      expect(serializer.nativeToString('uint8', 255)).toBe('uint8:255')
    })

    it('serializes string values', () => {
      expect(serializer.nativeToString('string', 'hello')).toBe('string:hello')
    })

    it('serializes hex values', () => {
      expect(serializer.nativeToString('hex', '0x1234')).toBe('hex:0x1234')
    })

    it('serializes token values via type registry', () => {
      // Mock type registry with token handler
      const mockTypeRegistry = {
        hasType: (type: string) => type === 'token',
        getHandler: (type: string) => ({
          stringToNative: (value: string) => value,
          nativeToString: (value: any) => `token:${value}`,
        }),
        registerType: () => {},
        getRegisteredTypes: () => ['token'],
      }
      serializer.setTypeRegistry(mockTypeRegistry as any)
      expect(serializer.nativeToString('token', 'TOKEN-123456')).toBe('token:TOKEN-123456')
    })



    it('serializes asset values', () => {
      const assetValue = { identifier: 'AAA-123456-05', amount: BigInt(100) }
      expect(serializer.nativeToString('asset', assetValue)).toBe('asset:AAA-123456-05|100')
    })
  })

  describe('stringToNative', () => {
    it('deserializes null', () => {
      const result = serializer.stringToNative('null')
      expect(result[0]).toBe('null')
      expect(result[1]).toBe(null)
    })

    it('deserializes option', () => {
      const result = serializer.stringToNative('option:string:hello')
      expect(result[0]).toBe('option:string')
      expect(result[1]).toBe('hello')
    })

    it('deserializes option with missing value', () => {
      const result = serializer.stringToNative('option:string')
      expect(result[0]).toBe('option:string')
      expect(result[1]).toBe(null)
    })

    it('deserializes optional', () => {
      const result = serializer.stringToNative('optional:string:hello')
      expect(result[0]).toBe('optional:string')
      expect(result[1]).toBe('hello')
    })

    it('deserializes optional with missing value', () => {
      const result = serializer.stringToNative('optional:string')
      expect(result[0]).toBe('optional:string')
      expect(result[1]).toBe(null)
    })

    it('deserializes a simple list', () => {
      const result = serializer.stringToNative('list:string:hello,world')
      expect(result[0]).toBe('list:string')
      expect(result[1]).toEqual(['hello', 'world'])
    })

    it('deserializes an empty list', () => {
      const result = serializer.stringToNative('list:string:')
      expect(result[0]).toBe('list:string')
      expect(result[1]).toEqual([])
    })

    it('deserializes a list of composite values', () => {
      const result = serializer.stringToNative('list:composite(string|uint64):hello|123,world|456')
      expect(result[0]).toBe('list:composite(string|uint64)')
      const values = result[1] as [string, BigInt][]
      expect(values[0][0].toString()).toBe('hello')
      expect(values[0][1].toString()).toBe('123')
      expect(values[1][0].toString()).toBe('world')
      expect(values[1][1].toString()).toBe('456')
    })

    it('deserializes a list of composite values', () => {
      const result = serializer.stringToNative('list:composite(string|uint64):hello|123,world|456')
      expect(result[0]).toBe('list:composite(string|uint64)')
      const values = result[1] as [string, BigInt][]
      expect(values[0][0].toString()).toBe('hello')
      expect(values[0][1].toString()).toBe('123')
      expect(values[1][0].toString()).toBe('world')
      expect(values[1][1].toString()).toBe('456')
    })

    it('deserializes a list of empty values', () => {
      const result = serializer.stringToNative('list:composite(string|uint64):')
      expect(result[0]).toBe('list:composite(string|uint64)')
      expect(result[1]).toEqual([])
    })

    it('deserializes variadic of u64', () => {
      const result = serializer.stringToNative('variadic:uint64:123,456,789')
      expect(result[0]).toBe('variadic:uint64')
      const values = result[1] as BigInt[]
      expect(values[0].toString()).toBe('123')
      expect(values[1].toString()).toBe('456')
      expect(values[2].toString()).toBe('789')
    })

    it('deserializes variadic of composite', function () {
      const result = serializer.stringToNative('variadic:composite(string|uint64):abc|123,def|456,ghi|789')

      expect(result[0]).toBe('variadic:composite(string|uint64)')
      const values = result[1] as [string, BigInt][]
      expect(values[0][0].toString()).toBe('abc')
      expect(values[0][1].toString()).toBe('123')
      expect(values[1][0].toString()).toBe('def')
      expect(values[1][1].toString()).toBe('456')
      expect(values[2][0].toString()).toBe('ghi')
      expect(values[2][1].toString()).toBe('789')
    })

    it('deserializes variadic of empty values', () => {
      const result = serializer.stringToNative('variadic:string:')
      expect(result[0]).toBe('variadic:string')
      expect(result[1]).toEqual([])
    })

    it('deserializes composite values', () => {
      const result = serializer.stringToNative('composite(string|uint64):hello|123')
      expect(result[0]).toBe('composite(string|uint64)')
      const values = result[1] as [string, BigInt][]
      expect(values[0].toString()).toBe('hello')
      expect(values[1].toString()).toBe('123')
    })

    it('deserializes string values', () => {
      expect(serializer.stringToNative('string:hello')).toEqual(['string', 'hello'])
    })

    it('deserializes token values via type registry', () => {
      // Mock type registry with token handler
      const mockTypeRegistry = {
        hasType: (type: string) => type === 'token',
        getHandler: (type: string) => ({
          stringToNative: (value: string) => value,
          nativeToString: (value: any) => `token:${value}`,
        }),
        registerType: () => {},
        getRegisteredTypes: () => ['token'],
      }
      serializer.setTypeRegistry(mockTypeRegistry as any)
      expect(serializer.stringToNative('token:TOKEN-123456')).toEqual(['token', 'TOKEN-123456'])
    })

    it('deserializes uint values', () => {
      expect(serializer.stringToNative('uint8:255')).toEqual(['uint8', 255])
      expect(serializer.stringToNative('uint16:789')).toEqual(['uint16', 789])
      expect(serializer.stringToNative('uint32:456')).toEqual(['uint32', 456])
    })

    it('deserializes uint64 values', () => {
      const result = serializer.stringToNative('uint64:1234567890')
      expect(result[0]).toBe('uint64')
      expect(result[1]?.toString()).toBe('1234567890')
    })

    it('deserializes biguint values', () => {
      const result = serializer.stringToNative('biguint:1234567890')
      expect(result[0]).toBe('biguint')
      expect(result[1]?.toString()).toBe('1234567890')
    })

    it('deserializes bool values', () => {
      expect(serializer.stringToNative('bool:true')).toEqual(['bool', true])
      expect(serializer.stringToNative('bool:false')).toEqual(['bool', false])
    })

    it('deserializes address values', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.stringToNative(`address:${address}`)
      expect(result).toEqual(['address', address])
    })

    it('deserializes hex values', () => {
      expect(serializer.stringToNative('hex:0x1234')).toEqual(['hex', '0x1234'])
    })



    it('deserializes asset values', () => {
      const result = serializer.stringToNative('asset:AAA-123456-05|100')
      expect(result[0]).toBe('asset')
      expect(result[1]).toEqual({ identifier: 'AAA-123456-05', amount: BigInt(100) })
    })
  })
})
