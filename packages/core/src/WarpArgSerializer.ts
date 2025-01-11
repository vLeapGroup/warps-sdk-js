import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  CodeMetadata,
  CodeMetadataValue,
  List,
  NothingValue,
  NumericalValue,
  OptionValue,
  PrimitiveType,
  StringValue,
  TypedValue,
  U16Value,
  U32Value,
  U64Value,
  U8Value,
} from '@multiversx/sdk-core/out'
import { BaseWarpActionInputType, WarpActionInputType } from './types'

type NativeValue = string | number | bigint | boolean | null

export class WarpArgSerializer {
  nativeToStrings(type: WarpActionInputType, value: NativeValue): string {
    return `${type}:${value?.toString() ?? ''}`
  }

  nativeToTyped(type: WarpActionInputType, value: NativeValue): TypedValue {
    if (type.startsWith('opt:')) {
      const [_, baseType] = type.split(':') as ['opt', WarpActionInputType]
      const baseValue = this.nativeToTyped(baseType, value)
      return value ? OptionValue.newProvided(baseValue) : OptionValue.newMissingTyped(baseValue.getType())
    }
    if (type.startsWith('list:')) {
      const [_, baseType] = type.split(':') as ['list', WarpActionInputType]
      const values = (value as string).split(',')
      const typedValues = values.map((val) => this.nativeToTyped(baseType, val))
      return new List(new PrimitiveType('Custom'), typedValues)
    }
    if (type === 'string') return value ? StringValue.fromUTF8(value as string) : new NothingValue()
    if (type === 'uint8') return value ? new U8Value(Number(value)) : new NothingValue()
    if (type === 'uint16') return value ? new U16Value(Number(value)) : new NothingValue()
    if (type === 'uint32') return value ? new U32Value(Number(value)) : new NothingValue()
    if (type === 'uint64') return value ? new U64Value(BigInt(value)) : new NothingValue()
    if (type === 'biguint') return value ? new BigUIntValue(BigInt(value)) : new NothingValue()
    if (type === 'boolean') return value ? new BooleanValue(typeof value === 'boolean' ? value : value === 'true') : new NothingValue()
    if (type === 'address') return value ? new AddressValue(Address.newFromBech32(value as string)) : new NothingValue()
    if (type === 'hex') return value ? BytesValue.fromHex(value as string) : new NothingValue()
    if (type === 'codemeta') return new CodeMetadataValue(CodeMetadata.fromBuffer(Buffer.from(value as string, 'hex')))
    throw new Error(`WarpArgSerializer (nativeToTyped): Unsupported input type: ${type}`)
  }

  typedToNative(value: TypedValue): [WarpActionInputType, NativeValue] {
    if (value.hasClassOrSuperclass(OptionValue.ClassName)) {
      if (!(value as OptionValue).isSet()) return ['opt', null]
      const [type, val] = this.typedToNative((value as OptionValue).getTypedValue()) as [BaseWarpActionInputType, NativeValue]
      return [`opt:${type}`, val]
    }
    if (value.hasClassOrSuperclass(List.ClassName)) {
      const items = (value as List).getItems()
      const types = items.map((item) => this.typedToNative(item))
      const type = types[0][0] as BaseWarpActionInputType
      const values = items.map((item) => item.valueOf()) as NativeValue[]
      return [`list:${type}`, values.join(',')]
    }
    if (value.hasClassOrSuperclass(BigUIntValue.ClassName)) return ['biguint', BigInt((value as BigUIntValue).valueOf().toFixed())]
    if (value.hasClassOrSuperclass(NumericalValue.ClassName)) return ['uint64', (value as NumericalValue).valueOf().toNumber()]
    if (value.hasClassOrSuperclass(StringValue.ClassName)) return ['string', (value as StringValue).valueOf()]
    if (value.hasClassOrSuperclass(BooleanValue.ClassName)) return ['boolean', (value as BooleanValue).valueOf()]
    if (value.hasClassOrSuperclass(AddressValue.ClassName)) return ['address', (value as AddressValue).valueOf().bech32()]
    if (value.hasClassOrSuperclass(BytesValue.ClassName)) return ['hex', (value as BytesValue).valueOf().toString('hex')]
    if (value.hasClassOrSuperclass(CodeMetadataValue.ClassName)) {
      return ['codemeta', (value as CodeMetadataValue).valueOf().toBuffer().toString('hex')]
    }
    throw new Error(`WarpArgSerializer (typedToNative): Unsupported input type: ${value.getClassName()}`)
  }

  stringToNative(value: string): [WarpActionInputType, NativeValue] {
    const [type, val] = value.split(':') as [WarpActionInputType, NativeValue]
    if (type === 'address') return [type, val]
    if (type === 'boolean') return [type, val === 'true']
    if (type === 'biguint') return [type, BigInt(val || 0)]
    if (type === 'uint8' || type === 'uint16' || type === 'uint32' || type === 'uint64') return [type, Number(val)]
    return [type, val]
  }

  stringToTyped(value: string): TypedValue {
    const [type, val] = value.split(':') as [WarpActionInputType, string]
    return this.nativeToTyped(type, val)
  }
}
