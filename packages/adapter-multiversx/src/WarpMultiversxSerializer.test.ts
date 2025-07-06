import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  CodeMetadata,
  CodeMetadataValue,
  CompositeType,
  CompositeValue,
  List,
  ListType,
  NothingValue,
  OptionalType,
  OptionalValue,
  OptionType,
  OptionValue,
  StringType,
  StringValue,
  Struct,
  Token,
  TokenIdentifierValue,
  TokenTransfer,
  U16Value,
  U32Value,
  U64Type,
  U64Value,
  U8Value,
  VariadicType,
  VariadicValue,
} from '@multiversx/sdk-core/out'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'
import { esdt } from './utils.codec'

describe('WarpMultiversxSerializer', () => {
  let serializer: WarpMultiversxSerializer

  beforeEach(() => {
    serializer = new WarpMultiversxSerializer()
  })

  describe('typedToString', () => {
    it('converts OptionValue', () => {
      const result = serializer.typedToString(new OptionValue(new StringType(), StringValue.fromUTF8('abc')))
      expect(result).toBe('option:string:abc')
    })

    it('converts OptionalValue', () => {
      const result = serializer.typedToString(new OptionalValue(new StringType(), StringValue.fromUTF8('abc')))
      expect(result).toBe('optional:string:abc')
    })

    it('converts ListValue', () => {
      const result = serializer.typedToString(new List(new StringType(), [StringValue.fromUTF8('abc'), StringValue.fromUTF8('def')]))
      expect(result).toBe('list:string:abc,def')
    })

    it('converts VariadicValue', () => {
      const result = serializer.typedToString(
        new VariadicValue(new VariadicType(new StringType()), [StringValue.fromUTF8('abc'), StringValue.fromUTF8('def')])
      )
      expect(result).toBe('variadic:string:abc,def')
    })

    it('converts CompositeValue', () => {
      const result = serializer.typedToString(
        new CompositeValue(new CompositeType(new StringType(), new U64Type()), [
          StringValue.fromUTF8('abc'),
          new U64Value('12345678901234567890'),
        ])
      )
      expect(result).toBe('composite(string|uint64):abc|12345678901234567890')
    })

    it('converts BigUIntValue to biguint', () => {
      const result = serializer.typedToString(new BigUIntValue(BigInt('123456789012345678901234567890')))
      expect(result).toBe('biguint:123456789012345678901234567890')
    })

    it('converts U8Value to uint8', () => {
      const result = serializer.typedToString(new U8Value(255))
      expect(result).toBe('uint8:255')
    })

    it('converts U16Value to uint16', () => {
      const result = serializer.typedToString(new U16Value(65535))
      expect(result).toBe('uint16:65535')
    })

    it('converts U32Value to uint32', () => {
      const result = serializer.typedToString(new U32Value(4294967295))
      expect(result).toBe('uint32:4294967295')
    })

    it('converts U64Value to uint64', () => {
      const result = serializer.typedToString(new U64Value(BigInt('18446744073709551615')))
      expect(result).toBe('uint64:18446744073709551615')
    })

    it('converts StringValue to string', () => {
      const result = serializer.typedToString(StringValue.fromUTF8('hello'))
      expect(result).toBe('string:hello')
    })

    it('converts BooleanValue to bool', () => {
      const result = serializer.typedToString(new BooleanValue(true))
      expect(result).toBe('bool:true')
    })

    it('converts AddressValue to address', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.typedToString(new AddressValue(Address.newFromBech32(address)))
      expect(result).toBe('address:erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l')
    })

    it('converts TokenIdentifierValue to token', () => {
      const result = serializer.typedToString(new TokenIdentifierValue('1234'))
      expect(result).toBe('token:1234')
    })

    it('converts BytesValue to hex', () => {
      const result = serializer.typedToString(BytesValue.fromHex('1234'))
      expect(result).toBe('hex:1234')
    })

    it('converts CodeMetadataValue to codemeta', () => {
      const result = serializer.typedToString(new CodeMetadataValue(new CodeMetadata(true, false, true, true)))
      expect(result).toBe('codemeta:0106')
    })

    it('converts EsdtTokenPayment Struct to esdt', () => {
      const token = new Token({ identifier: 'AAA-123456', nonce: BigInt(5) })
      const transfer = new TokenTransfer({ token, amount: BigInt(100) })
      const result = serializer.typedToString(esdt(transfer))
      expect(result).toBe('esdt:AAA-123456|5|100')
    })

    it('converts a composite value', () => {
      const result = serializer.typedToString(
        new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('abc'), new U64Value(123)])
      )
      expect(result).toBe('composite(string|uint64):abc|123')
    })

    it('converts nested List of CompositeValue', () => {
      const result = serializer.typedToString(
        new List(new ListType(new CompositeType(new StringType(), new U64Type())), [
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('abc'), new U64Value(123)]),
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('def'), new U64Value(456)]),
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('ghi'), new U64Value(789)]),
        ])
      )
      expect(result).toBe('list:composite(string|uint64):abc|123,def|456,ghi|789')
    })

    it('converts nested VariadicValue of CompositeValue', () => {
      const result = serializer.typedToString(
        new VariadicValue(new VariadicType(new CompositeType(new StringType(), new U64Type())), [
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('abc'), new U64Value(123)]),
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('def'), new U64Value(456)]),
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('ghi'), new U64Value(789)]),
        ])
      )
      expect(result).toBe('variadic:composite(string|uint64):abc|123,def|456,ghi|789')
    })
  })

  describe('nativeToTyped', () => {
    it('converts option to OptionValue', () => {
      const result = serializer.nativeToTyped('option:string', 'hello')
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts option to OptionValue with missing value', () => {
      const result = serializer.nativeToTyped('option:string', null)
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe(null)
    })

    it('converts optional to OptionalValue', () => {
      const result = serializer.nativeToTyped('optional:string', 'hello')
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts optional to OptionalValue with missing value', () => {
      const result = serializer.nativeToTyped('optional:string', null)
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe(null)
    })

    it('converts list to ListValue', () => {
      const result = serializer.nativeToTyped('list:string', 'hello,world')
      const actual = result as List
      expect(actual).toBeInstanceOf(List)
      expect(actual.getItems()[0]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[0].valueOf()).toBe('hello')
      expect(actual.getItems()[1]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[1].valueOf()).toBe('world')
    })

    it('converts variadic to VariadicValue', () => {
      const result = serializer.nativeToTyped('variadic:string', 'hello,world')
      const actual = result as VariadicValue
      expect(actual).toBeInstanceOf(VariadicValue)
      expect(actual.getItems()[0]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[0].valueOf()).toBe('hello')
      expect(actual.getItems()[1]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[1].valueOf()).toBe('world')
    })

    it('converts composite to CompositeValue', () => {
      const result = serializer.nativeToTyped('composite(string|uint64|uint8)', 'hello|12345678901234567890|255')
      const actual = result as CompositeValue
      expect(actual).toBeInstanceOf(CompositeValue)
      expect(actual.getItems()[0]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[0].valueOf()).toBe('hello')
      expect(actual.getItems()[1]).toBeInstanceOf(U64Value)
      expect(actual.getItems()[1].valueOf().toString()).toBe('12345678901234567890')
      expect(actual.getItems()[2]).toBeInstanceOf(U8Value)
      expect(actual.getItems()[2].valueOf().toFixed()).toBe('255')
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

    it('converts bool to BooleanValue', () => {
      const result = serializer.nativeToTyped('bool', true)
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

    it('converts token to TokenIdentifierValue', () => {
      const result = serializer.nativeToTyped('token', '1234')
      expect(result).toBeInstanceOf(TokenIdentifierValue)
      expect(result.valueOf()).toBe('1234')
    })

    it('converts hex to BytesValue', () => {
      const result = serializer.nativeToTyped('hex', '1234')
      expect(result).toBeInstanceOf(BytesValue)
      const hexValue = Buffer.from(result.valueOf()).toString('hex')
      expect(hexValue).toBe('1234')
    })

    it('converts codemeta to CodeMetadataValue', () => {
      const result = serializer.nativeToTyped('codemeta', '0106')
      expect(result).toBeInstanceOf(CodeMetadataValue)
      expect(result.valueOf()).toBeInstanceOf(CodeMetadata)
      expect(result.valueOf().toBuffer().toString('hex')).toBe('0106')
    })

    it('converts esdt to EsdtTokenPayment Struct', () => {
      const result = serializer.nativeToTyped('esdt', 'AAA-123456|5|100') as Struct
      expect(result).toBeInstanceOf(Struct)
      expect(result.getFieldValue('token_identifier').valueOf()).toBe('AAA-123456')
      expect(result.getFieldValue('token_nonce').toString()).toBe('5')
      expect(result.getFieldValue('amount').toString()).toBe('100')
    })

    it('throws error for unsupported type', () => {
      expect(() => serializer.nativeToTyped('unsupported' as any, 'value')).toThrow('Unsupported input type')
    })
  })

  describe('stringToTyped', () => {
    it('converts null to NothingValue', () => {
      const result = serializer.stringToTyped('null')
      expect(result).toBeInstanceOf(NothingValue)
    })

    it('converts option encoded value to OptionValue', () => {
      const result = serializer.stringToTyped('option:string:hello')
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts option encoded value to OptionValue with missing value', () => {
      const result = serializer.stringToTyped('option:string')
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe(null)
    })

    it('converts optional encoded value to OptionalValue', () => {
      const result = serializer.stringToTyped('optional:string:hello')
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts optional encoded value to OptionalValue with missing value', () => {
      const result = serializer.stringToTyped('optional:string')
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe(null)
    })

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

    it('converts bool encoded value to BooleanValue', () => {
      const trueResult = serializer.stringToTyped('bool:true')
      expect(trueResult).toBeInstanceOf(BooleanValue)
      expect(trueResult.valueOf()).toBe(true)

      const falseResult = serializer.stringToTyped('bool:false')
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

    it('converts nested variadic of composite', () => {
      const result = serializer.stringToTyped('variadic:composite(string|uint64):abc|123,def|456,ghi|789') as VariadicValue
      expect(result).toBeInstanceOf(VariadicValue)
      const values = result.getItems()

      const actualFirst = (values[0] as CompositeValue).getItems()
      expect(actualFirst[0].valueOf().toString()).toBe('abc')
      expect(actualFirst[1].toString()).toBe('123')

      const actualSecond = (values[1] as CompositeValue).getItems()
      expect(actualSecond[0].valueOf().toString()).toBe('def')
      expect(actualSecond[1].toString()).toBe('456')

      const actualThird = (values[2] as CompositeValue).getItems()
      expect(actualThird[0].valueOf().toString()).toBe('ghi')
      expect(actualThird[1].toString()).toBe('789')
    })

    it('throws error for unsupported type', () => {
      expect(() => serializer.stringToTyped('unsupported:value')).toThrow('Unsupported input type')
    })
  })

  describe('typeToString', () => {
    it('converts OptionType to option', () => {
      const result = serializer.typeToString(new OptionType(new StringType()))
      expect(result).toBe('option:string')
    })

    it('converts OptionalType to optional', () => {
      const result = serializer.typeToString(new OptionalType(new StringType()))
      expect(result).toBe('optional:string')
    })
  })
})
