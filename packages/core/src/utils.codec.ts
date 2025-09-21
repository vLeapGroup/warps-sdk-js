import { WarpInputTypes } from './constants'
import { WarpActionInputType, WarpChainAssetValue, WarpNativeValue } from './types'
import { WarpSerializer } from './WarpSerializer'

export const string = (value: string): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.String, value)
}

export const uint8 = (value: number): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Uint8, value)
}

export const uint16 = (value: number): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Uint16, value)
}

export const uint32 = (value: number): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Uint32, value)
}

export const uint64 = (value: bigint | number): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Uint64, value)
}

export const biguint = (value: bigint | string | number): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Biguint, value)
}

export const bool = (value: boolean): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Bool, value)
}

export const address = (value: string): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Address, value)
}

export const asset = (value: WarpChainAssetValue & { decimals?: number }): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Asset, value)
}

export const hex = (value: string): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Hex, value)
}

export const option = (value: WarpNativeValue | null, type: WarpActionInputType): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Option, value)
}

// Example:
// input: [ 'list:tuple(string|uint64)', [ [ 'hello', 123n ], [ 'world', 456n ] ] ]
// output: vector:tuple(string|uint64):abc|123,def|456,ghi|789
export const tuple = (...values: WarpNativeValue[]): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Tuple, values)
}

export const vector = (values: WarpNativeValue[]): string => {
  return new WarpSerializer().nativeToString(WarpInputTypes.Vector, values)
}
