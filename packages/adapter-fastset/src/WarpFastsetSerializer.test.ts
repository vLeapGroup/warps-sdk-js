import { WarpFastsetSerializer } from './WarpFastsetSerializer'

describe('WarpFastsetSerializer', () => {
  let serializer: WarpFastsetSerializer

  beforeEach(() => {
    serializer = new WarpFastsetSerializer()
  })

  describe('typedToString', () => {
    it('should serialize string values', () => {
      expect(serializer.typedToString('hello')).toBe('string:hello')
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
      expect(serializer.typedToString(BigInt(123))).toBe('bigint:123')
      expect(serializer.typedToString(BigInt(0))).toBe('bigint:0')
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
      const obj = { key: 'value' }
      expect(serializer.typedToString(obj)).toBe('string:[object Object]')
    })
  })

  describe('stringToTyped', () => {
    it('should deserialize string values', () => {
      expect(serializer.stringToTyped('string:hello')).toBe('hello')
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
      expect(serializer.stringToTyped('bigint:123')).toBe(BigInt(123))
      expect(serializer.stringToTyped('bigint:0')).toBe(BigInt(0))
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
      expect(serializer.stringToTyped('hello')).toBe('hello')
      expect(serializer.stringToTyped('123')).toBe('123')
    })
  })

  describe('typedToNative', () => {
    it('should convert string to native', () => {
      const [type, value] = serializer.typedToNative('hello')
      expect(type).toBe('string')
      expect(value).toBe('hello')
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
      expect(type).toBe('bigint')
      expect(value).toBe(BigInt(123))
    })

    it('should handle unknown types', () => {
      const [type, value] = serializer.typedToNative({ key: 'value' })
      expect(type).toBe('string')
      expect(value).toBe('[object Object]')
    })
  })

  describe('nativeToTyped', () => {
    it('should convert string type', () => {
      expect(serializer.nativeToTyped('string', 'hello')).toBe('hello')
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
      expect(serializer.nativeToTyped('bigint', BigInt(123))).toBe(BigInt(123))
      expect(serializer.nativeToTyped('bigint', '123')).toBe(BigInt(123))
    })

    it('should handle unknown types', () => {
      expect(serializer.nativeToTyped('unknown', 'value')).toBe('value')
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
      expect(serializer.nativeToType('bigint')).toBe('bigint')
    })

    it('should handle unknown types', () => {
      expect(serializer.nativeToType('unknown')).toBe('string')
    })
  })
})
