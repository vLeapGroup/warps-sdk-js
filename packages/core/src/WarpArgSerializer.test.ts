import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  OptionValue,
  StringType,
  StringValue,
  U16Value,
  U32Value,
  U64Value,
  U8Value,
} from '@multiversx/sdk-core/out'
import { WarpArgSerializer } from './WarpArgSerializer'

describe('WarpArgSerializer', () => {
  let serializer: WarpArgSerializer

  beforeEach(() => {
    serializer = new WarpArgSerializer()
  })

  describe('nativeToStrings', () => {
    it('serializes address values', () => {
      const result = serializer.nativeToStrings('address', 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l')
      expect(result).toBe('address:erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l')
    })

    it('serializes boolean values', () => {
      expect(serializer.nativeToStrings('boolean', true)).toBe('boolean:true')
      expect(serializer.nativeToStrings('boolean', false)).toBe('boolean:false')
    })

    it('serializes biguint values', () => {
      const bigValue = BigInt('1234567890')
      expect(serializer.nativeToStrings('biguint', bigValue)).toBe('biguint:1234567890')
    })

    it('serializes uint values', () => {
      expect(serializer.nativeToStrings('uint64', 123)).toBe('uint64:123')
      expect(serializer.nativeToStrings('uint32', 456)).toBe('uint32:456')
      expect(serializer.nativeToStrings('uint16', 789)).toBe('uint16:789')
      expect(serializer.nativeToStrings('uint8', 255)).toBe('uint8:255')
    })

    it('serializes string values', () => {
      expect(serializer.nativeToStrings('string', 'hello')).toBe('string:hello')
    })

    it('serializes hex values', () => {
      expect(serializer.nativeToStrings('hex', '0x1234')).toBe('hex:0x1234')
    })
  })

  describe('nativeToTyped', () => {
    it('converts opt to OptionValue', () => {
      const result = serializer.nativeToTyped('opt:string', 'hello')
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts opt to OptionValue with missing value', () => {
      const result = serializer.nativeToTyped('opt:string', null)
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe(null)
    })

    it('converts string to StringValue', () => {
      const result = serializer.nativeToTyped('string', 'hello')
      expect(result).toBeInstanceOf(StringValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts uint8 to U8Value', () => {
      const result = serializer.nativeToTyped('uint8', 255)
      expect(result).toBeInstanceOf(U8Value)
      expect(result.toString()).toBe('255')
    })

    it('converts uint16 to U16Value', () => {
      const result = serializer.nativeToTyped('uint16', 65535)
      expect(result).toBeInstanceOf(U16Value)
      expect(result.toString()).toBe('65535')
    })

    it('converts uint32 to U32Value', () => {
      const result = serializer.nativeToTyped('uint32', 4294967295)
      expect(result).toBeInstanceOf(U32Value)
      expect(result.toString()).toBe('4294967295')
    })

    it('converts uint64 to U64Value', () => {
      const result = serializer.nativeToTyped('uint64', '18446744073709551615')
      expect(result).toBeInstanceOf(U64Value)
      expect(result.valueOf().toString()).toBe('18446744073709551615')
    })

    it('converts biguint to BigUIntValue', () => {
      const result = serializer.nativeToTyped('biguint', '123456789012345678901234567890')
      expect(result).toBeInstanceOf(BigUIntValue)
      expect(result.valueOf().toFixed()).toBe('123456789012345678901234567890')
    })

    it('converts boolean to BooleanValue', () => {
      const result = serializer.nativeToTyped('boolean', true)
      expect(result).toBeInstanceOf(BooleanValue)
      expect(result.valueOf()).toBe(true)
    })

    it('converts address to AddressValue', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.nativeToTyped('address', address)
      expect(result).toBeInstanceOf(AddressValue)
      expect(result.valueOf()).toBeInstanceOf(Address)
      expect(result.valueOf().bech32()).toBe(address)
    })

    it('converts hex to BytesValue', () => {
      const result = serializer.nativeToTyped('hex', '1234')
      expect(result).toBeInstanceOf(BytesValue)
      const hexValue = Buffer.from(result.valueOf()).toString('hex')
      expect(hexValue).toBe('1234')
    })

    it('throws error for unsupported type', () => {
      expect(() => serializer.nativeToTyped('unsupported' as any, 'value')).toThrow(
        'WarpArgSerializer (nativeToTyped): Unsupported input type: unsupported'
      )
    })
  })

  describe('typedToNative', () => {
    it('converts OptionValue to native value', () => {
      const result = serializer.typedToNative(new OptionValue(new StringType(), StringValue.fromUTF8('abc')))
      expect(result).toEqual(['opt:string', 'abc'])
    })

    it('converts BigUIntValue to biguint', () => {
      const result = serializer.typedToNative(new BigUIntValue(BigInt('123456789012345678901234567890')))
      expect(result).toEqual(['biguint', BigInt('123456789012345678901234567890')])
    })

    it('converts NumericalValue to number', () => {
      const result = serializer.typedToNative(new U64Value(123))
      expect(result).toEqual(['uint64', 123])
    })

    it('converts BytesValue to hex', () => {
      const result = serializer.typedToNative(BytesValue.fromHex('1234'))
      expect(result).toEqual(['hex', '1234'])
    })

    it('converts AddressValue to address', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.typedToNative(new AddressValue(Address.newFromBech32(address)))
      expect(result).toEqual(['address', address])
    })

    it('converts BooleanValue to boolean', () => {
      const result = serializer.typedToNative(new BooleanValue(true))
      expect(result).toEqual(['boolean', true])
    })
  })

  describe('stringToNative', () => {
    it('deserializes address values', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.stringToNative(`address:${address}`)
      expect(result).toEqual(['address', address])
    })

    it('deserializes boolean values', () => {
      expect(serializer.stringToNative('boolean:true')).toEqual(['boolean', true])
      expect(serializer.stringToNative('boolean:false')).toEqual(['boolean', false])
    })

    it('deserializes biguint values', () => {
      const result = serializer.stringToNative('biguint:1234567890')
      expect(result).toEqual(['biguint', BigInt('1234567890')])
    })

    it('deserializes uint values', () => {
      expect(serializer.stringToNative('uint64:123')).toEqual(['uint64', 123])
      expect(serializer.stringToNative('uint32:456')).toEqual(['uint32', 456])
      expect(serializer.stringToNative('uint16:789')).toEqual(['uint16', 789])
      expect(serializer.stringToNative('uint8:255')).toEqual(['uint8', 255])
    })

    it('deserializes string values', () => {
      expect(serializer.stringToNative('string:hello')).toEqual(['string', 'hello'])
    })

    it('deserializes hex values', () => {
      expect(serializer.stringToNative('hex:0x1234')).toEqual(['hex', '0x1234'])
    })
  })

  describe('stringToTyped', () => {
    it('converts string encoded value to StringValue', () => {
      const result = serializer.stringToTyped('string:hello')
      expect(result).toBeInstanceOf(StringValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts uint encoded values to respective UValue types', () => {
      const uint8Result = serializer.stringToTyped('uint8:255')
      expect(uint8Result).toBeInstanceOf(U8Value)
      expect(uint8Result.toString()).toBe('255')

      const uint16Result = serializer.stringToTyped('uint16:65535')
      expect(uint16Result).toBeInstanceOf(U16Value)
      expect(uint16Result.toString()).toBe('65535')

      const uint32Result = serializer.stringToTyped('uint32:4294967295')
      expect(uint32Result).toBeInstanceOf(U32Value)
      expect(uint32Result.toString()).toBe('4294967295')

      const uint64Result = serializer.stringToTyped('uint64:18446744073709551615')
      expect(uint64Result).toBeInstanceOf(U64Value)
      expect(uint64Result.toString()).toBe('18446744073709551615')
    })

    it('converts biguint encoded value to BigUIntValue', () => {
      const result = serializer.stringToTyped('biguint:123456789012345678901234567890')
      expect(result).toBeInstanceOf(BigUIntValue)
      expect(result.valueOf().toFixed()).toBe('123456789012345678901234567890')
    })

    it('converts boolean encoded value to BooleanValue', () => {
      const trueResult = serializer.stringToTyped('boolean:true')
      expect(trueResult).toBeInstanceOf(BooleanValue)
      expect(trueResult.valueOf()).toBe(true)

      const falseResult = serializer.stringToTyped('boolean:false')
      expect(falseResult).toBeInstanceOf(BooleanValue)
      expect(falseResult.valueOf()).toBe(false)
    })

    it('converts address encoded value to AddressValue', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.stringToTyped(`address:${address}`)
      expect(result).toBeInstanceOf(AddressValue)
      expect(result.valueOf()).toBeInstanceOf(Address)
      expect(result.valueOf().bech32()).toBe(address)
    })

    it('converts hex encoded value to BytesValue', () => {
      const result = serializer.stringToTyped('hex:1234')
      expect(result).toBeInstanceOf(BytesValue)
      const hexValue = Buffer.from(result.valueOf()).toString('hex')
      expect(hexValue).toBe('1234')
    })

    it('throws error for unsupported type', () => {
      expect(() => serializer.stringToTyped('unsupported:value')).toThrow(
        'WarpArgSerializer (nativeToTyped): Unsupported input type: unsupported'
      )
    })
  })
})
