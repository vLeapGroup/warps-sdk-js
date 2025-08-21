import { WarpConstants, WarpInputTypes } from './constants'
import { WarpChainAsset } from './types'

// TODO: implement below
// export const option = (value: TypedValue | null, type?: Type): string => {
//   if (value) return OptionValue.newProvided(value)
//   if (type) return OptionValue.newMissingTyped(type)
//   return OptionValue.newMissing()
// }

// export const optional = (value: TypedValue | null, type?: Type): OptionalValue => {
//   if (value) return new OptionalValue(value.getType(), value)
//   if (type) return new OptionalValue(type)
//   return OptionalValue.newMissing()
// }

// export const list = (values: TypedValue[]): List => {
//   if (values.length === 0) {
//     throw new Error('Cannot create a list from an empty array')
//   }
//   const type = values[0].getType()
//   return new List(type, values)
// }

// export const variadic = (values: TypedValue[]): VariadicValue => VariadicValue.fromItems(...values)

// export const composite = (values: TypedValue[]): string => {
//   const types = values.map((value) => value.getType().getName())
//   return `${WarpInputTypes.Composite}:${types.join(WarpConstants.ArgCompositeSeparator)}`
// }

export const string = (value: string): string => WarpInputTypes.String + WarpConstants.ArgParamsSeparator + value

export const u8 = (value: number): string => WarpInputTypes.U8 + WarpConstants.ArgParamsSeparator + value

export const u16 = (value: number): string => WarpInputTypes.U16 + WarpConstants.ArgParamsSeparator + value

export const u32 = (value: number): string => WarpInputTypes.U32 + WarpConstants.ArgParamsSeparator + value

export const u64 = (value: bigint | number): string => WarpInputTypes.U64 + WarpConstants.ArgParamsSeparator + value

export const biguint = (value: bigint | string | number): string => WarpInputTypes.Biguint + WarpConstants.ArgParamsSeparator + value

export const boolean = (value: boolean): string => WarpInputTypes.Boolean + WarpConstants.ArgParamsSeparator + value

export const address = (value: string): string => WarpInputTypes.Address + WarpConstants.ArgParamsSeparator + value

export const asset = (value: WarpChainAsset): string =>
  WarpInputTypes.Asset +
  WarpConstants.ArgParamsSeparator +
  value.identifier +
  WarpConstants.ArgCompositeSeparator +
  BigInt(value.nonce || 0).toString() +
  WarpConstants.ArgCompositeSeparator +
  value.amount

export const hex = (value: string): string => WarpInputTypes.Hex + WarpConstants.ArgParamsSeparator + value
