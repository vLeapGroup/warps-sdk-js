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
  address_value,
  biguint_value,
  boolean_value,
  codemeta_value,
  composite_value,
  hex_value,
  list_value,
  nothing_value,
  option_value,
  optional_value,
  string_value,
  token_value,
  u16_value,
  u32_value,
  u64_value,
  u8_value,
  variadic_value,
} from './utils.codec-value'

describe('Codec Utilities', () => {
  describe('option value', () => {
    it('creates an OptionValue with value', () => {
      const stringValue = string_value('hello')
      const result = option_value(stringValue)
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('creates an OptionValue with missing value', () => {
      const result = option_value(null)
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.isSet()).toBe(false)
    })
  })

  describe('optional value', () => {
    it('creates an OptionalValue with value', () => {
      const stringValue = string_value('hello')
      const result = optional_value(stringValue)
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('creates an OptionalValue with missing value', () => {
      const result = optional_value(null)
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.isSet()).toBe(false)
    })
  })

  describe('list value', () => {
    it('creates a List', () => {
      const stringValue1 = string_value('hello')
      const stringValue2 = string_value('world')
      const result = list_value([stringValue1, stringValue2])
      expect(result).toBeInstanceOf(List)
      expect(result.getItems()[0]).toBeInstanceOf(StringValue)
      expect(result.getItems()[0].valueOf()).toBe('hello')
      expect(result.getItems()[1]).toBeInstanceOf(StringValue)
      expect(result.getItems()[1].valueOf()).toBe('world')
    })
  })

  describe('variadic value', () => {
    it('creates a VariadicValue', () => {
      const stringValue1 = string_value('hello')
      const stringValue2 = string_value('world')
      const result = variadic_value([stringValue1, stringValue2])
      expect(result).toBeInstanceOf(VariadicValue)
      expect(result.getItems()[0]).toBeInstanceOf(StringValue)
      expect(result.getItems()[0].valueOf()).toBe('hello')
      expect(result.getItems()[1]).toBeInstanceOf(StringValue)
      expect(result.getItems()[1].valueOf()).toBe('world')
    })
  })

  describe('composite value', () => {
    it('creates a CompositeValue', () => {
      const stringValue = string_value('hello')
      const u64Value = u64_value(BigInt('12345678901234567890'))
      const result = composite_value([stringValue, u64Value])
      expect(result).toBeInstanceOf(CompositeValue)
      expect(result.getItems()[0]).toBeInstanceOf(StringValue)
      expect(result.getItems()[0].valueOf()).toBe('hello')
      expect(result.getItems()[1]).toBeInstanceOf(U64Value)
      expect(result.getItems()[1].valueOf().toString()).toBe('12345678901234567890')
    })
  })

  describe('string value', () => {
    it('creates a StringValue', () => {
      const result = string_value('hello')
      expect(result).toBeInstanceOf(StringValue)
      expect(result.valueOf()).toBe('hello')
    })
  })

  describe('u8 value', () => {
    it('creates a U8Value', () => {
      const result = u8_value(255)
      expect(result).toBeInstanceOf(U8Value)
      expect(result.toString()).toBe('255')
    })
  })

  describe('u16 value', () => {
    it('creates a U16Value', () => {
      const result = u16_value(65535)
      expect(result).toBeInstanceOf(U16Value)
      expect(result.toString()).toBe('65535')
    })
  })

  describe('u32 value', () => {
    it('creates a U32Value', () => {
      const result = u32_value(4294967295)
      expect(result).toBeInstanceOf(U32Value)
      expect(result.toString()).toBe('4294967295')
    })
  })

  describe('u64 value', () => {
    it('creates a U64Value', () => {
      const bigIntValue = BigInt('18446744073709551615')
      const result = u64_value(bigIntValue)
      expect(result).toBeInstanceOf(U64Value)
      expect(result.valueOf().toString()).toBe(bigIntValue.toString())
    })
  })

  describe('biguint value       ', () => {
    it('creates a BigUIntValue', () => {
      const bigValue = BigInt('123456789012345678901234567890')
      const result = biguint_value(bigValue)
      expect(result).toBeInstanceOf(BigUIntValue)
      expect(result.valueOf().toFixed()).toBe(bigValue.toString())
    })
  })

  describe('boolean value', () => {
    it('creates a BooleanValue', () => {
      const resultTrue = boolean_value(true)
      expect(resultTrue).toBeInstanceOf(BooleanValue)
      expect(resultTrue.valueOf()).toBe(true)

      const resultFalse = boolean_value(false)
      expect(resultFalse).toBeInstanceOf(BooleanValue)
      expect(resultFalse.valueOf()).toBe(false)
    })
  })

  describe('address value', () => {
    it('creates an AddressValue', () => {
      const addrStr = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = address_value(addrStr)
      expect(result).toBeInstanceOf(AddressValue)
      expect(result.valueOf()).toBeInstanceOf(Address)
      expect(result.valueOf().toBech32()).toBe(addrStr)
    })
  })

  describe('token value', () => {
    it('creates a TokenIdentifierValue', () => {
      const result = token_value('1234')
      expect(result).toBeInstanceOf(TokenIdentifierValue)
      expect(result.valueOf()).toBe('1234')
    })
  })

  describe('hex value', () => {
    it('creates a BytesValue', () => {
      const hexString = '1234'
      const result = hex_value(hexString)
      expect(result).toBeInstanceOf(BytesValue)
      const hexValue = Buffer.from(result.valueOf()).toString('hex')
      expect(hexValue).toBe(hexString)
    })
  })

  describe('codemeta value', () => {
    it('creates a CodeMetadataValue', () => {
      const hexString = '0106'
      const result = codemeta_value(hexString)
      expect(result).toBeInstanceOf(CodeMetadataValue)
      expect(result.valueOf()).toBeInstanceOf(CodeMetadata)
      expect(result.valueOf().toString()).toBe(hexString)
    })
  })

  describe('nothing value', () => {
    it('creates a NothingValue', () => {
      const result = nothing_value()
      expect(result).toBeInstanceOf(NothingValue)
    })
  })
})
