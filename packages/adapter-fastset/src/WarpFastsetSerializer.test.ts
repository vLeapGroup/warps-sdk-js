import { WarpFastsetSerializer } from './WarpFastsetSerializer'

describe('WarpFastsetSerializer', () => {
  let serializer: WarpFastsetSerializer

  beforeEach(() => {
    serializer = new WarpFastsetSerializer()
  })

  describe('typedToString', () => {
    it('should serialize string values', () => {
      expect(serializer.typedToString('test')).toBe('string:test')
      expect(serializer.typedToString('')).toBe('string:')
    })

    it('should serialize number values', () => {
      expect(serializer.typedToString(123)).toBe('number:123')
      expect(serializer.typedToString(0)).toBe('number:0')
      expect(serializer.typedToString(-123)).toBe('number:-123')
    })

    it('should serialize boolean values', () => {
      expect(serializer.typedToString(true)).toBe('boolean:true')
      expect(serializer.typedToString(false)).toBe('boolean:false')
    })

    it('should serialize bigint values', () => {
      expect(serializer.typedToString(BigInt(123))).toBe('biguint:123')
      expect(serializer.typedToString(BigInt(0))).toBe('biguint:0')
    })

    it('should serialize array values', () => {
      expect(serializer.typedToString([1, 2, 3])).toBe('array:number:1,number:2,number:3')
      expect(serializer.typedToString(['a', 'b'])).toBe('array:string:a,string:b')
    })

    it('should serialize null and undefined', () => {
      expect(serializer.typedToString(null)).toBe('null:null')
      expect(serializer.typedToString(undefined)).toBe('undefined:undefined')
    })

    it('should handle complex objects', () => {
      const obj = { test: 'value' }
      expect(serializer.typedToString(obj)).toBe('string:[object Object]')
    })
  })

  describe('stringToTyped', () => {
    it('should deserialize string values', () => {
      expect(serializer.stringToTyped('string:test')).toBe('test')
      expect(serializer.stringToTyped('string:')).toBe('')
    })

    it('should deserialize number values', () => {
      expect(serializer.stringToTyped('number:123')).toBe(123)
      expect(serializer.stringToTyped('number:0')).toBe(0)
      expect(serializer.stringToTyped('number:-123')).toBe(-123)
    })

    it('should deserialize boolean values', () => {
      expect(serializer.stringToTyped('boolean:true')).toBe(true)
      expect(serializer.stringToTyped('boolean:false')).toBe(false)
    })

    it('should deserialize bigint values', () => {
      expect(serializer.stringToTyped('biguint:123')).toBe(BigInt(123))
      expect(serializer.stringToTyped('biguint:0')).toBe(BigInt(0))
    })

    it('should deserialize array values', () => {
      expect(serializer.stringToTyped('array:number:1,number:2,number:3')).toEqual([1, 2, 3])
      expect(serializer.stringToTyped('array:string:a,string:b')).toEqual(['a', 'b'])
    })

    it('should deserialize null and undefined', () => {
      expect(serializer.stringToTyped('null:null')).toBe(null)
      expect(serializer.stringToTyped('undefined:undefined')).toBe(undefined)
    })

    it('should handle values without type prefix', () => {
      expect(serializer.stringToTyped('test')).toBe('test')
      expect(serializer.stringToTyped('123')).toBe('123')
    })
  })

  describe('typedToNative', () => {
    it('should convert string to native', () => {
      const [type, value] = serializer.typedToNative('test')
      expect(type).toBe('string')
      expect(value).toBe('test')
    })

    it('should convert number to native', () => {
      const [type, value] = serializer.typedToNative(123)
      expect(type).toBe('number')
      expect(value).toBe(123)
    })

    it('should convert boolean to native', () => {
      const [type, value] = serializer.typedToNative(true)
      expect(type).toBe('boolean')
      expect(value).toBe(true)
    })

    it('should convert bigint to native', () => {
      const [type, value] = serializer.typedToNative(BigInt(123))
      expect(type).toBe('biguint')
      expect(value).toBe('123')
    })

    it('should handle complex objects', () => {
      const obj = { test: 'value' }
      const [type, value] = serializer.typedToNative(obj)
      expect(type).toBe('string')
      expect(value).toBe('[object Object]')
    })
  })

  describe('nativeToTyped', () => {
    it('should convert string type', () => {
      expect(serializer.nativeToTyped('string', 'test')).toBe('test')
      expect(serializer.nativeToTyped('string', 123)).toBe('123')
    })

    it('should convert number type', () => {
      expect(serializer.nativeToTyped('number', 123)).toBe(123)
      expect(serializer.nativeToTyped('number', '123')).toBe(123)
    })

    it('should convert boolean type', () => {
      expect(serializer.nativeToTyped('boolean', true)).toBe(true)
      expect(serializer.nativeToTyped('boolean', 'true')).toBe(true)
    })

    it('should convert bigint type', () => {
      expect(serializer.nativeToTyped('biguint', BigInt(123))).toBe(BigInt(123))
      expect(serializer.nativeToTyped('biguint', '123')).toBe(BigInt(123))
    })

    it('should convert address type', () => {
      expect(serializer.nativeToTyped('address', 'fs1test')).toBe('fs1test')
      expect(serializer.nativeToTyped('address', 123)).toBe('123')
    })

    it('should convert hex type', () => {
      expect(serializer.nativeToTyped('hex', '0x123')).toBe('0x123')
      expect(serializer.nativeToTyped('hex', 123)).toBe('123')
    })

    it('should handle unknown types', () => {
      expect(serializer.nativeToTyped('unknown' as any, 'test')).toBe('test')
    })
  })

  describe('nativeToType', () => {
    it('should map string type', () => {
      expect(serializer.nativeToType('string')).toBe('string')
    })

    it('should map number type', () => {
      expect(serializer.nativeToType('number')).toBe('number')
    })

    it('should map boolean type', () => {
      expect(serializer.nativeToType('boolean')).toBe('boolean')
    })

    it('should map bigint type', () => {
      expect(serializer.nativeToType('biguint')).toBe('biguint')
    })

    it('should map address type', () => {
      expect(serializer.nativeToType('address')).toBe('address')
    })

    it('should map hex type', () => {
      expect(serializer.nativeToType('hex')).toBe('hex')
    })

    it('should handle unknown types', () => {
      expect(serializer.nativeToType('unknown' as any)).toBe('string')
    })
  })
})
