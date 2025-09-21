import {
  Address,
  AddressType,
  AddressValue,
  BigUIntType,
  BigUIntValue,
  BooleanType,
  BooleanValue,
  BytesType,
  BytesValue,
  CodeMetadata,
  CodeMetadataType,
  CodeMetadataValue,
  CompositeType,
  CompositeValue,
  Field,
  FieldDefinition,
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
  StructType,
  Token,
  TokenComputer,
  TokenIdentifierType,
  TokenIdentifierValue,
  Type,
  TypedValue,
  U16Type,
  U16Value,
  U32Type,
  U32Value,
  U64Type,
  U64Value,
  U8Type,
  U8Value,
  VariadicType,
  VariadicValue,
} from '@multiversx/sdk-core'
import {
  AdapterWarpSerializer,
  BaseWarpActionInputType,
  WarpActionInputType,
  WarpAdapterGenericType,
  WarpNativeValue,
  WarpSerializer,
} from '@vleap/warps'
import { WarpConstants, WarpInputTypes } from '../../core/src/constants'
import { WarpMultiversxInputTypes } from './constants'
import { getNormalizedTokenIdentifier, isNativeToken } from './helpers/general'

const SplitParamsRegex = new RegExp(`${WarpConstants.ArgParamsSeparator}(.*)`)

export class WarpMultiversxSerializer implements AdapterWarpSerializer {
  public readonly coreSerializer: WarpSerializer

  constructor() {
    this.coreSerializer = new WarpSerializer()
  }

