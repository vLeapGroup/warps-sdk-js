import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  CodeMetadata,
  CodeMetadataValue,
  CompositeValue,
  List,
  NothingValue,
  OptionalValue,
  OptionValue,
  StringValue,
  TokenIdentifierValue,
  U16Value,
  U32Value,
  U64Value,
  U8Value,
  VariadicValue,
} from '@multiversx/sdk-core/out'
import {
  address,
  biguint,
  boolean,
  codemeta,
  composite,
  hex,
  list,
  nothing,
  option,
  optional,
  string,
  token,
  u16,
  u32,
  u64,
  u8,
  variadic,
} from './utils.codec'

describe('Codec Utilities', () => {
  describe('option', () => {
    it('creates an OptionValue with value', () => {
      const stringValue = string('hello')
      const result = option(stringValue)
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('creates an OptionValue with missing value', () => {
      const result = option(null)
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.isSet()).toBe(false)
    })
  })

  describe('optional', () => {
    it('creates an OptionalValue with value', () => {
      const stringValue = string('hello')
      const result = optional(stringValue)
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('creates an OptionalValue with missing value', () => {
      const result = optional(null)
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.isSet()).toBe(false)
    })
  })

  describe('list', () => {
    it('creates a List', () => {
      const stringValue1 = string('hello')
      const stringValue2 = string('world')
      const result = list([stringValue1, stringValue2])
      expect(result).toBeInstanceOf(List)
      expect(result.getItems()[0]).toBeInstanceOf(StringValue)
      expect(result.getItems()[0].valueOf()).toBe('hello')
      expect(result.getItems()[1]).toBeInstanceOf(StringValue)
      expect(result.getItems()[1].valueOf()).toBe('world')
    })
  })

  describe('variadic', () => {
    it('creates a VariadicValue', () => {
      const stringValue1 = string('hello')
      const stringValue2 = string('world')
      const result = variadic([stringValue1, stringValue2])
      expect(result).toBeInstanceOf(VariadicValue)
      expect(result.getItems()[0]).toBeInstanceOf(StringValue)
      expect(result.getItems()[0].valueOf()).toBe('hello')
      expect(result.getItems()[1]).toBeInstanceOf(StringValue)
      expect(result.getItems()[1].valueOf()).toBe('world')
    })
  })

  describe('composite', () => {
    it('creates a CompositeValue', () => {
      const stringValue = string('hello')
      const u64Value = u64(BigInt('12345678901234567890'))
      const result = composite([stringValue, u64Value])
      expect(result).toBeInstanceOf(CompositeValue)
      expect(result.getItems()[0]).toBeInstanceOf(StringValue)
      expect(result.getItems()[0].valueOf()).toBe('hello')
      expect(result.getItems()[1]).toBeInstanceOf(U64Value)
      expect(result.getItems()[1].valueOf().toString()).toBe('12345678901234567890')
    })
  })

  describe('string', () => {
    it('creates a StringValue', () => {
      const result = string('hello')
      expect(result).toBeInstanceOf(StringValue)
      expect(result.valueOf()).toBe('hello')
    })
  })

  describe('u8', () => {
    it('creates a U8Value', () => {
      const result = u8(255)
      expect(result).toBeInstanceOf(U8Value)
      expect(result.toString()).toBe('255')
    })
  })

  describe('u16', () => {
    it('creates a U16Value', () => {
      const result = u16(65535)
      expect(result).toBeInstanceOf(U16Value)
      expect(result.toString()).toBe('65535')
    })
  })

  describe('u32', () => {
    it('creates a U32Value', () => {
      const result = u32(4294967295)
      expect(result).toBeInstanceOf(U32Value)
      expect(result.toString()).toBe('4294967295')
    })
  })

  describe('u64', () => {
    it('creates a U64Value', () => {
      const bigIntValue = BigInt('18446744073709551615')
      const result = u64(bigIntValue)
      expect(result).toBeInstanceOf(U64Value)
      expect(result.valueOf().toString()).toBe(bigIntValue.toString())
    })
  })

  describe('biguint', () => {
    it('creates a BigUIntValue', () => {
      const bigValue = BigInt('123456789012345678901234567890')
      const result = biguint(bigValue)
      expect(result).toBeInstanceOf(BigUIntValue)
      expect(result.valueOf().toFixed()).toBe(bigValue.toString())
    })
  })

  describe('boolean', () => {
    it('creates a BooleanValue', () => {
      const resultTrue = boolean(true)
      expect(resultTrue).toBeInstanceOf(BooleanValue)
      expect(resultTrue.valueOf()).toBe(true)

      const resultFalse = boolean(false)
      expect(resultFalse).toBeInstanceOf(BooleanValue)
      expect(resultFalse.valueOf()).toBe(false)
    })
  })

  describe('address', () => {
    it('creates an AddressValue', () => {
      const addrStr = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = address(addrStr)
      expect(result).toBeInstanceOf(AddressValue)
      expect(result.valueOf()).toBeInstanceOf(Address)
      expect(result.valueOf().bech32()).toBe(addrStr)
    })
  })

  describe('token', () => {
    it('creates a TokenIdentifierValue', () => {
      const result = token('1234')
      expect(result).toBeInstanceOf(TokenIdentifierValue)
      expect(result.valueOf()).toBe('1234')
    })
  })

  describe('hex', () => {
    it('creates a BytesValue', () => {
      const hexString = '1234'
      const result = hex(hexString)
      expect(result).toBeInstanceOf(BytesValue)
      const hexValue = Buffer.from(result.valueOf()).toString('hex')
      expect(hexValue).toBe(hexString)
    })
  })

  describe('codemeta', () => {
    it('creates a CodeMetadataValue', () => {
      const hexString = '0106'
      const result = codemeta(hexString)
      expect(result).toBeInstanceOf(CodeMetadataValue)
      expect(result.valueOf()).toBeInstanceOf(CodeMetadata)
      expect(result.valueOf().toBuffer().toString('hex')).toBe(hexString)
    })
  })

  describe('nothing', () => {
    it('creates a NothingValue', () => {
      const result = nothing()
      expect(result).toBeInstanceOf(NothingValue)
    })
  })
})
