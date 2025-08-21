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
  WarpConstants,
  WarpNativeValue,
  WarpSerializer,
} from '@vleap/warps'

const SplitParamsRegex = new RegExp(`${WarpConstants.ArgParamsSeparator}(.*)`)

export class WarpMultiversxSerializer implements AdapterWarpSerializer {
  public readonly coreSerializer: WarpSerializer

  constructor() {
    this.coreSerializer = new WarpSerializer()
  }

  typedToString(value: TypedValue): string {
    if (value.hasClassOrSuperclass(OptionValue.ClassName)) {
      if (!(value as OptionValue).isSet()) return 'option:null'
      const result = this.typedToString((value as OptionValue).getTypedValue())
      return `option:${result}`
    }
    if (value.hasClassOrSuperclass(OptionalValue.ClassName)) {
      if (!(value as OptionalValue).isSet()) return 'optional:null'
      const result = this.typedToString((value as OptionalValue).getTypedValue())
      return `optional:${result}`
    }
    if (value.hasClassOrSuperclass(List.ClassName)) {
      const items = (value as List).getItems()
      const types = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[0]) as BaseWarpActionInputType[]
      const type = types[0] as BaseWarpActionInputType
      const values = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[1]) as WarpNativeValue[]
      return `list:${type}:${values.join(',')}`
    }
    if (value.hasClassOrSuperclass(VariadicValue.ClassName)) {
      const items = (value as VariadicValue).getItems()
      const types = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[0]) as BaseWarpActionInputType[]
      const type = types[0] as BaseWarpActionInputType
      const values = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[1]) as WarpNativeValue[]
      return `variadic:${type}:${values.join(',')}`
    }
    if (value.hasClassOrSuperclass(CompositeValue.ClassName)) {
      const items = (value as CompositeValue).getItems()
      const types = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[0]) as BaseWarpActionInputType[]
      const values = items.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[1]) as WarpNativeValue[]
      const rawTypes = types.join(WarpConstants.ArgCompositeSeparator)
      const rawValues = values.join(WarpConstants.ArgCompositeSeparator)
      return `composite(${rawTypes}):${rawValues}`
    }
    if (value.hasClassOrSuperclass(BigUIntValue.ClassName) || value.getType().getName() === 'BigUint' /* ABI handling */)
      return `biguint:${BigInt((value as BigUIntValue).valueOf().toFixed())}`
    if (value.hasClassOrSuperclass(U8Value.ClassName)) return `uint8:${(value as U8Value).valueOf().toNumber()}`
    if (value.hasClassOrSuperclass(U16Value.ClassName)) return `uint16:${(value as U16Value).valueOf().toNumber()}`
    if (value.hasClassOrSuperclass(U32Value.ClassName)) return `uint32:${(value as U32Value).valueOf().toNumber()}`
    if (value.hasClassOrSuperclass(U64Value.ClassName)) return `uint64:${BigInt((value as U64Value).valueOf().toFixed())}`
    if (value.hasClassOrSuperclass(StringValue.ClassName)) return `string:${(value as StringValue).valueOf()}`
    if (value.hasClassOrSuperclass(BooleanValue.ClassName)) return `bool:${(value as BooleanValue).valueOf()}`
    if (value.hasClassOrSuperclass(AddressValue.ClassName)) return `address:${(value as AddressValue).valueOf().toBech32()}`
    if (value.hasClassOrSuperclass(TokenIdentifierValue.ClassName)) return `token:${(value as TokenIdentifierValue).valueOf()}`
    if (value.hasClassOrSuperclass(BytesValue.ClassName)) return `hex:${(value as BytesValue).valueOf().toString('hex')}`
    if (value.hasClassOrSuperclass(CodeMetadataValue.ClassName)) {
      return `codemeta:${(value as CodeMetadataValue).valueOf().toString()}`
    }
    if (value.getType().getName() === 'EsdtTokenPayment') {
      const identifier = (value as Struct).getFieldValue('token_identifier').valueOf()
      const nonce = (value as Struct).getFieldValue('token_nonce').valueOf()
      const amount = (value as Struct).getFieldValue('amount').valueOf()
      return `asset:${identifier}|${nonce}|${amount}`
    }
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
    if (type.startsWith('composite')) {
      const rawTypes = type.match(/\(([^)]+)\)/)?.[1] as BaseWarpActionInputType
      return new CompositeType(
        ...rawTypes.split(WarpConstants.ArgCompositeSeparator).map((t) => this.nativeToType(t as BaseWarpActionInputType))
      )
    }
    if (type === 'string') return new StringType()
    if (type === 'uint8') return new U8Type()
    if (type === 'uint16') return new U16Type()
    if (type === 'uint32') return new U32Type()
    if (type === 'uint64') return new U64Type()
    if (type === 'biguint') return new BigUIntType()
    if (type === 'bool') return new BooleanType()
    if (type === 'address') return new AddressType()
    if (type === 'token') return new TokenIdentifierType()
    if (type === 'hex') return new BytesType()
    if (type === 'codemeta') return new CodeMetadataType()
    if (type === 'asset')
      return new StructType('EsdtTokenPayment', [
        new FieldDefinition('token_identifier', '', new TokenIdentifierType()),
        new FieldDefinition('token_nonce', '', new U64Type()),
        new FieldDefinition('amount', '', new BigUIntType()),
      ])
    throw new Error(`WarpArgSerializer (nativeToType): Unsupported input type: ${type}`)
  }

  stringToTyped(value: string): TypedValue {
    const [type, val] = value.split(/:(.*)/, 2) as [WarpActionInputType, string]

    if (type === 'null' || type === null) {
      return new NothingValue()
    }
    if (type === 'option') {
      const baseValue = this.stringToTyped(val)
      return baseValue instanceof NothingValue ? OptionValue.newMissingTyped(baseValue.getType()) : OptionValue.newProvided(baseValue)
    }
    if (type === 'optional') {
      const baseValue = this.stringToTyped(val)
      return baseValue instanceof NothingValue ? OptionalValue.newMissing() : new OptionalValue(baseValue.getType(), baseValue)
    }
    if (type === 'list') {
      const [baseType, listValues] = val.split(SplitParamsRegex, 2) as [BaseWarpActionInputType, string]
      const values = listValues.split(',')
      const typedValues = values.map((v) => this.stringToTyped(`${baseType}:${v}`))
      return new List(this.nativeToType(baseType), typedValues)
    }
    if (type === 'variadic') {
      const [baseType, listValues] = val.split(SplitParamsRegex, 2) as [BaseWarpActionInputType, string]
      const values = listValues.split(',')
      const typedValues = values.map((v) => this.stringToTyped(`${baseType}:${v}`))
      return new VariadicValue(new VariadicType(this.nativeToType(baseType)), typedValues)
    }
    if (type.startsWith('composite')) {
      const baseType = type.match(/\(([^)]+)\)/)?.[1] as BaseWarpActionInputType
      const rawValues = (val as string).split(WarpConstants.ArgCompositeSeparator)
      const rawTypes = baseType.split(WarpConstants.ArgCompositeSeparator) as BaseWarpActionInputType[]
      const values = rawValues.map((val, i) => this.stringToTyped(`${rawTypes[i]}:${val}`))
      const types = values.map((v) => v.getType())
      return new CompositeValue(new CompositeType(...types), values)
    }
    if (type === 'string') return val ? StringValue.fromUTF8(val as string) : new NothingValue()
    if (type === 'uint8') return val ? new U8Value(Number(val)) : new NothingValue()
    if (type === 'uint16') return val ? new U16Value(Number(val)) : new NothingValue()
    if (type === 'uint32') return val ? new U32Value(Number(val)) : new NothingValue()
    if (type === 'uint64') return val ? new U64Value(BigInt(val as string)) : new NothingValue()
    if (type === 'biguint') return val ? new BigUIntValue(BigInt(val as string)) : new NothingValue()
    if (type === 'bool') return val ? new BooleanValue(typeof val === 'boolean' ? val : val === 'true') : new NothingValue()
    if (type === 'address') return val ? new AddressValue(Address.newFromBech32(val as string)) : new NothingValue()
    if (type === 'token') return val ? new TokenIdentifierValue(val as string) : new NothingValue()
    if (type === 'hex') return val ? BytesValue.fromHex(val as string) : new NothingValue()
    if (type === 'codemeta') return new CodeMetadataValue(CodeMetadata.newFromBytes(Uint8Array.from(Buffer.from(val as string, 'hex'))))
    if (type === 'asset') {
      const parts = val.split(WarpConstants.ArgCompositeSeparator)
      return new Struct(this.nativeToType('asset') as StructType, [
        new Field(new TokenIdentifierValue(parts[0]), 'token_identifier'),
        new Field(new U64Value(BigInt(parts[1])), 'token_nonce'),
        new Field(new BigUIntValue(BigInt(parts[2])), 'amount'),
      ])
    }

    throw new Error(`WarpArgSerializer (stringToTyped): Unsupported input type: ${type}`)
  }

  typeToString(type: Type): WarpActionInputType {
    if (type instanceof OptionType) return 'option:' + this.typeToString(type.getFirstTypeParameter())
    if (type instanceof OptionalType) return 'optional:' + this.typeToString(type.getFirstTypeParameter())
    if (type instanceof ListType) return 'list:' + this.typeToString(type.getFirstTypeParameter())
    if (type instanceof VariadicType) return 'variadic:' + this.typeToString(type.getFirstTypeParameter())
    if (type instanceof StringType) return 'string'
    if (type instanceof U8Type) return 'uint8'
    if (type instanceof U16Type) return 'uint16'
    if (type instanceof U32Type) return 'uint32'
    if (type instanceof U64Type) return 'uint64'
    if (type instanceof BigUIntType) return 'biguint'
    if (type instanceof BooleanType) return 'bool'
    if (type instanceof AddressType) return 'address'
    if (type instanceof TokenIdentifierType) return 'token'
    if (type instanceof BytesType) return 'hex'
    if (type instanceof CodeMetadataType) return 'codemeta'
    if (type instanceof StructType && type.getClassName() === 'EsdtTokenPayment') return 'asset'
    throw new Error(`WarpArgSerializer (typeToString): Unsupported input type: ${type.getClassName()}`)
  }
}
