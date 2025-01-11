import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  NumericalValue,
  TypedValue,
  U16Value,
  U32Value,
  U64Value,
  U8Value,
} from '@multiversx/sdk-core/out'
import { WarpActionInputType } from './types'

type NativeValue = string | number | bigint | boolean

export class WarpArgSerializer {
  nativeToStrings(type: WarpActionInputType, value: NativeValue): string {
    return `${type}:${value.toString()}`
  }

  nativeToTyped(type: WarpActionInputType, value: NativeValue): TypedValue {
    if (type === 'string') return BytesValue.fromUTF8(value as string)
    if (type === 'uint8') return new U8Value(Number(value))
    if (type === 'uint16') return new U16Value(Number(value))
    if (type === 'uint32') return new U32Value(Number(value))
    if (type === 'uint64') return new U64Value(BigInt(value))
    if (type === 'biguint') return new BigUIntValue(BigInt(value))
    if (type === 'boolean') return new BooleanValue(typeof value === 'boolean' ? value : value === 'true')
    if (type === 'address') return new AddressValue(Address.newFromBech32(value as string))
    if (type === 'hex') return BytesValue.fromHex(value as string)
    throw new Error(`WarpArgSerializer (nativeToTyped): Unsupported input type: ${type}`)
  }

  typedToNative(value: TypedValue): [WarpActionInputType, NativeValue] {
    if (value.hasClassOrSuperclass(BigUIntValue.ClassName)) return ['biguint', BigInt((value as BigUIntValue).valueOf().toFixed())]
    if (value.hasClassOrSuperclass(NumericalValue.ClassName)) return ['uint64', (value as NumericalValue).valueOf().toNumber()]
    if (value.hasClassOrSuperclass(BytesValue.ClassName)) return ['hex', (value as BytesValue).valueOf().toString('hex')]
    if (value.hasClassOrSuperclass(AddressValue.ClassName)) return ['address', (value as AddressValue).valueOf().bech32()]
    if (value.hasClassOrSuperclass(BooleanValue.ClassName)) return ['boolean', (value as BooleanValue).valueOf()]
    throw new Error(`WarpArgSerializer (typedToNative): Unsupported input type: ${value.getClassName()}`)
  }

  stringToNative(value: string): [WarpActionInputType, NativeValue] {
    const [type, val] = value.split(':') as [WarpActionInputType, NativeValue]
    if (type === 'address') return [type, val]
    if (type === 'boolean') return [type, val === 'true']
    if (type === 'biguint') return [type, BigInt(val)]
    if (type === 'uint8' || type === 'uint16' || type === 'uint32' || type === 'uint64') return [type, Number(val)]
    return [type, val]
  }

  stringToTyped(value: string): TypedValue {
    const [type, val] = value.split(':') as [WarpActionInputType, string]
    return this.nativeToTyped(type, val)
  }
}