  typedToString(value: TypedValue): string {
    const type = value.getType()
    if (type.hasExactClass(OptionType.ClassName) || value.hasClassOrSuperclass(OptionValue.ClassName)) {
      if (!(value as OptionValue).isSet()) return WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + 'null'
      const result = this.typedToString((value as OptionValue).getTypedValue())
      return WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + result
    }
    if (type.hasExactClass(VariadicType.ClassName) || value.hasClassOrSuperclass(VariadicValue.ClassName)) {
      const items = (value as VariadicValue).getItems()
      const types = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[0]) as BaseWarpActionInputType[]
      const type = types[0] as BaseWarpActionInputType
      const values = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[1]) as WarpNativeValue[]
      return (
        WarpInputTypes.Vector +
        WarpConstants.ArgParamsSeparator +
        type +
        WarpConstants.ArgParamsSeparator +
        values.join(WarpConstants.ArgListSeparator)
      )
    }
    if (type.hasExactClass(OptionalType.ClassName) || value.hasClassOrSuperclass(OptionalValue.ClassName)) {
      if (!(value as OptionalValue).isSet()) return WarpMultiversxInputTypes.Optional + WarpConstants.ArgParamsSeparator + 'null'
      const result = this.typedToString((value as OptionalValue).getTypedValue())
      return WarpMultiversxInputTypes.Optional + WarpConstants.ArgParamsSeparator + result
    }
    if (type.hasExactClass(ListType.ClassName) || value.hasClassOrSuperclass(List.ClassName)) {
      const items = (value as List).getItems()
      const types = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[0]) as BaseWarpActionInputType[]
      const type = types[0] as BaseWarpActionInputType
      const values = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[1]) as WarpNativeValue[]
      return (
        WarpMultiversxInputTypes.List +
        WarpConstants.ArgParamsSeparator +
        type +
        WarpConstants.ArgParamsSeparator +
        values.join(WarpConstants.ArgListSeparator)
      )
    }
    if (type.hasExactClass(CompositeType.ClassName) || value.hasClassOrSuperclass(CompositeValue.ClassName)) {
      const items = (value as CompositeValue).getItems()
      const types = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[0]) as BaseWarpActionInputType[]
      const values = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[1]) as WarpNativeValue[]
      const rawTypes = types.join(WarpConstants.ArgCompositeSeparator)
      const rawValues = values.join(WarpConstants.ArgCompositeSeparator)
      return `${WarpInputTypes.Tuple}(${rawTypes})${WarpConstants.ArgParamsSeparator}${rawValues}`
    }
    if (
      type.hasExactClass(BigUIntType.ClassName) ||
      value.hasClassOrSuperclass(BigUIntValue.ClassName) ||
      type.getName() === 'BigUint' /* ABI handling */
    )
      return WarpInputTypes.Biguint + WarpConstants.ArgParamsSeparator + BigInt((value as BigUIntValue).valueOf().toFixed())
    if (type.hasExactClass(U8Type.ClassName) || value.hasClassOrSuperclass(U8Value.ClassName))
      return WarpInputTypes.Uint8 + WarpConstants.ArgParamsSeparator + (value as U8Value).valueOf().toNumber()
    if (type.hasExactClass(U16Type.ClassName) || value.hasClassOrSuperclass(U16Value.ClassName))
      return WarpInputTypes.Uint16 + WarpConstants.ArgParamsSeparator + (value as U16Value).valueOf().toNumber()
    if (type.hasExactClass(U32Type.ClassName) || value.hasClassOrSuperclass(U32Value.ClassName))
      return WarpInputTypes.Uint32 + WarpConstants.ArgParamsSeparator + (value as U32Value).valueOf().toNumber()
    if (type.hasExactClass(U64Type.ClassName) || value.hasClassOrSuperclass(U64Value.ClassName))
      return WarpInputTypes.Uint64 + WarpConstants.ArgParamsSeparator + BigInt((value as U64Value).valueOf().toFixed())
    if (type.hasExactClass(StringType.ClassName) || value.hasClassOrSuperclass(StringValue.ClassName))
      return WarpInputTypes.String + WarpConstants.ArgParamsSeparator + (value as StringValue).valueOf()
    if (type.hasExactClass(BooleanType.ClassName) || value.hasClassOrSuperclass(BooleanValue.ClassName))
      return WarpInputTypes.Bool + WarpConstants.ArgParamsSeparator + (value as BooleanValue).valueOf()
    if (type.hasExactClass(AddressType.ClassName) || value.hasClassOrSuperclass(AddressValue.ClassName))
      return WarpInputTypes.Address + WarpConstants.ArgParamsSeparator + (value as AddressValue).valueOf().toBech32()
    if (type.hasExactClass(BytesType.ClassName) || value.hasClassOrSuperclass(BytesValue.ClassName))
      return WarpInputTypes.Hex + WarpConstants.ArgParamsSeparator + (value as BytesValue).valueOf().toString('hex')
    if (type.getName() === 'EsdtTokenPayment') {
      const identifier = (value as Struct).getFieldValue('token_identifier').valueOf()
      const nonce = (value as Struct).getFieldValue('token_nonce').valueOf()
      const amount = (value as Struct).getFieldValue('amount').valueOf()
      const tokenComputer = new TokenComputer()
      const tokenIdentifier = tokenComputer.computeExtendedIdentifier(new Token({ identifier, nonce: BigInt(nonce) }))
      return WarpInputTypes.Asset + WarpConstants.ArgParamsSeparator + tokenIdentifier + WarpConstants.ArgCompositeSeparator + amount
    }
    if (type.hasExactClass(TokenIdentifierType.ClassName) || value.hasClassOrSuperclass(TokenIdentifierValue.ClassName))
      return WarpMultiversxInputTypes.Token + WarpConstants.ArgParamsSeparator + (value as TokenIdentifierValue).valueOf()
    if (type.hasExactClass(CodeMetadataType.ClassName) || value.hasClassOrSuperclass(CodeMetadataValue.ClassName))
      return WarpMultiversxInputTypes.CodeMeta + WarpConstants.ArgParamsSeparator + (value as CodeMetadataValue).valueOf().toString()

    throw new Error(`WarpArgSerializer (typedToString): Unsupported input type: ${value.getClassName()}`)
  }

  typedToNative(value: TypedValue): [WarpActionInputType, WarpNativeValue] {
    const stringValue = this.typedToString(value)
    return this.coreSerializer.stringToNative(stringValue)
  }

  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): TypedValue {
    const stringValue = this.coreSerializer.nativeToString(type, value)
    return this.stringToTyped(stringValue)
  }

  nativeToType(type: BaseWarpActionInputType): WarpAdapterGenericType {
    if (type.startsWith(WarpInputTypes.Tuple)) {
      const rawTypes = type.match(/\(([^)]+)\)/)?.[1] as BaseWarpActionInputType
      return new CompositeType(
        ...rawTypes.split(WarpConstants.ArgCompositeSeparator).map((t) => this.nativeToType(t as BaseWarpActionInputType))
      )
    }
    if (type === WarpInputTypes.String) return new StringType()
    if (type === WarpInputTypes.Uint8) return new U8Type()
    if (type === WarpInputTypes.Uint16) return new U16Type()
    if (type === WarpInputTypes.Uint32) return new U32Type()
    if (type === WarpInputTypes.Uint64) return new U64Type()
    if (type === WarpInputTypes.Biguint) return new BigUIntType()
    if (type === WarpInputTypes.Bool) return new BooleanType()
    if (type === WarpInputTypes.Address) return new AddressType()
    if (type === WarpInputTypes.Hex) return new BytesType()
    if (type === WarpInputTypes.Asset)
      return new StructType('EsdtTokenPayment', [
        new FieldDefinition('token_identifier', '', new TokenIdentifierType()),
        new FieldDefinition('token_nonce', '', new U64Type()),
        new FieldDefinition('amount', '', new BigUIntType()),
      ])

    if (type === WarpMultiversxInputTypes.Token) return new TokenIdentifierType()
    if (type === WarpMultiversxInputTypes.CodeMeta) return new CodeMetadataType()

    throw new Error(`WarpArgSerializer (nativeToType): Unsupported input type: ${type}`)
  }

  stringToTyped(value: string): TypedValue {
    const [type, val] = value.split(/:(.*)/, 2) as [WarpActionInputType, string]

    if (type === WarpInputTypes.Option) {
      const baseValue = this.stringToTyped(val)
      return baseValue instanceof NothingValue ? OptionValue.newMissingTyped(baseValue.getType()) : OptionValue.newProvided(baseValue)
    }
    if (type === WarpInputTypes.Vector) {
      const [baseType, listValues] = val.split(SplitParamsRegex, 2) as [BaseWarpActionInputType, string]
      const values = listValues.split(WarpConstants.ArgListSeparator)
      const typedValues = values.map((v) => this.stringToTyped(`${baseType}:${v}`))
      return new VariadicValue(new VariadicType(this.nativeToType(baseType)), typedValues)
    }
    if (type.startsWith(WarpInputTypes.Tuple)) {
      const baseType = type.match(/\(([^)]+)\)/)?.[1] as BaseWarpActionInputType
      const rawValues = (val as string).split(WarpConstants.ArgCompositeSeparator)
      const rawTypes = baseType.split(WarpConstants.ArgCompositeSeparator) as BaseWarpActionInputType[]
      const values = rawValues.map((val, i) => this.stringToTyped(rawTypes[i] + WarpConstants.ArgParamsSeparator + val))
      const types = values.map((v) => v.getType())
      return new CompositeValue(new CompositeType(...types), values)
    }
    if (type === WarpInputTypes.String) return val ? StringValue.fromUTF8(val as string) : new NothingValue()
    if (type === WarpInputTypes.Uint8) return val ? new U8Value(Number(val)) : new NothingValue()
    if (type === WarpInputTypes.Uint16) return val ? new U16Value(Number(val)) : new NothingValue()
    if (type === WarpInputTypes.Uint32) return val ? new U32Value(Number(val)) : new NothingValue()
    if (type === WarpInputTypes.Uint64) return val ? new U64Value(BigInt(val as string)) : new NothingValue()
    if (type === WarpInputTypes.Biguint) return val ? new BigUIntValue(BigInt(val as string)) : new NothingValue()
    if (type === WarpInputTypes.Bool) return val ? new BooleanValue(typeof val === 'boolean' ? val : val === 'true') : new NothingValue()
    if (type === WarpInputTypes.Address) return val ? new AddressValue(Address.newFromBech32(val as string)) : new NothingValue()
    if (type === WarpInputTypes.Hex) return val ? BytesValue.fromHex(val as string) : new NothingValue()
    if (type === WarpInputTypes.Asset) {
      const [identifier, amount] = val.split(WarpConstants.ArgCompositeSeparator)
      const tokenComputer = new TokenComputer()
      const tokenIdentifier = isNativeToken(identifier)
        ? getNormalizedTokenIdentifier(identifier)
        : tokenComputer.extractIdentifierFromExtendedIdentifier(identifier)
      const nonce = isNativeToken(identifier) ? 0n : tokenComputer.extractNonceFromExtendedIdentifier(identifier)
      return new Struct(this.nativeToType('asset') as StructType, [
        new Field(new TokenIdentifierValue(tokenIdentifier), 'token_identifier'),
        new Field(new U64Value(BigInt(nonce)), 'token_nonce'),
        new Field(new BigUIntValue(BigInt(amount)), 'amount'),
      ])
    }
    if (type === WarpMultiversxInputTypes.Null) {
      return new NothingValue()
    }
    if (type === WarpMultiversxInputTypes.Optional) {
      const baseValue = this.stringToTyped(val)
      return baseValue instanceof NothingValue ? OptionalValue.newMissing() : new OptionalValue(baseValue.getType(), baseValue)
    }
    if (type === WarpMultiversxInputTypes.List) {
      const [baseType, listValues] = val.split(SplitParamsRegex, 2) as [BaseWarpActionInputType, string]
      const values = listValues.split(WarpConstants.ArgListSeparator)
      const typedValues = values.map((v) => this.stringToTyped(baseType + WarpConstants.ArgParamsSeparator + v))
      return new List(this.nativeToType(baseType), typedValues)
    }
    if (type === WarpMultiversxInputTypes.Token) return val ? new TokenIdentifierValue(val as string) : new NothingValue()
    if (type === WarpMultiversxInputTypes.CodeMeta)
      return new CodeMetadataValue(CodeMetadata.newFromBytes(Uint8Array.from(Buffer.from(val as string, 'hex'))))

    throw new Error(`WarpArgSerializer (stringToTyped): Unsupported input type: ${type}`)
  }

  typeToString(type: Type): WarpActionInputType {
    if (type.hasExactClass(OptionType.ClassName))
      return WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + this.typeToString(type.getFirstTypeParameter())
    if (type.hasExactClass(VariadicType.ClassName))
      return WarpInputTypes.Vector + WarpConstants.ArgParamsSeparator + this.typeToString(type.getFirstTypeParameter())
    if (type.hasExactClass(StringType.ClassName)) return WarpInputTypes.String
    if (type.hasExactClass(U8Type.ClassName)) return WarpInputTypes.Uint8
    if (type.hasExactClass(U16Type.ClassName)) return WarpInputTypes.Uint16
    if (type.hasExactClass(U32Type.ClassName)) return WarpInputTypes.Uint32
    if (type.hasExactClass(U64Type.ClassName)) return WarpInputTypes.Uint64
    if (type.hasExactClass(BigUIntType.ClassName)) return WarpInputTypes.Biguint
    if (type.hasExactClass(BooleanType.ClassName)) return WarpInputTypes.Bool
    if (type.hasExactClass(AddressType.ClassName)) return WarpInputTypes.Address
    if (type.hasExactClass(BytesType.ClassName)) return WarpInputTypes.Hex
    if (type.hasExactClass(TokenIdentifierType.ClassName)) return WarpMultiversxInputTypes.Token
    if (type.hasExactClass(OptionalType.ClassName))
      return WarpMultiversxInputTypes.Optional + WarpConstants.ArgParamsSeparator + this.typeToString(type.getFirstTypeParameter())
    if (type.hasExactClass(ListType.ClassName))
      return WarpMultiversxInputTypes.List + WarpConstants.ArgParamsSeparator + this.typeToString(type.getFirstTypeParameter())
    if (type.hasExactClass(CodeMetadataType.ClassName)) return WarpMultiversxInputTypes.CodeMeta
    if (type.hasExactClass(StructType.ClassName) && type.getClassName() === 'EsdtTokenPayment') return WarpInputTypes.Asset

    throw new Error(`WarpArgSerializer (typeToString): Unsupported input type: ${type.getClassName()}`)
  }
}
