import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
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
    throw new Error(`WarpArgSerializer: Unsupported input type: ${type}`)
  }

  stringToNative(value: string): NativeValue {
    const [type, val] = value.split(':') as [WarpActionInputType, NativeValue]
    if (type === 'address') return val
    if (type === 'boolean') return val === 'true'
    if (type === 'biguint') return BigInt(val)
    if (type === 'uint8' || type === 'uint16' || type === 'uint32' || type === 'uint64') return Number(val)
    return val
  }

  stringToTyped(value: string): TypedValue {
    const [type, val] = value.split(':') as [WarpActionInputType, string]
    return this.nativeToTyped(type, val)
  }
}
