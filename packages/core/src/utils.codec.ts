import { WarpConstants, WarpInputTypes } from './constants'
import { WarpChainAssetValue, WarpNativeValue, WarpStructValue } from './types'
import { WarpSerializer } from './WarpSerializer'

export type CodecFunc<T extends WarpNativeValue = WarpNativeValue> = (value: T) => string

export const string: CodecFunc<string> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.String, value)
}

export const uint8: CodecFunc<number> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Uint8, value)
}

export const uint16: CodecFunc<number> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Uint16, value)
}

export const uint32: CodecFunc<number> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Uint32, value)
}

export const uint64: CodecFunc<bigint | number> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Uint64, value)
}

export const biguint: CodecFunc<bigint | string | number> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Biguint, value)
}

export const bool: CodecFunc<boolean> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Bool, value)
}

export const address: CodecFunc<string> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Address, value)
}

export const asset: CodecFunc<WarpChainAssetValue & { decimals?: number }> = (value: WarpChainAssetValue & { decimals?: number }) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Asset, value)
}

export const hex: CodecFunc<string> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Hex, value)
}

export const option = <T extends WarpNativeValue>(codecFunc: CodecFunc<T>, value: T | null): string => {
  if (value === null) {
    return WarpInputTypes.Option + WarpConstants.ArgParamsSeparator
  }
  const encoded = codecFunc(value)
  const colonIndex = encoded.indexOf(WarpConstants.ArgParamsSeparator)
  const baseType = encoded.substring(0, colonIndex)
  const baseValue = encoded.substring(colonIndex + 1)
  return WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + baseType + WarpConstants.ArgParamsSeparator + baseValue
}

// Example:
// input: [ 'list:tuple(string|uint64)', [ [ 'hello', 123n ], [ 'world', 456n ] ] ]
// output: vector:tuple(string|uint64):abc|123,def|456,ghi|789
export const tuple = (...values: WarpNativeValue[]): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Tuple, values)
}

export const struct: CodecFunc<WarpStructValue> = (value) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Struct, value)
}

export const vector: CodecFunc<WarpNativeValue[]> = (values) => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Vector, values)
}
