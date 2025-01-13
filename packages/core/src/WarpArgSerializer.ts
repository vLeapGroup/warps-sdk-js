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
  NothingValue,
  NumericalValue,
  OptionalValue,
  OptionValue,
  PrimitiveType,
  StringType,
  StringValue,
  Struct,
  StructType,
  Token,
  TokenIdentifierType,
  TokenIdentifierValue,
  TokenTransfer,
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
} from '@multiversx/sdk-core/out'
import { BaseWarpActionInputType, WarpActionInputType } from './types'

export type WarpNativeValue = string | number | bigint | boolean | null | TokenTransfer

export class WarpArgSerializer {
  nativeToString(type: WarpActionInputType, value: WarpNativeValue): string {
    if (type === 'esdt' && value instanceof TokenTransfer) {
      return `esdt:${value.token.identifier}|${value.token.nonce.toString()}|${value.amount.toString()}`
    }
    return `${type}:${value?.toString() ?? ''}`
  }

  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): TypedValue {
    if (type.startsWith('option:')) {
      const [_, baseTypeRaw] = type.split(':') as ['option', WarpActionInputType]
      const baseValue = this.nativeToTyped(baseTypeRaw, value)
      return value ? OptionValue.newProvided(baseValue) : OptionValue.newMissingTyped(baseValue.getType())
    }
    if (type.startsWith('optional:')) {
      const [_, baseTypeNative] = type.split(':') as ['optional', BaseWarpActionInputType]
      const baseValue = this.nativeToTyped(baseTypeNative, value)
      return value ? new OptionalValue(baseValue.getType(), baseValue) : OptionalValue.newMissing()
    }
    if (type.startsWith('list:')) {
      const [_, baseType] = type.split(':') as ['list', BaseWarpActionInputType]
      const values = (value as string).split(',')
      const typedValues = values.map((val) => this.nativeToTyped(baseType, val))
      return new List(this.nativeToType(baseType), typedValues)
    }
    if (type.startsWith('variadic:')) {
      const [_, baseType] = type.split(':') as ['variadic', WarpActionInputType]
      const values = (value as string).split(',')
      const typedValues = values.map((val) => this.nativeToTyped(baseType, val))
      return new VariadicValue(new VariadicType(new PrimitiveType('Custom')), typedValues)
    }
    if (type.startsWith('composite:')) {
      const [_, baseType] = type.split(':') as ['composite', BaseWarpActionInputType]
      const rawValues = (value as string).split('|')
      const rawTypes = baseType.split('|') as BaseWarpActionInputType[]
      const values = rawValues.map((val, index) => this.nativeToTyped(rawTypes[index], val))
      const types = rawTypes.map((type) => this.nativeToType(type))
      return new CompositeValue(new CompositeType(...types), values)
    }
    if (type === 'string') return value ? StringValue.fromUTF8(value as string) : new NothingValue()
    if (type === 'uint8') return value ? new U8Value(Number(value)) : new NothingValue()
    if (type === 'uint16') return value ? new U16Value(Number(value)) : new NothingValue()
    if (type === 'uint32') return value ? new U32Value(Number(value)) : new NothingValue()
    if (type === 'uint64') return value ? new U64Value(BigInt(value as string)) : new NothingValue()
    if (type === 'biguint') return value ? new BigUIntValue(BigInt(value as string)) : new NothingValue()
    if (type === 'boolean') return value ? new BooleanValue(typeof value === 'boolean' ? value : value === 'true') : new NothingValue()
    if (type === 'address') return value ? new AddressValue(Address.newFromBech32(value as string)) : new NothingValue()
    if (type === 'token') return value ? new TokenIdentifierValue(value as string) : new NothingValue()
    if (type === 'hex') return value ? BytesValue.fromHex(value as string) : new NothingValue()
    if (type === 'codemeta') return new CodeMetadataValue(CodeMetadata.fromBuffer(Buffer.from(value as string, 'hex')))
    if (type === 'esdt' && value instanceof TokenTransfer)
      return new Struct(this.nativeToType('esdt') as StructType, [
        new Field(new TokenIdentifierValue(value.token.identifier), 'token_identifier'),
        new Field(new U64Value(BigInt(value.token.nonce)), 'token_nonce'),
        new Field(new BigUIntValue(BigInt(value.amount)), 'amount'),
      ])

    throw new Error(`WarpArgSerializer (nativeToTyped): Unsupported input type: ${type}`)
  }

  typedToNative(value: TypedValue): [WarpActionInputType, WarpNativeValue] {
    if (value.hasClassOrSuperclass(OptionValue.ClassName)) {
      if (!(value as OptionValue).isSet()) return ['option', null]
      const [type, val] = this.typedToNative((value as OptionValue).getTypedValue()) as [BaseWarpActionInputType, WarpNativeValue]
      return [`option:${type}`, val]
    }
    if (value.hasClassOrSuperclass(OptionalValue.ClassName)) {
      if (!(value as OptionalValue).isSet()) return ['optional', null]
      const [type, val] = this.typedToNative((value as OptionalValue).getTypedValue()) as [BaseWarpActionInputType, WarpNativeValue]
      return [`optional:${type}`, val]
    }
    if (value.hasClassOrSuperclass(List.ClassName)) {
      const items = (value as List).getItems()
      const types = items.map((item) => this.typedToNative(item)[0]) as BaseWarpActionInputType[]
      const type = types[0] as BaseWarpActionInputType
      const values = items.map((item) => this.typedToNative(item)[1]) as WarpNativeValue[]
      return [`list:${type}`, values.join(',')]
    }
    if (value.hasClassOrSuperclass(VariadicValue.ClassName)) {
      const items = (value as VariadicValue).getItems()
      const types = items.map((item) => this.typedToNative(item)[0]) as BaseWarpActionInputType[]
      const type = types[0] as BaseWarpActionInputType
      const values = items.map((item) => this.typedToNative(item)[1]) as WarpNativeValue[]
      return [`variadic:${type}`, values.join(',')]
    }
    if (value.hasClassOrSuperclass(CompositeValue.ClassName)) {
      const items = (value as CompositeValue).getItems()
      const types = items.map((item) => this.typeToNative(item.getType()))
      const values = items.map((item) => item.valueOf()) as WarpNativeValue[]
      const rawTypes = types.join('|')
      const rawValues = values.join('|')
      return [`composite:${rawTypes}`, rawValues]
    }
    if (value.hasClassOrSuperclass(BigUIntValue.ClassName)) return ['biguint', BigInt((value as BigUIntValue).valueOf().toFixed())]
    if (value.hasClassOrSuperclass(NumericalValue.ClassName)) return ['uint64', (value as NumericalValue).valueOf().toNumber()]
    if (value.hasClassOrSuperclass(StringValue.ClassName)) return ['string', (value as StringValue).valueOf()]
    if (value.hasClassOrSuperclass(BooleanValue.ClassName)) return ['boolean', (value as BooleanValue).valueOf()]
    if (value.hasClassOrSuperclass(AddressValue.ClassName)) return ['address', (value as AddressValue).valueOf().bech32()]
    if (value.hasClassOrSuperclass(TokenIdentifierValue.ClassName)) return ['token', (value as TokenIdentifierValue).valueOf()]
    if (value.hasClassOrSuperclass(BytesValue.ClassName)) return ['hex', (value as BytesValue).valueOf().toString('hex')]
    if (value.hasClassOrSuperclass(CodeMetadataValue.ClassName)) {
      return ['codemeta', (value as CodeMetadataValue).valueOf().toBuffer().toString('hex')]
    }
    if (value.getType().getName() === 'EsdtTokenPayment') {
      const identifier = (value as Struct).getFieldValue('token_identifier').valueOf()
      const nonce = (value as Struct).getFieldValue('token_nonce').valueOf()
      const amount = (value as Struct).getFieldValue('amount').valueOf()
      const token = new Token({ identifier, nonce })
      return ['esdt', new TokenTransfer({ token, amount })]
    }
    throw new Error(`WarpArgSerializer (typedToNative): Unsupported input type: ${value.getClassName()}`)
  }

  typedToString(value: TypedValue): string {
    const [type, val] = this.typedToNative(value)
    return this.nativeToString(type, val)
  }

  stringToNative(value: string): [WarpActionInputType, WarpNativeValue] {
    const [type, val] = value.split(':') as [WarpActionInputType, WarpNativeValue]
    if (type === 'address') return [type, val]
    if (type === 'boolean') return [type, val === 'true']
    if (type === 'biguint') return [type, BigInt((val as string) || 0)]
    if (type === 'uint8' || type === 'uint16' || type === 'uint32' || type === 'uint64') return [type, Number(val)]
    if (type === 'esdt') {
      const [identifier, nonce, amount] = (val as string).split('|')
      return [type, new TokenTransfer({ token: new Token({ identifier, nonce: BigInt(nonce) }), amount: BigInt(amount) })]
    }
    return [type, val]
  }

  stringToTyped(value: string): TypedValue {
    const [type, val] = value.split(':') as [WarpActionInputType, string]
    return this.nativeToTyped(type, val)
  }

  nativeToType(type: BaseWarpActionInputType): Type {
    if (type === 'string') return new StringType()
    if (type === 'uint8') return new U8Type()
    if (type === 'uint16') return new U16Type()
    if (type === 'uint32') return new U32Type()
    if (type === 'uint64') return new U64Type()
    if (type === 'biguint') return new BigUIntType()
    if (type === 'boolean') return new BooleanType()
    if (type === 'address') return new AddressType()
    if (type === 'token') return new TokenIdentifierType()
    if (type === 'hex') return new BytesType()
    if (type === 'codemeta') return new CodeMetadataType()
    if (type === 'esdt' || type === 'nft')
      return new StructType('EsdtTokenPayment', [
        new FieldDefinition('token_identifier', '', new TokenIdentifierType()),
        new FieldDefinition('token_nonce', '', new U64Type()),
        new FieldDefinition('amount', '', new BigUIntType()),
      ])
    throw new Error(`WarpArgSerializer (nativeToType): Unsupported input type: ${type}`)
  }

  typeToNative(type: Type): BaseWarpActionInputType {
    if (type instanceof StringType) return 'string'
    if (type instanceof U8Type) return 'uint8'
    if (type instanceof U16Type) return 'uint16'
    if (type instanceof U32Type) return 'uint32'
    if (type instanceof U64Type) return 'uint64'
    if (type instanceof BigUIntType) return 'biguint'
    if (type instanceof BooleanType) return 'boolean'
    if (type instanceof AddressType) return 'address'
    if (type instanceof TokenIdentifierType) return 'token'
    if (type instanceof BytesType) return 'hex'
    if (type instanceof CodeMetadataType) return 'codemeta'
    if (type instanceof StructType && type.getClassName() === 'EsdtTokenPayment') return 'esdt'
    throw new Error(`WarpArgSerializer (typeToNative): Unsupported input type: ${type.getClassName()}`)
  }
}
